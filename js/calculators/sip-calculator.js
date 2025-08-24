// SIP Calculator functionality
import { 
    formatCurrencyOrInfinity, 
    clampInputIfOutOfRange, 
    validateNumberInput,
    amountFromSliderPos,
    sliderPosFromAmount,
    roundNiceAmount,
    SLIDER_NORM_MIN,
    SLIDER_NORM_MAX
} from '../utils/formatters.js';
import { updateCharts } from '../utils/charts.js';

export function setupSIPCalculator() {
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
    
    // Initial calculation (without charts - will be updated when user interacts)
    const amount = parseFloat(sipAmount.value) || 0;
    const period = parseFloat(sipPeriod.value) || 0;
    const rate = parseFloat(sipRate.value) || 0;
    
    if (amount > 0 && period > 0 && rate > 0) {
        const months = period * 12;
        const monthlyRate = rate / 100 / 12;
        const futureValue = amount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
        const invested = amount * months;
        const returns = futureValue - invested;
        
        document.getElementById('sip-invested').textContent = formatCurrencyOrInfinity(invested);
        document.getElementById('sip-returns').textContent = formatCurrencyOrInfinity(returns);
        document.getElementById('sip-total').textContent = formatCurrencyOrInfinity(futureValue);
    }
}
