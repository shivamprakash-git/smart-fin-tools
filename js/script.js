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

    const getHeaderOffset = () => {
        const header = document.querySelector('header');
        // Add small padding for comfort
        return (header ? header.getBoundingClientRect().height : 96) + 8;
    };

    const scrollInputIntoView = (el) => {
        // Defer a bit to let the keyboard animation start
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const vv = window.visualViewport;
            const viewportHeight = vv ? vv.height : window.innerHeight;
            const topThreshold = getHeaderOffset(); // keep above header
            const bottomThreshold = viewportHeight - 20; // leave small bottom padding

            const isAbove = rect.top < topThreshold;
            const isBelow = rect.bottom > bottomThreshold;

            if (isAbove) {
                const y = window.scrollY + rect.top - topThreshold;
                window.scrollTo({ top: Math.max(0, y), behavior: prefersReduce ? 'auto' : 'smooth' });
            } else if (isBelow) {
                // Option 1: just enough to bring bottom above the bottom threshold
                const minimalTop = window.scrollY + (rect.bottom - bottomThreshold);
                // Option 2: place input around 1/3 from top
                const oneThirdTop = window.scrollY + rect.top - (viewportHeight / 3);
                const target = Math.max(0, Math.min(minimalTop, oneThirdTop));
                window.scrollTo({ top: target, behavior: prefersReduce ? 'auto' : 'smooth' });
            }
        }, 150);
    };

    const focusHandler = (e) => {
        const el = e.target;
        if (!el || !(el instanceof Element)) return;
        if (el.matches('input, textarea, select')) {
            scrollInputIntoView(el);
        }
    };

    // Global listener covers existing and future inputs
    document.addEventListener('focusin', focusHandler);
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

// Validate number inputs
function validateNumberInput(input, min, max) {
    let value = parseFloat(input.value);
    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;
    input.value = value;
    return value;
}

// SIP Calculator
function setupSIPCalculator() {
    const sipAmount = document.getElementById('sip-amount');
    const sipAmountRange = document.getElementById('sip-amount-range');
    const sipPeriod = document.getElementById('sip-period');
    const sipPeriodRange = document.getElementById('sip-period-range');
    const sipRate = document.getElementById('sip-rate');
    const sipRateRange = document.getElementById('sip-rate-range');
    
    // Link inputs and range sliders
    sipAmount.addEventListener('input', function() {
        sipAmountRange.value = this.value;
        calculateSIP();
    });
    
    sipAmountRange.addEventListener('input', function() {
        sipAmount.value = this.value;
        calculateSIP();
    });
    
    sipPeriod.addEventListener('input', function() {
        sipPeriodRange.value = this.value;
        calculateSIP();
    });
    
    sipPeriodRange.addEventListener('input', function() {
        sipPeriod.value = this.value;
        calculateSIP();
    });
    
    sipRate.addEventListener('input', function() {
        sipRateRange.value = this.value;
        calculateSIP();
    });
    
    sipRateRange.addEventListener('input', function() {
        sipRate.value = this.value;
        calculateSIP();
    });
    
    // Validate inputs
    sipAmount.addEventListener('blur', () => validateNumberInput(sipAmount, 100, 1000000));
    sipPeriod.addEventListener('blur', () => validateNumberInput(sipPeriod, 1, 40));
    sipRate.addEventListener('blur', () => validateNumberInput(sipRate, 1, 30));
    
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
        
        document.getElementById('sip-invested').textContent = formatCurrency(invested);
        document.getElementById('sip-returns').textContent = formatCurrency(returns);
        document.getElementById('sip-total').textContent = formatCurrency(futureValue);
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
    
    // Link inputs and range sliders
    lumpsumAmount.addEventListener('input', function() {
        lumpsumAmountRange.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumAmountRange.addEventListener('input', function() {
        lumpsumAmount.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumPeriod.addEventListener('input', function() {
        lumpsumPeriodRange.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumPeriodRange.addEventListener('input', function() {
        lumpsumPeriod.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumRate.addEventListener('input', function() {
        lumpsumRateRange.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumRateRange.addEventListener('input', function() {
        lumpsumRate.value = this.value;
        calculateLumpsum();
    });
    
    // Validate inputs
    lumpsumAmount.addEventListener('blur', () => validateNumberInput(lumpsumAmount, 1000, 10000000));
    lumpsumPeriod.addEventListener('blur', () => validateNumberInput(lumpsumPeriod, 1, 40));
    lumpsumRate.addEventListener('blur', () => validateNumberInput(lumpsumRate, 1, 30));
    
    function calculateLumpsum() {
        const amount = parseFloat(lumpsumAmount.value) || 0;
        const period = parseFloat(lumpsumPeriod.value) || 0;
        const rate = parseFloat(lumpsumRate.value) || 0;
        
        if (amount <= 0 || period <= 0 || rate <= 0) return;
        
        const futureValue = amount * Math.pow(1 + rate/100, period);
        const returns = futureValue - amount;
        
        document.getElementById('lumpsum-invested').textContent = formatCurrency(amount);
        document.getElementById('lumpsum-returns').textContent = formatCurrency(returns);
        document.getElementById('lumpsum-total').textContent = formatCurrency(futureValue);
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
    
    // Input validation
    gstAmount.addEventListener('blur', () => validateNumberInput(gstAmount, 1, 10000000));
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
        
        document.getElementById('gst-original').textContent = formatCurrency(original);
        document.getElementById('gst-tax').textContent = formatCurrency(tax);
        document.getElementById('gst-net').textContent = formatCurrency(net);
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
    
    // Link inputs and range sliders
    emiAmount.addEventListener('input', function() {
        emiAmountRange.value = this.value;
        calculateEMI();
    });
    
    emiAmountRange.addEventListener('input', function() {
        emiAmount.value = this.value;
        calculateEMI();
    });
    
    emiRate.addEventListener('input', function() {
        emiRateRange.value = this.value;
        calculateEMI();
    });
    
    emiRateRange.addEventListener('input', function() {
        emiRate.value = this.value;
        calculateEMI();
    });
    
    emiTenure.addEventListener('input', function() {
        emiTenureRange.value = this.value;
        calculateEMI();
    });
    
    emiTenureRange.addEventListener('input', function() {
        emiTenure.value = this.value;
        calculateEMI();
    });
    
    // Validate inputs
    emiAmount.addEventListener('blur', () => validateNumberInput(emiAmount, 10000, 50000000));
    emiRate.addEventListener('blur', () => validateNumberInput(emiRate, 1, 30));
    emiTenure.addEventListener('blur', () => validateNumberInput(emiTenure, 1, 30));
    
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
        
        document.getElementById('emi-monthly').textContent = formatCurrency(emi);
        document.getElementById('emi-interest').textContent = formatCurrency(totalInterest);
        document.getElementById('emi-total').textContent = formatCurrency(totalPayment);
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