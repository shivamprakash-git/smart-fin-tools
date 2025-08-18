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
    // Track manual user scrolling to avoid snapping back to the focused input
    let userScrolling = false;
    let userScrollTimer = null;
    // Helper: is a text-editing control (likely to summon keyboard/caret)
    const isTextualInput = (el) => !!el && el.matches && el.matches('textarea, input:not([type]), input[type="text"], input[type="number"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], input[type="password"]');
    const onUserScroll = () => {
        userScrolling = true;
        clearTimeout(userScrollTimer);
        userScrollTimer = setTimeout(() => { userScrolling = false; }, 500);
    };
    // Only blur on explicit user gesture scrolls (wheel/touchmove), not generic scrolls
    const onGestureScroll = () => {
        userScrolling = true;
        clearTimeout(userScrollTimer);
        if (activeEl && isTextualInput(activeEl)) {
            try { activeEl.blur(); } catch (e) {}
            activeEl = null;
        }
        userScrollTimer = setTimeout(() => { userScrolling = false; }, 500);
    };

    const getHeaderOffset = () => {
        const header = document.querySelector('header');
        // Add small padding for comfort
        return (header ? header.getBoundingClientRect().height : 96) + 8;
    };

    // Keyboard height helper (when visualViewport is available)
    const getKeyboardHeight = () => {
        if (!vv) return 0;
        const kb = (window.innerHeight - vv.height - (vv.offsetTop || 0));
        return Math.max(0, kb);
    };

    let activeEl = null;
    let scheduleTimer = null;

    const scheduleScroll = () => {
        if (!activeEl) return;
        // If user is actively scrolling, do not auto-correct position
        if (userScrolling) return;
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

        // Tailored handling for large editor to avoid bounce on mobile
        if (el.id === 'editor-area') {
            clearTimeout(scheduleTimer);
            scheduleTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    const rect = el.getBoundingClientRect();
                    const viewportHeight = vv ? vv.height : window.innerHeight;
                    const viewportTopOffset = vv ? vv.offsetTop : 0;
                    const topThreshold = getHeaderOffset();
                    const bottomThreshold = (viewportHeight + viewportTopOffset) - 12; // small bottom padding

                    const isAbove = (rect.top - viewportTopOffset) < topThreshold;
                    const isBelow = (rect.bottom - viewportTopOffset) > bottomThreshold;

                    if (isBelow) {
                        el.scrollIntoView({ block: 'center', behavior: prefersReduce ? 'auto' : 'smooth' });
                    } else if (isAbove) {
                        const target = window.scrollY + rect.top - topThreshold;
                        window.scrollTo({ top: target, behavior: prefersReduce ? 'auto' : 'smooth' });
                    }
                });
            }, isIOS ? 360 : 160);
            return;
        }

        // Default handling for other inputs
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
    // Observe manual scrolling gestures
    window.addEventListener('scroll', onUserScroll, { passive: true });
    window.addEventListener('wheel', onGestureScroll, { passive: true });
    window.addEventListener('touchmove', onGestureScroll, { passive: true });

    // If the user taps/presses on a slider/range control, proactively blur any text input
    const onPreInteract = (e) => {
        const t = e.target;
        const isRange = t && (t.matches && (t.matches('input[type="range"], .range-slider')));
        if (!isRange) return;
        if (activeEl && isTextualInput(activeEl) && activeEl !== t) {
            // Prevent the browser from auto-scrolling the old focused text field back into view
            try { activeEl.blur(); } catch (err) {}
            activeEl = null;
            // Temporarily mark as user scrolling to disable scheduled auto-scroll
            userScrolling = true;
            clearTimeout(userScrollTimer);
            userScrollTimer = setTimeout(() => { userScrolling = false; }, 400);
        }
    };
    document.addEventListener('pointerdown', onPreInteract, { passive: true, capture: true });
    document.addEventListener('touchstart', onPreInteract, { passive: true, capture: true });

    // Reposition on visual viewport changes (keyboard height/movement)
    if (vv) {
        // Maintain a padding-bottom so content can scroll above the keyboard reliably
        const applyKeyboardPadding = () => {
            const kb = getKeyboardHeight();
            document.body.style.paddingBottom = kb > 0 ? (kb + 8) + 'px' : '';
        };
        applyKeyboardPadding();

        let vvTimer = null;
        const onVVChange = () => {
            applyKeyboardPadding();
            if (!activeEl) return;
            // Do not interfere if user is manually scrolling
            if (userScrolling) return;
            // Only reposition when the on-screen keyboard is actually visible
            const kbNow = getKeyboardHeight();
            if (kbNow <= 0) return;
            clearTimeout(vvTimer);
            vvTimer = setTimeout(() => {
                // For editor, re-run tailored logic; for others, scheduleScroll
                if (activeEl && activeEl.id === 'editor-area') {
                    activeEl.scrollIntoView({ block: 'center', behavior: prefersReduce ? 'auto' : 'smooth' });
                } else {
                    scheduleScroll();
                }
            }, isIOS ? 150 : 75);
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

// Global slider enable/disable toggle (off by default)
function setupSliderGlobalToggle() {
    const toggle = document.getElementById('slider-global-toggle');
    const getSliders = () => document.querySelectorAll('.range-slider');
    const track = document.getElementById('slider-toggle-track');
    const knob = document.getElementById('slider-toggle-knob');
    const container = document.getElementById('slider-toggle-container');

    const setNoTransition = (disable) => {
        if (track) track.classList.toggle('transition-none', disable);
        if (knob) knob.classList.toggle('transition-none', disable);
    };

    const applyState = (enabled) => {
        getSliders().forEach(sl => {
            sl.disabled = !enabled;
            sl.setAttribute('aria-disabled', (!enabled).toString());
            sl.classList.toggle('opacity-50', !enabled);
            sl.classList.toggle('cursor-not-allowed', !enabled);
            sl.classList.toggle('pointer-events-none', !enabled);
        });
        // Animate/Style switch
        if (track) {
            track.classList.toggle('bg-primary-600', enabled);
            if (!enabled) {
                track.classList.add('bg-gray-300');
                track.classList.add('dark:bg-gray-700');
            } else {
                track.classList.remove('bg-gray-300');
                track.classList.remove('dark:bg-gray-700');
            }
        }
        if (knob) {
            knob.classList.toggle('translate-x-5', enabled);
            knob.classList.toggle('translate-x-0', !enabled);
        }
        try { localStorage.setItem('sliders-enabled', enabled ? '1' : '0'); } catch (e) {}
    };

    // Default: disabled unless explicitly enabled previously
    const saved = (() => { try { return localStorage.getItem('sliders-enabled'); } catch (e) { return null; } })();
    const initialEnabled = saved === '1';

    if (toggle) {
        toggle.checked = initialEnabled;
        // Apply initial state without animating
        setNoTransition(true);
        applyState(initialEnabled);
        if (container) container.classList.remove('invisible');
        requestAnimationFrame(() => setNoTransition(false));
        toggle.addEventListener('change', () => applyState(toggle.checked));
    } else {
        // Safety: if toggle missing, keep sliders disabled by default
        applyState(false);
        if (container) container.classList.remove('invisible');
    }
}

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

// Compact Indian-style formatter for very large values (for charts/tooltips)
// Uses full unit names: Thousand, Lakh, Crore, Arab, Kharab, Neel, Padma, Shankh
// Keeps output readable while using full names per request
function formatIndianCompact(value, withCurrency = true) {
    if (!isFinite(value)) return '∞';
    const sign = value < 0 ? '-' : '';
    const n = Math.abs(value);

    // Thresholds (descending)
    const units = [
        { v: 1e17, s: 'Shankh' },
        { v: 1e15, s: 'Padma'  },
        { v: 1e13, s: 'Neel'   },
        { v: 1e11, s: 'Kharab' },
        { v: 1e9,  s: 'Arab'   },
        { v: 1e7,  s: 'Crore'  },
        { v: 1e5,  s: 'Lakh'   },
        { v: 1e3,  s: 'Thousand' }
    ];

    let out;
    for (const u of units) {
        if (n >= u.v) {
            out = (n / u.v);
            break;
        }
    }
    if (out === undefined) {
        // For small values, keep 2 decimals and Indian grouping with full currency
        const small = withCurrency ? formatCurrency(n) : n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        return sign + small;
    }

    // If the ratio itself is enormous (beyond top named unit coverage), avoid 'e' notation
    let str;
    if (out >= 1e9) {
        // Use exponential then convert to mantissa × 10^exp
        const expStr = out.toExponential(2); // e.g., 3.45e+12
        const match = expStr.match(/([\d.]+)e\+?(\d+)/i);
        if (match) {
            const mantissa = match[1].replace(/\.00?$/,'');
            const exp = match[2];
            const unit = units.find(u => n >= u.v).s;
            const prefix = withCurrency ? '₹' : '';
            return `${sign}${prefix}${mantissa} × 10^${exp} ${unit}`;
        }
        // Fallback if parsing fails
        str = out.toString();
    } else {
        // Format with up to 2 decimals, strip trailing zeros
        str = out.toFixed(out >= 100 ? 0 : out >= 10 ? 1 : 2).replace(/\.00?$|0$/,'');
    }

    const unit = units.find(u => n >= u.v).s;
    const prefix = withCurrency ? '₹' : '';
    return `${sign}${prefix}${str} ${unit}`;
}

function formatCurrencyCompact(amount) {
    return formatIndianCompact(amount, true);
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

// Exponential slider mapping helpers for large monetary ranges
// We normalize slider range to [0..1000] steps for smooth control, while mapping
// to [minAmount..maxAmount] exponentially so early movement changes slowly.
const SLIDER_NORM_MIN = 0;
const SLIDER_NORM_MAX = 1000; // 1001 discrete positions

function amountFromSliderPos(pos, minAmount, maxAmount) {
    const minA = Math.max(1, minAmount);
    const p = Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
    // Early discrete ladder: 1, 500, 1000, ..., 10000
    const EARLY_STEPS = [1, ...Array.from({ length: 20 }, (_, i) => 500 * (i + 1))]; // 1, 500..10000
    const EARLY_ZONE_POS = EARLY_STEPS.length - 1; // one slider tick per early step
    if (p <= EARLY_ZONE_POS) {
        const idx = Math.max(0, Math.min(EARLY_STEPS.length - 1, Math.round(p)));
        const val = EARLY_STEPS[idx];
        return Math.max(minA, val);
    }
    // Exponential mapping for the remaining positions from last early to max
    const startVal = Math.max(minA, EARLY_STEPS[EARLY_STEPS.length - 1]); // typically 10000
    const span = SLIDER_NORM_MAX - EARLY_ZONE_POS;
    const t2 = (p - EARLY_ZONE_POS) / span; // 0..1
    const ratio = maxAmount / startVal;
    return startVal * Math.pow(ratio, t2);
}

function sliderPosFromAmount(amount, minAmount, maxAmount) {
    const minA = Math.max(1, minAmount);
    const a = Math.min(maxAmount, Math.max(minA, amount));
    const EARLY_STEPS = [1, ...Array.from({ length: 20 }, (_, i) => 500 * (i + 1))];
    const EARLY_ZONE_POS = EARLY_STEPS.length - 1;
    const lastEarly = Math.max(minA, EARLY_STEPS[EARLY_STEPS.length - 1]);
    if (a <= lastEarly) {
        // Map to closest early step index; each index equals one slider tick
        let idx = 0;
        for (let i = 0; i < EARLY_STEPS.length; i++) {
            if (a >= Math.max(minA, EARLY_STEPS[i])) idx = i; else break;
        }
        const pos = idx; // direct mapping
        return Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
    }
    // Exponential region inverse mapping
    const span = SLIDER_NORM_MAX - EARLY_ZONE_POS;
    const ratio = maxAmount / lastEarly;
    const t2 = Math.log(a / lastEarly) / Math.log(ratio); // 0..1
    const pos = Math.round(EARLY_ZONE_POS + t2 * span);
    return Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
}

// Round to a "nice" step depending on magnitude (to avoid odd decimals)
function roundNiceAmount(n) {
    // Start with 1, then jump to 500, 1000, 1500, ...
    if (n < 500) return 1;
    if (n < 10000) return Math.round(n / 500) * 500; // 500-steps up to <10k
    if (n < 100000) return Math.round(n / 1000) * 1000; // 1k steps
    if (n < 1000000) return Math.round(n / 5000) * 5000; // 5k steps
    if (n < 10000000) return Math.round(n / 10000) * 10000; // 10k steps
    if (n < 100000000) return Math.round(n / 50000) * 50000; // 50k steps
    if (n < 1000000000) return Math.round(n / 100000) * 100000; // 1 lakh steps
    return Math.round(n / 500000) * 500000; // 5 lakh steps and above
}

// Charts: Line (growth) + Pie (breakdown)
let lineChart = null;
let pieChart = null;

function getChartCtx(id) {
    const el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
}

// Create the main chart (line or stacked bar)
function createMainChart(type) {
    const ctx = getChartCtx('calc-line-chart');
    if (!ctx || typeof Chart === 'undefined') return null;

    const isBar = type === 'bar';
    return new Chart(ctx, {
        type: isBar ? 'bar' : 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Invested',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: isBar ? 'rgba(99,102,241,0.7)' : 'rgba(99,102,241,0.15)',
                    tension: isBar ? undefined : 0.3,
                    fill: false,
                    pointRadius: isBar ? 0 : 2,
                    pointHoverRadius: isBar ? 0 : 5,
                    borderWidth: 2
                },
                {
                    label: 'Returns',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: isBar ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.15)',
                    tension: isBar ? undefined : 0.3,
                    fill: false,
                    pointRadius: isBar ? 0 : 2,
                    pointHoverRadius: isBar ? 0 : 5,
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
                            return `${dsLabel}: ${formatCurrencyCompact(val)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: isBar,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148,163,184,0.15)' }
                },
                y: {
                    stacked: isBar,
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 6,
                        callback: function(v) { return formatIndianCompact(v, true); }
                    },
                    grid: { color: 'rgba(148,163,184,0.15)' },
                    beginAtZero: true,
                    grace: '5%'
                }
            }
        }
    });
}

function ensureCharts() {
    const pieCtx = getChartCtx('calc-pie-chart');
    if (!lineChart) {
        lineChart = createMainChart('line');
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
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const label = ctx.label || ctx.dataset?.label || '';
                                const val = Array.isArray(ctx.parsed) ? ctx.parsed[0] : ctx.parsed; // Chart.js v4 doughnut gives number
                                return `${label}: ${formatCurrencyCompact(val)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateCharts({ labels, investedSeries, returnsSeries, lineLabels, lineVisibility, pieLabels, pieData, pieColors, ui, chartType }) {
    ensureCharts();
    // Switch chart type dynamically if requested
    const desiredType = chartType || 'line';
    if (lineChart && typeof Chart !== 'undefined' && lineChart.config.type !== desiredType) {
        try { lineChart.destroy(); } catch (e) {}
        lineChart = createMainChart(desiredType);
    }
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
    
    // Normalize the amount slider to 0..1000 and apply exponential mapping
    const SIP_MIN = 1;
    const SIP_MAX = 500000000;
    if (sipAmountRange) {
        sipAmountRange.min = SLIDER_NORM_MIN;
        sipAmountRange.max = SLIDER_NORM_MAX;
        sipAmountRange.step = 1;
        // Initialize slider position based on current input value
        const initVal = parseFloat(sipAmount.value) || 5000;
        sipAmountRange.value = sliderPosFromAmount(initVal, SIP_MIN, SIP_MAX);
    }

    // Link inputs and range sliders (live clamp + mapping)
    sipAmount.addEventListener('input', function() {
        const clamped = clampInputIfOutOfRange(sipAmount, SIP_MIN, SIP_MAX);
        if (clamped != null && sipAmountRange) {
            sipAmountRange.value = sliderPosFromAmount(clamped, SIP_MIN, SIP_MAX);
        }
        calculateSIP();
    });
    
    sipAmountRange.addEventListener('input', function() {
        const amt = roundNiceAmount(amountFromSliderPos(parseFloat(this.value) || 0, SIP_MIN, SIP_MAX));
        sipAmount.value = amt;
        calculateSIP();
    });
    
    sipPeriod.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(sipPeriod, 1, 100);
        // When empty, move slider to starting point (min)
        sipPeriodRange.value = (v == null) ? sipPeriodRange.min : sipPeriod.value;
        calculateSIP();
    });
    
    sipPeriodRange.addEventListener('input', function() {
        sipPeriod.value = this.value;
        calculateSIP();
    });
    
    sipRate.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(sipRate, 1, 100);
        // When empty, move slider to starting point (min)
        sipRateRange.value = (v == null) ? sipRateRange.min : sipRate.value;
        calculateSIP();
    });
    
    sipRateRange.addEventListener('input', function() {
        sipRate.value = this.value;
        calculateSIP();
    });
    
    // Validate inputs
    sipAmount.addEventListener('blur', () => validateNumberInput(sipAmount, SIP_MIN, SIP_MAX));
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
            chartType: 'line',
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
    
    // Normalize amount slider and apply exponential mapping
    const LUMP_MIN = 1;
    const LUMP_MAX = 5000000000;
    if (lumpsumAmountRange) {
        lumpsumAmountRange.min = SLIDER_NORM_MIN;
        lumpsumAmountRange.max = SLIDER_NORM_MAX;
        lumpsumAmountRange.step = 1;
        const initVal = parseFloat(lumpsumAmount.value) || 100000;
        lumpsumAmountRange.value = sliderPosFromAmount(initVal, LUMP_MIN, LUMP_MAX);
    }

    // Link inputs and range sliders (live clamp + mapping)
    lumpsumAmount.addEventListener('input', function() {
        const clamped = clampInputIfOutOfRange(lumpsumAmount, LUMP_MIN, LUMP_MAX);
        if (clamped != null && lumpsumAmountRange) {
            lumpsumAmountRange.value = sliderPosFromAmount(clamped, LUMP_MIN, LUMP_MAX);
        }
        calculateLumpsum();
    });
    
    lumpsumAmountRange.addEventListener('input', function() {
        const amt = roundNiceAmount(amountFromSliderPos(parseFloat(this.value) || 0, LUMP_MIN, LUMP_MAX));
        lumpsumAmount.value = amt;
        calculateLumpsum();
    });
    
    lumpsumPeriod.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(lumpsumPeriod, 1, 100);
        lumpsumPeriodRange.value = (v == null) ? lumpsumPeriodRange.min : lumpsumPeriod.value;
        calculateLumpsum();
    });
    
    lumpsumPeriodRange.addEventListener('input', function() {
        lumpsumPeriod.value = this.value;
        calculateLumpsum();
    });
    
    lumpsumRate.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(lumpsumRate, 1, 100);
        lumpsumRateRange.value = (v == null) ? lumpsumRateRange.min : lumpsumRate.value;
        calculateLumpsum();
    });
    
    lumpsumRateRange.addEventListener('input', function() {
        lumpsumRate.value = this.value;
        calculateLumpsum();
    });
    
    // Final clamp on blur (live clamp is already applied in input handlers above)
    lumpsumAmount.addEventListener('blur', () => validateNumberInput(lumpsumAmount, LUMP_MIN, LUMP_MAX));
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
            chartType: 'line',
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

        // Base vs GST totals as a single stacked bar (align with EMI style)
        const baseLabel = isAddGST ? 'Base' : 'Pre-tax Base';
        const gstLabel = isAddGST ? 'GST Added' : 'GST Portion';
        const badge = isAddGST ? 'Add GST' : 'Remove GST';
        updateCharts({
            labels: ['Total'],
            investedSeries: [original],
            returnsSeries: [Math.max(0, tax)],
            lineLabels: [baseLabel, gstLabel],
            lineVisibility: [true, true],
            pieLabels: [baseLabel, gstLabel],
            pieData: [original, Math.max(0, tax)],
            pieColors: ['#6366f1', '#0ea5e9'],
            chartType: 'bar',
            ui: {
                growthTitle: 'GST Total',
                growthBadge: badge,
                breakdownTitle: 'Breakdown',
                breakdownBadge: `${baseLabel} vs ${gstLabel}`
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
    
    // Normalize amount slider and apply exponential mapping
    const EMI_MIN = 1;
    const EMI_MAX = 5000000000;
    if (emiAmountRange) {
        emiAmountRange.min = SLIDER_NORM_MIN;
        emiAmountRange.max = SLIDER_NORM_MAX;
        emiAmountRange.step = 1;
        const initVal = parseFloat(emiAmount.value) || 500000;
        emiAmountRange.value = sliderPosFromAmount(initVal, EMI_MIN, EMI_MAX);
    }

    // Link inputs and range sliders (live clamp + mapping)
    emiAmount.addEventListener('input', function() {
        const clamped = clampInputIfOutOfRange(emiAmount, EMI_MIN, EMI_MAX);
        if (clamped != null && emiAmountRange) {
            emiAmountRange.value = sliderPosFromAmount(clamped, EMI_MIN, EMI_MAX);
        }
        calculateEMI();
    });
    
    emiAmountRange.addEventListener('input', function() {
        const amt = roundNiceAmount(amountFromSliderPos(parseFloat(this.value) || 0, EMI_MIN, EMI_MAX));
        emiAmount.value = amt;
        calculateEMI();
    });
    
    emiRate.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(emiRate, 1, 100);
        emiRateRange.value = (v == null) ? emiRateRange.min : emiRate.value;
        calculateEMI();
    });
    
    emiRateRange.addEventListener('input', function() {
        emiRate.value = this.value;
        calculateEMI();
    });
    
    emiTenure.addEventListener('input', function() {
        const v = clampInputIfOutOfRange(emiTenure, 1, 100);
        emiTenureRange.value = (v == null) ? emiTenureRange.min : emiTenure.value;
        calculateEMI();
    });
    
    emiTenureRange.addEventListener('input', function() {
        emiTenure.value = this.value;
        calculateEMI();
    });
    
    // Validate inputs
    emiAmount.addEventListener('blur', () => validateNumberInput(emiAmount, EMI_MIN, EMI_MAX));
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

        // Simple stacked bar showing total Principal vs total Interest
        const labels = ['Total'];
        const investedSeries = [amount];      // Principal
        const returnsSeries = [Math.max(0, totalInterest)]; // Interest
        updateCharts({
            labels,
            investedSeries,
            returnsSeries,
            lineLabels: ['Principal', 'Interest'],
            lineVisibility: [true, true],
            pieLabels: ['Principal', 'Interest'],
            pieData: [amount, Math.max(0, totalInterest)],
            pieColors: ['#6366f1', '#0ea5e9'],
            chartType: 'bar',
            ui: {
                growthTitle: 'EMI Total Cost',
                growthBadge: 'Principal vs Interest over loan',
                breakdownTitle: 'Breakdown',
                breakdownBadge: 'Principal vs Interest'
            }
        });
        // No crossover/highlight needed for totals bar chart
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
    setupSliderGlobalToggle();
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