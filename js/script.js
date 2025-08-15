// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Check for saved theme preference or respect OS preference
if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    htmlElement.classList.remove('dark');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

// Ensure focused inputs are visible on mobile (avoid being hidden by keyboard)
function setupInputFocusScroll() {
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const vv = window.visualViewport || null;

    const getHeaderOffset = () => {
        const header = document.querySelector('header');
        // Add small padding for comfort
        return (header ? header.getBoundingClientRect().height : 96) + 8;
    };

    let activeEl = null;
    let scheduleTimer = null;

    const scheduleScroll = () => {
        if (!activeEl) return;
        clearTimeout(scheduleTimer);
        scheduleTimer = setTimeout(() => {
            // Use rAF to read/layout just-in-time
            requestAnimationFrame(() => {
                if (!activeEl) return;
                const rect = activeEl.getBoundingClientRect();
                const viewportHeight = vv ? vv.height : window.innerHeight;
                const viewportTopOffset = vv ? vv.offsetTop : 0;
                const topThreshold = getHeaderOffset();
                const bottomThreshold = (viewportHeight + viewportTopOffset) - 20;

                const isAbove = (rect.top - viewportTopOffset) < topThreshold;
                const isBelow = (rect.bottom - viewportTopOffset) > bottomThreshold;

                if (!isAbove && !isBelow) return; // Already comfortably visible

                let target;
                if (isAbove) {
                    target = window.scrollY + rect.top - topThreshold;
                } else {
                    const minimalTop = window.scrollY + (rect.bottom - bottomThreshold);
                    const oneThirdTop = window.scrollY + (rect.top - viewportTopOffset) - (viewportHeight / 3);
                    target = Math.max(0, Math.min(minimalTop, oneThirdTop));
                }

                const current = window.scrollY;
                if (Math.abs(current - target) > 1) {
                    window.scrollTo({ top: target, behavior: prefersReduce ? 'auto' : 'smooth' });
                }
            });
        }, isIOS ? 280 : 120);
    };

    const onFocusIn = (e) => {
        const el = e.target;
        if (!el || !(el instanceof Element)) return;
        if (!el.matches('input, textarea, select')) return;
        activeEl = el;
        scheduleScroll();
    };

    const onFocusOut = (e) => {
        if (e.target === activeEl) {
            activeEl = null;
            clearTimeout(scheduleTimer);
            scheduleTimer = null;
        }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    // Reposition on visual viewport changes (keyboard height/movement)
    if (vv) {
        let vvTimer = null;
        const onVVChange = () => {
            if (!activeEl) return;
            clearTimeout(vvTimer);
            vvTimer = setTimeout(scheduleScroll, isIOS ? 150 : 75);
        };
        vv.addEventListener('resize', onVVChange);
        vv.addEventListener('scroll', onVVChange);
    }
}

themeToggle.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    if (htmlElement.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
});

// Tab Switching (Tailwind utilities + ARIA)
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Update active tab styles and aria
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.setAttribute('aria-selected', 'false');
            btn.classList.remove('border-primary-600', 'bg-primary-500/10', 'text-primary-600', 'dark:text-primary-400', 'hover:bg-primary-500/20');
            btn.classList.add('border-transparent', 'text-gray-700', 'dark:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-600');
        });
        button.setAttribute('aria-selected', 'true');
        button.classList.add('border-primary-600', 'bg-primary-500/10', 'text-primary-600', 'dark:text-primary-400', 'hover:bg-primary-500/20');
        button.classList.remove('border-transparent', 'text-gray-700', 'dark:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-600');

        // Show selected calculator
        const tabName = button.getAttribute('data-tab');
        document.querySelectorAll('.calculator-section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(`${tabName}-calculator`).classList.remove('hidden');
    });
});

// Format currency with decimals
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

// For extremely large values, render an infinity symbol to keep layout stable
const MAX_DISPLAY_VALUE = 1e21; // much higher threshold; rely on compact formatting first
function formatCurrencyOrInfinity(amount) {
    if (!isFinite(amount) || Math.abs(amount) > MAX_DISPLAY_VALUE) {
        return '∞';
    }
    const abs = Math.abs(amount);
    // Use compact form for large values to keep UI responsive
    if (abs >= 1e7) { // 1 Crore threshold
        try {
            const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(amount);
            return '₹' + compact;
        } catch (e) {
            // Fallback to Indian units: Lakh (1e5), Crore (1e7)
            let val = amount;
            let unit = '';
            if (abs >= 1e7) { val = amount / 1e7; unit = 'Cr'; }
            else if (abs >= 1e5) { val = amount / 1e5; unit = 'L'; }
            const fixed = Math.abs(val) >= 100 ? val.toFixed(0) : Math.abs(val) >= 10 ? val.toFixed(1) : val.toFixed(2);
            return '₹' + Number(fixed).toString() + unit;
        }
    }
    return formatCurrency(amount);
}

// Validate number inputs
function validateNumberInput(input, min, max) {
    let value = parseFloat(input.value);
    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;
    input.value = value;
    return value;
}

// Clamp helper for live typing without forcing when empty
function clampInputIfOutOfRange(input, min, max) {
    const raw = input.value;
    const v = parseFloat(raw);
    if (isNaN(v)) return null; // allow empty/partial input while typing
    let clamped = v;
    if (v < min) clamped = min;
    if (v > max) clamped = max;
    if (clamped !== v) input.value = clamped;
    return clamped;
}

// Block non-numeric characters (optional single decimal point)
function addNumericGuards(input, allowDecimal = false) {
    input.addEventListener('keydown', (e) => {
        const ctrlCombo = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase());
        const navKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (ctrlCombo || navKeys.includes(e.key)) return;
        // Normalize decimal key across browsers: '.', ',', 'Decimal', 'Period'
        const isDecimalKey = e.key === '.' || e.key === ',' || e.key === 'Decimal' || e.key === 'Period';
        if (isDecimalKey) {
            if (!allowDecimal) { e.preventDefault(); return; }
            // Firefox doesn't support selectionStart/End on type=number. Normalize.
            let { selectionStart: s, selectionEnd: epos, value } = input;
            if (s == null || epos == null) { s = value.length; epos = value.length; }
            // Disallow '.' as the first character and disallow multiple dots overall
            const alreadyHasDotOutsideSelection = value.includes('.') && !(value.indexOf('.') >= s && value.indexOf('.') < epos);
            if (s === 0 || alreadyHasDotOutsideSelection) { e.preventDefault(); return; }
            // If comma was pressed, insert a dot instead to keep consistent parsing
            if (e.key === ',') {
                e.preventDefault();
                const next = value.slice(0, s) + '.' + value.slice(epos);
                input.value = next;
            }
            return;
        }
        if (e.key >= '0' && e.key <= '9') {
            if (allowDecimal) {
                let { selectionStart: s, selectionEnd: epos, value } = input;
                if (s == null || epos == null) { s = value.length; epos = value.length; }
                const next = value.slice(0, s) + e.key + value.slice(epos);
                // If there's a decimal point, ensure up to 3 digits after it
                const dotIndex = next.indexOf('.');
                if (dotIndex !== -1) {
                    const decimals = next.slice(dotIndex + 1);
                    if (decimals.length > 3) { e.preventDefault(); return; }
                }
            }
            return;
        }
        // Block everything else (including e/E/+/-)
        e.preventDefault();
    });
    input.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        let { selectionStart: s, selectionEnd: epos, value } = input;
        if (s == null || epos == null) { s = value.length; epos = value.length; }
        const sanitized = allowDecimal ? text.replace(',', '.') : text.replace(/\D+/g, '');
        const next = value.slice(0, s) + sanitized + value.slice(epos);
        const regexStrict = allowDecimal ? /^[0-9]+(\.[0-9]{1,3})?$/ : /^[0-9]+$/;
        if (!regexStrict.test(next)) {
            e.preventDefault();
            return;
        }
    });
}

// Prevent mouse wheel from changing number inputs
function addWheelGuard(input) {
    // When focused, block wheel increments
    input.addEventListener('wheel', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// SIP Calculator
function setupSIPCalculator() {
    const sipAmount = document.getElementById('sip-amount');
    const sipAmountRange = document.getElementById('sip-amount-range');
    const sipPeriod = document.getElementById('sip-period');
    const sipPeriodRange = document.getElementById('sip-period-range');
    const sipRate = document.getElementById('sip-rate');
    const sipRateRange = document.getElementById('sip-rate-range');
    // Prevent letters; allow decimals except for years, block wheel
    addNumericGuards(sipAmount, true);
    addNumericGuards(sipPeriod, false); // years: integers only
    addNumericGuards(sipRate, true);
    [sipAmount, sipPeriod, sipRate].forEach(addWheelGuard);
    
    // Link inputs and range sliders (live clamp to keep calc consistent)
    sipAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(sipAmount, 1, 10000000);
        sipAmountRange.value = sipAmount.value;
        calculateSIP();
    });
    
    sipAmountRange.addEventListener('input', function() {
        sipAmount.value = this.value;
        calculateSIP();
    });
    
    sipPeriod.addEventListener('input', function() {
        clampInputIfOutOfRange(sipPeriod, 1, 50);
        sipPeriodRange.value = sipPeriod.value;
        calculateSIP();
    });
    
    sipPeriodRange.addEventListener('input', function() {
        sipPeriod.value = this.value;
        calculateSIP();
    });
    
    sipRate.addEventListener('input', function() {
        clampInputIfOutOfRange(sipRate, 1, 100);
        sipRateRange.value = sipRate.value;
        calculateSIP();
    });
    
    sipRateRange.addEventListener('input', function() {
        sipRate.value = this.value;
        calculateSIP();
    });
    
    // Validate inputs
    sipAmount.addEventListener('blur', () => validateNumberInput(sipAmount, 1, 10000000));
    sipPeriod.addEventListener('blur', () => validateNumberInput(sipPeriod, 1, 50));
    sipRate.addEventListener('blur', () => validateNumberInput(sipRate, 1, 100));
    
    function calculateSIP() {
        const amount = parseFloat(sipAmount.value) || 0;
        const period = parseFloat(sipPeriod.value) || 0;
        const rate = parseFloat(sipRate.value) || 0;
        
        if (amount <= 0 || period <= 0 || rate <= 0) return;
        
        const months = period * 12;
        const monthlyRate = rate / 100 / 12;
        const futureValue = amount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
        const invested = amount * months;
        const returns = futureValue - invested;
        
        document.getElementById('sip-invested').textContent = formatCurrencyOrInfinity(invested);
        document.getElementById('sip-returns').textContent = formatCurrencyOrInfinity(returns);
        document.getElementById('sip-total').textContent = formatCurrencyOrInfinity(futureValue);
    }
    
    // Initial calculation
    calculateSIP();
}

// Lumpsum Calculator
function setupLumpsumCalculator() {
    const lumpsumAmount = document.getElementById('lumpsum-amount');
    const lumpsumAmountRange = document.getElementById('lumpsum-amount-range');
    const lumpsumPeriod = document.getElementById('lumpsum-period');
    const lumpsumPeriodRange = document.getElementById('lumpsum-period-range');
    const lumpsumRate = document.getElementById('lumpsum-rate');
    const lumpsumRateRange = document.getElementById('lumpsum-rate-range');
    // Prevent letters; allow decimals except for years, block wheel
    addNumericGuards(lumpsumAmount, true);
    addNumericGuards(lumpsumPeriod, false); // years: integers only
    addNumericGuards(lumpsumRate, true);
    [lumpsumAmount, lumpsumPeriod, lumpsumRate].forEach(addWheelGuard);
    
    // Link inputs and range sliders (live clamp)
    lumpsumAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(lumpsumAmount, 1, 100000000);
        lumpsumAmountRange.value = lumpsumAmount.value;
        calculateLumpsum();
    });
    
    lumpsumAmountRange.addEventListener('input', function() {
        lumpsumAmount.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumPeriod.addEventListener('input', function() {
        clampInputIfOutOfRange(lumpsumPeriod, 1, 50);
        lumpsumPeriodRange.value = lumpsumPeriod.value;
        calculateLumpsum();
    });
    
    lumpsumPeriodRange.addEventListener('input', function() {
        lumpsumPeriod.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumRate.addEventListener('input', function() {
        clampInputIfOutOfRange(lumpsumRate, 1, 100);
        lumpsumRateRange.value = lumpsumRate.value;
        calculateLumpsum();
    });
    
    lumpsumRateRange.addEventListener('input', function() {
        lumpsumRate.value = this.value;
        calculateLumpsum();
    });
    
    // Final clamp on blur (live clamp is already applied in input handlers above)
    lumpsumAmount.addEventListener('blur', () => validateNumberInput(lumpsumAmount, 1, 100000000));
    lumpsumPeriod.addEventListener('blur', () => validateNumberInput(lumpsumPeriod, 1, 50));
    lumpsumRate.addEventListener('blur', () => validateNumberInput(lumpsumRate, 1, 100));
    
    function calculateLumpsum() {
        const amount = parseFloat(lumpsumAmount.value) || 0;
        const period = parseFloat(lumpsumPeriod.value) || 0;
        const rate = parseFloat(lumpsumRate.value) || 0;
        
        if (amount <= 0 || period <= 0 || rate <= 0) return;
        
        const futureValue = amount * Math.pow(1 + rate/100, period);
        const returns = futureValue - amount;
        
        document.getElementById('lumpsum-invested').textContent = formatCurrencyOrInfinity(amount);
        document.getElementById('lumpsum-returns').textContent = formatCurrencyOrInfinity(returns);
        document.getElementById('lumpsum-total').textContent = formatCurrencyOrInfinity(futureValue);
    }
    
    // Initial calculation
    calculateLumpsum();
}

// GST Calculator
function setupGSTCalculator() {
    const gstAmount = document.getElementById('gst-amount');
    const gstRateInput = document.getElementById('gst-rate');
    const gstRateBtns = document.querySelectorAll('.gst-rate-btn');
    const gstAddBtn = document.getElementById('gst-add');
    const gstRemoveBtn = document.getElementById('gst-remove');
    // Prevent letters + allow decimals, block wheel
    addNumericGuards(gstAmount, true);
    addNumericGuards(gstRateInput, true);
    [gstAmount, gstRateInput].forEach(addWheelGuard);
    
    // GST Rate buttons (Tailwind class toggling)
    gstRateBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const rate = this.getAttribute('data-rate');
            gstRateBtns.forEach(b => {
                b.classList.remove('bg-primary-600', 'text-white');
                b.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200', 'hover:bg-gray-300', 'dark:hover:bg-gray-600');
            });
            this.classList.add('bg-primary-600', 'text-white');
            this.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200', 'hover:bg-gray-300', 'dark:hover:bg-gray-600');
            gstRateInput.value = rate;
            calculateGST();
        });
    });
    
    // GST Calculation Type (Tailwind + ARIA)
    gstAddBtn.addEventListener('click', function() {
        gstAddBtn.setAttribute('aria-pressed', 'true');
        gstRemoveBtn.setAttribute('aria-pressed', 'false');
        // Active gradient for Add
        gstAddBtn.classList.add('bg-gradient-to-br', 'from-primary-500', 'to-secondary-500', 'text-white');
        gstAddBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        // Inactive gray for Remove
        gstRemoveBtn.classList.remove('bg-gradient-to-br', 'from-primary-500', 'to-secondary-500', 'text-white');
        gstRemoveBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        calculateGST();
    });
    
    gstRemoveBtn.addEventListener('click', function() {
        gstRemoveBtn.setAttribute('aria-pressed', 'true');
        gstAddBtn.setAttribute('aria-pressed', 'false');
        // Active gradient for Remove
        gstRemoveBtn.classList.add('bg-gradient-to-br', 'from-primary-500', 'to-secondary-500', 'text-white');
        gstRemoveBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        // Inactive gray for Add
        gstAddBtn.classList.remove('bg-gradient-to-br', 'from-primary-500', 'to-secondary-500', 'text-white');
        gstAddBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        calculateGST();
    });
    
    // Live input + validation for consistent calc
    gstAmount.addEventListener('input', () => {
        clampInputIfOutOfRange(gstAmount, 1, 100000000);
        calculateGST();
    });
    gstRateInput.addEventListener('input', () => {
        clampInputIfOutOfRange(gstRateInput, 0, 100);
        calculateGST();
    });
    // Final clamp on blur
    gstAmount.addEventListener('blur', () => validateNumberInput(gstAmount, 1, 100000000));
    gstRateInput.addEventListener('blur', () => validateNumberInput(gstRateInput, 0, 100));
    
    function calculateGST() {
        const amount = parseFloat(gstAmount.value) || 0;
        const rate = parseFloat(gstRateInput.value) || 0;
        const isAddGST = gstAddBtn.getAttribute('aria-pressed') === 'true';
        
        let original, tax, net;
        
        if (isAddGST) {
            original = amount;
            tax = amount * (rate / 100);
            net = original + tax;
        } else {
            net = amount;
            original = net / (1 + rate/100);
            tax = net - original;
        }
        
        document.getElementById('gst-original').textContent = formatCurrencyOrInfinity(original);
        document.getElementById('gst-tax').textContent = formatCurrencyOrInfinity(tax);
        document.getElementById('gst-net').textContent = formatCurrencyOrInfinity(net);
    }
    
    // Initial calculation
    calculateGST();
}

// EMI Calculator
function setupEMICalculator() {
    const emiAmount = document.getElementById('emi-amount');
    const emiAmountRange = document.getElementById('emi-amount-range');
    const emiRate = document.getElementById('emi-rate');
    const emiRateRange = document.getElementById('emi-rate-range');
    const emiTenure = document.getElementById('emi-tenure');
    const emiTenureRange = document.getElementById('emi-tenure-range');
    // Prevent letters; allow decimals except for years, block wheel
    addNumericGuards(emiAmount, true);
    addNumericGuards(emiRate, true);
    addNumericGuards(emiTenure, false); // years: integers only
    [emiAmount, emiRate, emiTenure].forEach(addWheelGuard);
    
    // Link inputs and range sliders (live clamp)
    emiAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(emiAmount, 1000, 100000000);
        emiAmountRange.value = emiAmount.value;
        calculateEMI();
    });
    
    emiAmountRange.addEventListener('input', function() {
        emiAmount.value = this.value;
        calculateEMI();
    });
    
    emiRate.addEventListener('input', function() {
        clampInputIfOutOfRange(emiRate, 1, 100);
        emiRateRange.value = emiRate.value;
        calculateEMI();
    });
    
    emiRateRange.addEventListener('input', function() {
        emiRate.value = this.value;
        calculateEMI();
    });
    
    emiTenure.addEventListener('input', function() {
        clampInputIfOutOfRange(emiTenure, 1, 50);
        emiTenureRange.value = emiTenure.value;
        calculateEMI();
    });
    
    emiTenureRange.addEventListener('input', function() {
        emiTenure.value = this.value;
        calculateEMI();
    });
    
    // Validate inputs
    emiAmount.addEventListener('blur', () => validateNumberInput(emiAmount, 1000, 100000000));
    emiRate.addEventListener('blur', () => validateNumberInput(emiRate, 1, 100));
    emiTenure.addEventListener('blur', () => validateNumberInput(emiTenure, 1, 50));
    
    function calculateEMI() {
        const amount = parseFloat(emiAmount.value) || 0;
        const rate = parseFloat(emiRate.value) || 0;
        const tenure = parseFloat(emiTenure.value) || 0;
        
        if (amount <= 0 || rate <= 0 || tenure <= 0) return;
        
        const monthlyRate = rate / 100 / 12;
        const months = tenure * 12;
        const emi = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
        const totalPayment = emi * months;
        const totalInterest = totalPayment - amount;
        
        document.getElementById('emi-monthly').textContent = formatCurrencyOrInfinity(emi);
        document.getElementById('emi-interest').textContent = formatCurrencyOrInfinity(totalInterest);
        document.getElementById('emi-total').textContent = formatCurrencyOrInfinity(totalPayment);
    }
    
    // Initial calculation
    calculateEMI();
}

// Initialize all calculators
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupSIPCalculator();
    setupLumpsumCalculator();
    setupGSTCalculator();
    setupEMICalculator();
    setupInputFocusScroll();
});

// Mobile menu toggle
function setupMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    const openIcon = '<i class="fas fa-bars"></i>';
    const closeIcon = '<i class="fas fa-times"></i>';

    function setExpanded(expanded) {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.innerHTML = expanded ? closeIcon : openIcon;
    }

    function isHidden() {
        return menu.classList.contains('hidden');
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        setExpanded(!isHidden());
    });

    // Close when clicking a link in the menu
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
            setExpanded(false);
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !isHidden()) {
            menu.classList.add('hidden');
            setExpanded(false);
        }
    });

    // Optional: close when clicking outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== toggle && !isHidden()) {
            menu.classList.add('hidden');
            setExpanded(false);
        }
    });
}