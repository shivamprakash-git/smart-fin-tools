# SmartFinTools - Financial Calculators

A modern, responsive web application providing essential financial calculators with beautiful charts and intuitive user interface.

## 🚀 Features

- **SIP Calculator**: Calculate Systematic Investment Plan returns with compound interest
- **Lumpsum Calculator**: Determine future value of one-time investments
- **GST Calculator**: Add or remove GST from amounts with preset rates
- **EMI Calculator**: Calculate Equated Monthly Installments for loans
- **Interactive Charts**: Visual representation of investment growth and breakdowns
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Mobile Optimized**: Responsive design with mobile-specific input handling
- **PWA Ready**: Progressive Web App capabilities with service worker

## 🏗️ Project Structure

The project has been refactored into a modular architecture for better maintainability and code organization:

```
smart-fin-tools/
├── css/
│   ├── style.css              # Custom styles and animations
│   ├── tailwind.css           # Tailwind CSS source
│   └── tailwind.build.css     # Compiled Tailwind CSS
├── images/
│   ├── calculator.png         # Main calculator icon
│   └── icons/                 # PWA icons (16x16 to 512x512)
├── js/
│   ├── calculators/           # Calculator logic modules
│   │   ├── sip-calculator.js      # SIP investment calculations
│   │   ├── lumpsum-calculator.js  # Lumpsum investment calculations
│   │   ├── gst-calculator.js      # GST tax calculations
│   │   └── emi-calculator.js      # EMI loan calculations
│   ├── utils/                 # Utility and helper modules
│   │   ├── formatters.js          # Currency and number formatting
│   │   ├── charts.js              # Chart.js integration and management
│   │   ├── theme-manager.js       # Theme switching and localStorage
│   │   ├── ui-helpers.js          # Common UI components
│   │   └── mobile-input-helper.js # Mobile input focus management
│   ├── script.js              # Main application entry point
│   └── widget.js              # TradingView widget integration
├── index.html                 # Main HTML file
├── manifest.webmanifest       # PWA manifest
├── sw.js                     # Service worker
├── package.json              # Project dependencies
└── README.md                 # This file
```

## 🔧 Technical Architecture

### Module System
- **ES6 Modules**: Uses modern JavaScript modules for better code organization
- **Separation of Concerns**: Each calculator has its own module with focused functionality
- **Import/Export**: Clean dependency management between modules

### Core Components

#### 1. **Main Application (`script.js`)**
- Application initialization and lifecycle management
- Module imports and setup coordination
- Error handling and loading states

#### 2. **Calculator Modules (`js/calculators/`)**
- **SIP Calculator**: Compound interest calculations with yearly breakdowns
- **Lumpsum Calculator**: Simple interest growth over time
- **GST Calculator**: Tax calculations with add/remove functionality
- **EMI Calculator**: Loan payment calculations with principal/interest breakdown

#### 3. **Utility Modules (`js/utils/`)**
- **Formatters**: Currency formatting, number validation, slider helpers
- **Charts**: Chart.js integration with responsive design
- **Theme Manager**: Dark/light theme switching with localStorage
- **UI Helpers**: Mobile menu, tab switching, slider toggles
- **Mobile Input Helper**: Advanced mobile input focus management

#### 4. **Charts System**
- **Line Charts**: Investment growth over time visualization
- **Pie Charts**: Investment breakdown (principal vs returns)
- **Responsive Design**: Adapts to different screen sizes
- **Interactive Tooltips**: Formatted currency values with Indian numbering system

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach with progressive enhancement
- Tailwind CSS for consistent styling
- Smooth animations and transitions
- Touch-friendly controls for mobile devices

### Theme System
- Automatic theme detection based on system preference
- Manual theme toggle with localStorage persistence
- Smooth transitions between themes
- Consistent color scheme across components

### Mobile Optimization
- Advanced input focus management
- Keyboard-aware scrolling
- Touch gesture handling
- Visual viewport adaptation

## 📱 PWA Features

- **Service Worker**: Offline functionality and caching
- **Web App Manifest**: Installable as native app
- **Responsive Icons**: Multiple sizes for different devices
- **Theme Color**: Consistent branding across platforms

## 🚀 Getting Started

### Prerequisites
- Modern web browser with ES6 module support
- Node.js (for development and CSS building)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/smart-fin-tools.git
   cd smart-fin-tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build CSS (development):
   ```bash
   npm run dev:css
   ```

4. Build CSS (production):
   ```bash
   npm run build:css
   ```

5. Open `index.html` in your browser or serve locally

### Development
- **CSS Development**: `npm run dev:css` (watches for changes)
- **CSS Production**: `npm run build:css` (minified output)
- **File Structure**: Follow the modular architecture for new features

## 🔍 Calculator Details

### SIP Calculator
- **Inputs**: Monthly amount, investment period, expected return rate
- **Outputs**: Total invested, total returns, maturity value
- **Charts**: Yearly growth visualization with invested vs returns

### Lumpsum Calculator
- **Inputs**: Initial amount, investment period, expected return rate
- **Outputs**: Initial investment, total returns, maturity value
- **Charts**: Compound growth over time

### GST Calculator
- **Inputs**: Amount, GST rate (5%, 12%, 18%, 28%)
- **Modes**: Add GST or Remove GST
- **Outputs**: Base amount, GST amount, total amount
- **Charts**: Base vs GST breakdown

### EMI Calculator
- **Inputs**: Loan amount, interest rate, loan tenure
- **Outputs**: Monthly EMI, total interest, total payment
- **Charts**: Principal vs interest breakdown

## 🎯 Key Features

### Advanced Slider System
- Exponential mapping for large monetary ranges
- Smooth control with 1000+ discrete positions
- Early step ladder for precise small amounts
- Real-time input synchronization

### Smart Input Validation
- Live clamping during typing
- Final validation on blur
- Range-aware input handling
- User-friendly error prevention

### Chart Integration
- Dynamic chart type switching
- Responsive chart sizing
- Indian numbering system support
- Interactive tooltips with formatted values

## 🌐 Browser Support

- **Modern Browsers**: Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+
- **ES6 Modules**: Required for core functionality
- **Chart.js**: 4.x version for advanced charting
- **Mobile**: iOS Safari 10.3+, Chrome Mobile 61+

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the existing code structure and modular architecture
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📞 Contact

- **Developer**: Shivam Prakash
- **Email**: shivam.prakash@duck.com
- **Project**: [SmartFinTools Repository](https://github.com/yourusername/smart-fin-tools)

## 🔄 Recent Updates

### Version 2.0.0 - Modular Refactoring
- **Code Organization**: Separated calculator logic into individual modules
- **Utility Functions**: Created dedicated utility modules for common functionality
- **Chart Management**: Centralized chart functionality in dedicated module
- **Theme System**: Modularized theme management and localStorage handling
- **Mobile Support**: Enhanced mobile input handling in separate module
- **ES6 Modules**: Modern JavaScript module system implementation
- **Maintainability**: Improved code structure for easier maintenance and updates

### Benefits of Refactoring
- **Modularity**: Each calculator is self-contained and easily maintainable
- **Reusability**: Utility functions can be shared across calculators
- **Scalability**: Easy to add new calculators following the same pattern
- **Testing**: Individual modules can be tested independently
- **Performance**: Better tree-shaking and code splitting potential
- **Developer Experience**: Clearer code organization and easier debugging

---

**SmartFinTools** - Making financial calculations simple, beautiful, and accessible.
