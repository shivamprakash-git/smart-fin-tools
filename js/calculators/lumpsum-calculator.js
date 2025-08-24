// Lumpsum Calculator functionality
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

export function setupLumpsumCalculator() {
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
    calculateLumpsum();
}
