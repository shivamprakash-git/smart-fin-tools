// TradingView News Widget Initialization
function initializeTradingViewNews() {
    // Create widget container
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.innerHTML = `
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com/news-flow/?priority=top_stories" rel="noopener nofollow" target="_blank">
                <span class="blue-text">Top stories by TradingView</span>
            </a>
        </div>
    `;

    // Create and append script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    // Check for dark mode preference
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    script.text = JSON.stringify({
        "displayMode": "regular",
        "feedMode": "all_symbols",
        "colorTheme": isDarkMode ? "dark" : "light",
        "isTransparent": true,
        "locale": "in",
        "width": "100%",
        "height": "100%"
    });
    
    container.appendChild(script);
    return container;
}

// Initialize TradingView Technical Analysis Widget
function initializeTradingViewTechnical() {
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';
    container.style.overflow = 'hidden';
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.margin = '0';
    widgetContainer.style.padding = '0';
    
    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    copyright.innerHTML = '<a href="https://www.tradingview.com/symbols/NSE-NIFTY/technicals/?exchange=NSE" rel="noopener nofollow" target="_blank"><span class="blue-text">Technical analysis for NIFTY by TradingView</span></a>';
    
    // Check for dark mode preference
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.text = JSON.stringify({
        "colorTheme": isDarkMode ? "dark" : "light",
        "displayMode": "single",
        "isTransparent": true,
        "locale": "in",
        "interval": "1D",
        "disableInterval": false,
        "width": "100%",
        "height": "100%",
        "symbol": "NSE:NIFTY",
        "showIntervalTabs": true
    });
    
    container.appendChild(widgetContainer);
    container.appendChild(copyright);
    container.appendChild(script);
    
    return container;
}

// TradingView Ticker Widget Initialization
function initializeTradingViewTicker() {
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.innerHTML = `
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://in.tradingview.com/" rel="noopener nofollow" target="_blank">
                <span class="blue-text">Track all markets on TradingView</span>
            </a>
        </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    script.text = JSON.stringify({
        "symbols": [
            {"proName": "BSE:SENSEX", "title": "BSE SENSEX (₹)"},
            {"proName": "TVC:USOIL", "title": "US Crude Oil ($)"},
            {"proName": "TVC:GOLD", "title": "US Gold ($)"},
            {"proName": "FX_IDC:USDINR", "title": "US Dollar to INR (₹)"},
            {"proName": "FX_IDC:EURINR", "title": "Euro to INR (₹)"},
            {"proName": "FX_IDC:GBPINR", "title": "British Pound to INR (₹)"},
            {"proName": "FX_IDC:AEDINR", "title": "UAE Dirham to INR (₹)"}
        ],
        "colorTheme": isDarkMode ? "dark" : "light",
        "isTransparent": true,
        "showSymbolLogo": true,
        "locale": "in",
        "largeChartUrl": "",
        "displayMode": "regular"
    });

    container.appendChild(script);
    return container;
}

function initializeWidgets() {
    // Initialize Ticker Widget
    const tickerContainer = document.getElementById('tradingview-ticker-widget');
    if (tickerContainer) {
        const tickerWidget = initializeTradingViewTicker();
        tickerContainer.innerHTML = '';
        tickerContainer.appendChild(tickerWidget);
    }
    
    // Initialize News Widget
    const newsContainer = document.getElementById('tradingview-news-widget');
    if (newsContainer) {
        const widget = initializeTradingViewNews();
        newsContainer.innerHTML = '';
        newsContainer.appendChild(widget);
    }
    
    // Initialize Technical Analysis Widget
    const technicalWidgetContainer = document.getElementById('tradingview-technical-widget');
    if (technicalWidgetContainer) {
        const widget = initializeTradingViewTechnical();
        technicalWidgetContainer.innerHTML = '';
        technicalWidgetContainer.appendChild(widget);
    }
}

// Track current theme
let currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

// Initialize widgets when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeWidgets);

// Reinitialize widgets when the theme changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
            const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            
            // Only reinitialize if theme actually changed
            if (newTheme !== currentTheme) {
                currentTheme = newTheme;
                
                // Debounce to prevent multiple rapid reinitializations
                clearTimeout(window.themeChangeTimeout);
                window.themeChangeTimeout = setTimeout(() => {
                    initializeWidgets();
                }, 150); // Slightly longer delay for better reliability
            }
        }
    });
});

// Start observing the document element for theme changes
observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    observer.disconnect();
    clearTimeout(window.themeChangeTimeout);
});
