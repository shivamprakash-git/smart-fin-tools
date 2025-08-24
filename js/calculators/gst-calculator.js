// GST Calculator functionality
import { 
    formatCurrencyOrInfinity, 
    clampInputIfOutOfRange, 
    validateNumberInput
} from '../utils/formatters.js';
import { updateCharts } from '../utils/charts.js';

export function setupGSTCalculator() {
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
    calculateGST();
}
