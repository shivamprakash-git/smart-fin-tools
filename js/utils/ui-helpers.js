// UI helper functions for common interface elements
import { 
    isStorageAvailable, 
    getStorageItem, 
    setStorageItem 
} from './storage-manager.js';

// Smooth scroll to top for home links
export function setupHomeLinks() {
    const homeLinks = [
        document.getElementById('home-link'),
        document.getElementById('footer-home-link')
    ];

    homeLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                // Update URL without adding to history
                history.pushState(null, null, ' ');
            });
        }
    });
}

// Mobile menu toggle
export function setupMobileMenu() {
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
        link.addEventListener('click', (e) => {
            // Special handling for home link to match desktop behavior
            if (link.getAttribute('href') === '#home') {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                // Update URL without adding to history
                history.pushState(null, null, ' ');
            }
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

// Global slider enable/disable toggle (off by default)
export function setupSliderGlobalToggle() {
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
        
        // Save slider preference
        const saved = setStorageItem('sliders-enabled', enabled ? '1' : '0');
        if (!saved) {
            console.log('Slider preference not saved (storage unavailable)');
        }
    };

    // Get initial state from storage
    const saved = getStorageItem('sliders-enabled', '0');
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
export function setupTabSwitching() {
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

            // Trigger recalculation for the selected calculator via custom event
            const recalcEvent = new CustomEvent('calculator-tab-changed', { 
                detail: { tabName, calculatorId: `${tabName}-calculator` } 
            });
            document.dispatchEvent(recalcEvent);
        });
    });
}
