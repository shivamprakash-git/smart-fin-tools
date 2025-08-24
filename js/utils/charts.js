// Chart functionality for financial calculators
import { formatCurrencyCompact, formatIndianCompact } from './formatters.js';

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

export function updateCharts({ labels, investedSeries, returnsSeries, lineLabels, lineVisibility, pieLabels, pieData, pieColors, ui, chartType }) {
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

// Export chart instances for external access if needed
export { lineChart, pieChart };
