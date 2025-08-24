// EMI Calculator functionality
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

export function setupEMICalculator() {
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
        emiTenureRange.value = (v == null) ? emiTenureRange.min : emiRate.value;
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
    calculateEMI();
}
