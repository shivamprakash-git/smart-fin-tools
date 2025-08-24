// Theme management functionality
import { 
    isStorageAvailable, 
    getStorageItem, 
    setStorageItem 
} from './storage-manager.js';

// Check if theme was already set by the inline script
const themeAlreadySet = document.documentElement.getAttribute('data-theme-initialized') === 'true';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Get theme preference with fallback to OS preference
export function getPreferredTheme() {
    if (isStorageAvailable()) {
        const savedTheme = getStorageItem('theme');
        if (savedTheme) return savedTheme;
    }
    return prefersDark ? 'dark' : 'light';
}

// Apply theme
export function applyTheme(theme) {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
}

// Update theme icon
export function updateThemeIcon(isDark) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

// Setup theme toggle functionality
export function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    if (!themeToggle) return;
    
    // Set initial icon based on current theme
    updateThemeIcon(htmlElement.classList.contains('dark'));
    
    themeToggle.addEventListener('click', () => {
        const isDark = htmlElement.classList.toggle('dark');
        const theme = isDark ? 'dark' : 'light';
        
        // Try to save theme preference
        const saved = setStorageItem('theme', theme);
        if (!saved) {
            console.log('Theme preference not saved (storage unavailable)');
        }
        
        // Update icon
        updateThemeIcon(isDark);
    });
}

// Initialize theme if not already set by inline script
export function initializeTheme() {
    if (!themeAlreadySet) {
        applyTheme(getPreferredTheme());
    }
}
