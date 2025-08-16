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
                const isEditor = activeEl && activeEl.id === 'editor-area';
                if (isAbove) {
                    // Nudge just enough to clear the header
                    target = window.scrollY + rect.top - topThreshold;
                } else {
                    // Element is below the comfortable area (likely behind the keyboard)
                    const minimalTop = window.scrollY + (rect.bottom - bottomThreshold);
                    const oneThirdTop = window.scrollY + (rect.top - viewportTopOffset) - (viewportHeight / 3);
                    // For the editor textarea, avoid aggressive upward scrolling
                    target = isEditor
                        ? Math.max(0, minimalTop)
                        : Math.max(0, Math.min(minimalTop, oneThirdTop));
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

        // Refresh charts for the selected calculator
        if (window._recalc && typeof window._recalc[tabName] === 'function') {
            window._recalc[tabName]();
        }
    });
});

// Format currency with decimals
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

// Show ∞ only when the value is actually non-finite
function formatCurrencyOrInfinity(amount) {
    if (!isFinite(amount)) {
        return '∞';
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

// Charts: Line (growth) + Pie (breakdown)
let lineChart = null;
let pieChart = null;

function getChartCtx(id) {
    const el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
}

function ensureCharts() {
    const lineCtx = getChartCtx('calc-line-chart');
    const pieCtx = getChartCtx('calc-pie-chart');

    if (!lineChart && lineCtx && typeof Chart !== 'undefined') {
        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Invested',
                        data: [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.15)',
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        borderWidth: 2
                    },
                    {
                        label: 'Returns',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.15)',
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, labels: { color: '#94a3b8' } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const dsLabel = ctx.dataset.label || '';
                                const val = ctx.parsed.y;
                                // Use existing formatter if available
                                if (typeof formatCurrencyOrInfinity === 'function') {
                                    return `${dsLabel}: ${formatCurrencyOrInfinity(val)}`;
                                }
                                try {
                                    return `${dsLabel}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)}`;
                                } catch {
                                    return `${dsLabel}: ${val}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' }, beginAtZero: true }
                }
            }
        });
    }

    if (!pieChart && pieCtx && typeof Chart !== 'undefined') {
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Invested', 'Returns'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#6366f1', '#0ea5e9']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
            }
        });
    }
}

function updateCharts({ labels, investedSeries, returnsSeries, lineLabels, lineVisibility, pieLabels, pieData, pieColors, ui }) {
    ensureCharts();
    // Update UI titles/badges when provided
    if (ui) {
        const gt = document.getElementById('growth-title');
        const gb = document.getElementById('growth-badge');
        const bt = document.getElementById('breakdown-title');
        const bb = document.getElementById('breakdown-badge');
        if (gt && ui.growthTitle) gt.textContent = ui.growthTitle;
        if (gb && ui.growthBadge) gb.textContent = ui.growthBadge;
        if (bt && ui.breakdownTitle) bt.textContent = ui.breakdownTitle;
        if (bb && ui.breakdownBadge) bb.textContent = ui.breakdownBadge;
    }
    if (lineChart && Array.isArray(labels) && Array.isArray(investedSeries) && Array.isArray(returnsSeries)) {
        lineChart.data.labels = labels;
        lineChart.data.datasets[0].data = investedSeries;
        lineChart.data.datasets[1].data = returnsSeries;
        if (Array.isArray(lineLabels)) {
            if (lineLabels[0]) lineChart.data.datasets[0].label = lineLabels[0];
            if (lineLabels[1]) lineChart.data.datasets[1].label = lineLabels[1];
        }
        if (Array.isArray(lineVisibility)) {
            if (typeof lineVisibility[0] === 'boolean') lineChart.data.datasets[0].hidden = !lineVisibility[0];
            if (typeof lineVisibility[1] === 'boolean') lineChart.data.datasets[1].hidden = !lineVisibility[1];
        } else {
            // default: both visible
            lineChart.data.datasets[0].hidden = false;
            lineChart.data.datasets[1].hidden = false;
        }
        lineChart.update();
    }
    if (pieChart && Array.isArray(pieLabels) && Array.isArray(pieData)) {
        pieChart.data.labels = pieLabels;
        pieChart.data.datasets[0].data = pieData;
        if (Array.isArray(pieColors)) {
            pieChart.data.datasets[0].backgroundColor = pieColors;
        }
        pieChart.update();
    }
}

// SIP Calculator
function setupSIPCalculator() {
    const sipAmount = document.getElementById('sip-amount');
    const sipAmountRange = document.getElementById('sip-amount-range');
    const sipPeriod = document.getElementById('sip-period');
    const sipPeriodRange = document.getElementById('sip-period-range');
    const sipRate = document.getElementById('sip-rate');
    const sipRateRange = document.getElementById('sip-rate-range');
    
    // Link inputs and range sliders (live clamp to keep calc consistent)
    sipAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(sipAmount, 1, 500000000);
        sipAmountRange.value = sipAmount.value;
        calculateSIP();
    });
    
    sipAmountRange.addEventListener('input', function() {
        sipAmount.value = this.value;
        calculateSIP();
    });
    
    sipPeriod.addEventListener('input', function() {
        clampInputIfOutOfRange(sipPeriod, 1, 100);
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
    sipAmount.addEventListener('blur', () => validateNumberInput(sipAmount, 1, 500000000));
    sipPeriod.addEventListener('blur', () => validateNumberInput(sipPeriod, 1, 100));
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

        // Yearly invested vs returns
        const labels = [];
        const investedSeries = [];
        const returnsSeries = [];
        for (let y = 1; y <= Math.max(1, Math.round(period)); y++) {
            const m = y * 12;
            const val = amount * (((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate));
            const inv = amount * m;
            labels.push(`Y${y}`);
            investedSeries.push(inv);
            returnsSeries.push(Math.max(0, val - inv));
        }
        updateCharts({
            labels,
            investedSeries,
            returnsSeries,
            lineLabels: ['Invested', 'Returns'],
            lineVisibility: [true, true],
            pieLabels: ['Invested', 'Returns'],
            pieData: [invested, Math.max(0, returns)],
            pieColors: ['#6366f1', '#0ea5e9'],
            ui: {
                growthTitle: 'SIP Growth Over Time',
                growthBadge: 'Tip: Longer tenure boosts compounding',
                breakdownTitle: 'Breakdown',
                breakdownBadge: 'Invested vs Returns'
            }
        });
    }
    
    // Initial calculation
    window._recalc = window._recalc || {};
    window._recalc['sip'] = calculateSIP;
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
    
    // Link inputs and range sliders (live clamp)
    lumpsumAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(lumpsumAmount, 1, 5000000000);
        lumpsumAmountRange.value = lumpsumAmount.value;
        calculateLumpsum();
    });
    
    lumpsumAmountRange.addEventListener('input', function() {
        lumpsumAmount.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumPeriod.addEventListener('input', function() {
        clampInputIfOutOfRange(lumpsumPeriod, 1, 100);
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
    lumpsumAmount.addEventListener('blur', () => validateNumberInput(lumpsumAmount, 1, 5000000000));
    lumpsumPeriod.addEventListener('blur', () => validateNumberInput(lumpsumPeriod, 1, 100));
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

        // Yearly invested (flat initial) vs returns growth
        const labels = [];
        const investedSeries = [];
        const returnsSeries = [];
        for (let y = 1; y <= Math.max(1, Math.round(period)); y++) {
            const valY = amount * Math.pow(1 + rate/100, y);
            labels.push(`Y${y}`);
            investedSeries.push(amount);
            returnsSeries.push(Math.max(0, valY - amount));
        }
        updateCharts({
            labels,
            investedSeries,
            returnsSeries,
            lineLabels: ['Invested', 'Returns'],
            lineVisibility: [true, true],
            pieLabels: ['Invested', 'Returns'],
            pieData: [amount, Math.max(0, returns)],
            pieColors: ['#6366f1', '#0ea5e9'],
            ui: {
                growthTitle: 'Lumpsum Growth Over Time',
                growthBadge: 'Tip: Time in market > timing',
                breakdownTitle: 'Breakdown',
                breakdownBadge: 'Invested vs Returns'
            }
        });
    }
    
    // Initial calculation
    window._recalc = window._recalc || {};
    window._recalc['lumpsum'] = calculateLumpsum;
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
    
    // Live input + validation for consistent calc
    gstAmount.addEventListener('input', () => {
        clampInputIfOutOfRange(gstAmount, 1, 5000000000);
        calculateGST();
    });
    gstRateInput.addEventListener('input', () => {
        clampInputIfOutOfRange(gstRateInput, 0, 100);
        calculateGST();
    });
    // Final clamp on blur
    gstAmount.addEventListener('blur', () => validateNumberInput(gstAmount, 1, 5000000000));
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

        // Base vs GST lines
        updateCharts({
            labels: ['Before', 'After'],
            investedSeries: [original, original],
            returnsSeries: [0, Math.max(0, tax)],
            lineLabels: ['Base', 'GST'],
            lineVisibility: [true, true],
            pieLabels: ['Base', 'GST'],
            pieData: [original, Math.max(0, tax)],
            pieColors: ['#6366f1', '#0ea5e9'],
            ui: {
                growthTitle: 'GST Impact',
                growthBadge: 'Tip: Choose Add vs Remove GST',
                breakdownTitle: 'Breakdown',
                breakdownBadge: 'Base vs GST'
            }
        });
    }
    
    // Initial calculation
    window._recalc = window._recalc || {};
    window._recalc['gst'] = calculateGST;
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
    
    // Link inputs and range sliders (live clamp)
    emiAmount.addEventListener('input', function() {
        clampInputIfOutOfRange(emiAmount, 1, 5000000000);
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
        clampInputIfOutOfRange(emiTenure, 1, 100);
        emiTenureRange.value = emiTenure.value;
        calculateEMI();
    });
    
    emiTenureRange.addEventListener('input', function() {
        emiTenure.value = this.value;
        calculateEMI();
    });
    
    // Validate inputs
    emiAmount.addEventListener('blur', () => validateNumberInput(emiAmount, 1, 5000000000));
    emiRate.addEventListener('blur', () => validateNumberInput(emiRate, 1, 100));
    emiTenure.addEventListener('blur', () => validateNumberInput(emiTenure, 1, 100));
    
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

        // Cumulative principal vs interest paid by year (amortization)
        const labels = [];
        const investedSeries = [];
        const returnsSeries = [];
        let remaining = amount;
        let cumPrincipal = 0;
        let cumInterest = 0;
        for (let m = 1; m <= months; m++) {
            const interestPortion = remaining * monthlyRate;
            const principalPortion = emi - interestPortion;
            cumInterest += interestPortion;
            cumPrincipal += principalPortion;
            remaining -= principalPortion;
            if (m % 12 === 0) {
                const y = m / 12;
                labels.push(`Y${y}`);
                investedSeries.push(Math.max(0, cumPrincipal));
                returnsSeries.push(Math.max(0, cumInterest));
            }
        }
        if (labels.length === 0) {
            labels.push('Y1');
            investedSeries.push(Math.max(0, amount));
            returnsSeries.push(Math.max(0, totalInterest));
        }
        updateCharts({
            labels,
            investedSeries,
            returnsSeries,
            lineLabels: ['Principal', 'Interest'],
            lineVisibility: [true, true],
            pieLabels: ['Principal', 'Interest'],
            pieData: [amount, Math.max(0, totalInterest)],
            pieColors: ['#6366f1', '#0ea5e9'],
            ui: {
                growthTitle: 'EMI Payments Over Time',
                growthBadge: 'Tip: Prepayments cut total interest',
                breakdownTitle: 'Breakdown',
                breakdownBadge: 'Principal vs Interest'
            }
        });
    }
    
    // Initial calculation
    window._recalc = window._recalc || {};
    window._recalc['emi'] = calculateEMI;
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

    // Ensure initial charts reflect the active tab's values
    const activeBtn = document.querySelector('.tab-btn[aria-selected="true"]');
    const fallbackBtn = activeBtn || document.querySelector('.tab-btn');
    if (fallbackBtn) {
        const tabName = fallbackBtn.getAttribute('data-tab');
        if (window._recalc && typeof window._recalc[tabName] === 'function') {
            window._recalc[tabName]();
        }
    }
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