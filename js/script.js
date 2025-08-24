// Main application script - SmartFinTools
// This file contains the base app logic and initialization

// Import all modules
import { 
    getPreferredTheme, 
    applyTheme, 
    setupThemeToggle, 
    initializeTheme 
} from './utils/theme-manager.js';

import { 
    setupMobileMenu, 
    setupHomeLinks, 
    setupSliderGlobalToggle, 
    setupTabSwitching 
} from './utils/ui-helpers.js';

import { setupInputFocusScroll } from './utils/mobile-input-helper.js';
import { initializeStorage } from './utils/storage-manager.js';

import { setupSIPCalculator } from './calculators/sip-calculator.js';
import { setupLumpsumCalculator } from './calculators/lumpsum-calculator.js';
import { setupGSTCalculator } from './calculators/gst-calculator.js';
import { setupEMICalculator } from './calculators/emi-calculator.js';

// Initialize all calculators
function initializeApp() {
    // Hide any error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    try {
        // Initialize storage first
        initializeStorage();
        
        // Initialize theme
        initializeTheme();
        applyTheme(getPreferredTheme());
        setupThemeToggle();
        
        // Setup all components
        setupMobileMenu();
        setupSIPCalculator();
        setupLumpsumCalculator();
        setupGSTCalculator();
        setupEMICalculator();
        setupHomeLinks();
        setupSliderGlobalToggle();
        setupInputFocusScroll();
        setupTabSwitching();

        // Listen for tab changes and trigger calculation with charts for the selected tab
        document.addEventListener('calculator-tab-changed', (event) => {
            const { tabName } = event.detail;
            // Trigger calculation for the newly selected tab to update charts
            switch(tabName) {
                case 'sip':
                    // Trigger SIP calculation to update charts
                    const sipAmount = document.getElementById('sip-amount');
                    const sipPeriod = document.getElementById('sip-period');
                    const sipRate = document.getElementById('sip-rate');
                    if (sipAmount && sipPeriod && sipRate) {
                        // Simulate input event to trigger calculation with charts
                        sipAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'lumpsum':
                    // Trigger lumpsum calculation to update charts
                    const lumpsumAmount = document.getElementById('lumpsum-amount');
                    const lumpsumPeriod = document.getElementById('lumpsum-period');
                    const lumpsumRate = document.getElementById('lumpsum-rate');
                    if (lumpsumAmount && lumpsumPeriod && lumpsumRate) {
                        lumpsumAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'gst':
                    // Trigger GST calculation to update charts
                    const gstAmount = document.getElementById('gst-amount');
                    const gstRateInput = document.getElementById('gst-rate');
                    if (gstAmount && gstRateInput) {
                        gstAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'emi':
                    // Trigger EMI calculation to update charts
                    const emiAmount = document.getElementById('emi-amount');
                    const emiRate = document.getElementById('emi-rate');
                    const emiTenure = document.getElementById('emi-tenure');
                    if (emiAmount && emiRate && emiTenure) {
                        emiAmount.dispatchEvent(new Event('input'));
                    }
                    break;
            }
        });

        // Ensure initial charts reflect the active tab's values
        const activeBtn = document.querySelector('.tab-btn[aria-selected="true"]');
        if (activeBtn) {
            const tabName = activeBtn.getAttribute('data-tab');
            // Trigger initial calculation for the active tab to show correct charts
            switch(tabName) {
                case 'sip':
                    const sipAmount = document.getElementById('sip-amount');
                    const sipPeriod = document.getElementById('sip-period');
                    const sipRate = document.getElementById('sip-rate');
                    if (sipAmount && sipPeriod && sipRate) {
                        sipAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'lumpsum':
                    const lumpsumAmount = document.getElementById('lumpsum-amount');
                    const lumpsumPeriod = document.getElementById('lumpsum-period');
                    const lumpsumRate = document.getElementById('lumpsum-rate');
                    if (lumpsumAmount && lumpsumPeriod && lumpsumRate) {
                        lumpsumAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'gst':
                    const gstAmount = document.getElementById('gst-amount');
                    const gstRateInput = document.getElementById('gst-rate');
                    if (gstAmount && gstRateInput) {
                        gstAmount.dispatchEvent(new Event('input'));
                    }
                    break;
                case 'emi':
                    const emiAmount = document.getElementById('emi-amount');
                    const emiRate = document.getElementById('emi-rate');
                    const emiTenure = document.getElementById('emi-tenure');
                    if (emiAmount && emiRate && emiTenure) {
                        emiAmount.dispatchEvent(new Event('input'));
                    }
                    break;
            }
        }
        
        // Show the app content and hide loading indicator
        const loadingIndicator = document.getElementById('loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        document.body.classList.remove('opacity-0');
        document.body.style.visibility = 'visible';
        
        // Force a reflow to ensure transitions work
        document.body.offsetHeight;
        
    } catch (error) {
        console.error('Error initializing app:', error);
        
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message fixed top-0 left-0 right-0 bg-red-100 border-b border-red-500 text-red-700 p-4 z-50';
        errorDiv.innerHTML = `
            <div class="container mx-auto flex justify-between items-center">
                <div>
                    <p class="font-bold">Error Loading Application</p>
                    <p>Some features may not work as expected. ${error.message || 'Please refresh the page.'}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-red-700 hover:text-red-900">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.prepend(errorDiv);
        
        // Still show the app content even if there was an error
        document.body.classList.remove('opacity-0');
        document.body.style.visibility = 'visible';
    }
}

// Start the app when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}