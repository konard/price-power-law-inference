# Gold Price Power-Law Analysis

A browser-based web application that displays the full historical price of **Gold (XAU/USD)** using the **TradingView Lightweight Charts** library, and computes/visualizes support curves using multiple curve-fitting strategies including **Power-Law Regression**.

**[Live Demo](https://konard.github.io/price-power-law-inference/)** (when deployed to GitHub Pages)

## Features

- **Real Historical Gold Price Data**: Weekly OHLC data from Yahoo Finance (2000-2025)
- **Interactive Candlestick Chart**: Built with TradingView Lightweight Charts v4+
- **Multiple Curve-Fitting Strategies**:
  - Power-Law Regression (default)
  - Exponential Regression
  - Polynomial Regression (degree 2-5)
  - Logarithmic Regression
  - Geometric Mean Envelope
  - Percentile-Based Support
- **Real-time Strategy Switching**: Change strategies without reloading the page
- **Configurable Parameters**:
  - Number of support points (5-50)
  - Polynomial degree (2-5)
  - Percentile value (1%-10%)
  - Rolling window size (12-156 weeks)
- **Statistics Panel**: Current price, support level, deviation, R² goodness of fit
- **Fully Client-Side**: No backend required, works on GitHub Pages

## Quick Start

### Option 1: Open directly in browser
Simply open `index.html` in a modern web browser. Note: Due to CORS restrictions, you'll need to serve the files from a local server.

### Option 2: Local development server
```bash
# Using Python
python3 -m http.server 3000

# Or using Node.js
npx serve

# Or using bun
bun --bun serve
```

Then navigate to `http://localhost:3000`

## Project Structure

```
/
├── index.html          # Main HTML container
├── script.js           # React app with curve fitting algorithms
├── styles.css          # Styling
├── gold-data.json      # Real historical gold price data (2000-2025)
├── README.md           # This file
└── experiments/        # Data download and analysis scripts
    ├── download_gold_data.py    # Download real data from Yahoo Finance
    └── generate_gold_data.py    # Legacy script for synthetic data (deprecated)
```

## Curve-Fitting Strategies

### Power-Law Regression (Default)
Model: `y = A * x^B`

Fits a power-law curve to the selected support points. Inspired by long-term growth patterns in commodities. Uses log-log transformation for linear regression.

### Exponential Regression
Model: `y = A * exp(B * x)`

Fits an exponential growth curve. Useful for modeling compound growth scenarios.

### Polynomial Regression
Model: `y = a_n*x^n + ... + a_1*x + a_0`

Fits a polynomial curve of configurable degree (2-5). Higher degrees provide better fit but may overfit or extrapolate poorly.

### Logarithmic Regression
Model: `y = a + b * ln(x)`

Fits a logarithmic curve. Useful when early price behavior dominates and growth slows over time.

### Geometric Mean Envelope
Computes a rolling geometric mean of lows with a multiplier to create a smooth support envelope. Adapts to local price movements.

### Percentile-Based Support
Computes rolling percentile of lows (default 3%) to create a robust support floor. Handles outliers well and tracks the lower boundary of price movement.

## Configuration

The `CONFIG` object in `script.js` allows customization:

```javascript
const CONFIG = {
    supportPoints: 15,        // Number of lowest support points to use
    dataSource: "local",      // "local" for JSON file, "yahoo" for live API
    curveStrategy: "powerlaw", // Default strategy
    polynomialDegree: 2,      // Degree for polynomial regression
    percentileValue: 0.03,    // 3% percentile for envelope
    rollingWindow: 52         // Window size for rolling calculations
};
```

## Downloading Real Data

The included `gold-data.json` file contains real historical gold price data from Yahoo Finance. To update or re-download the data:

```bash
# Install required dependencies
pip install yfinance pandas

# Run the download script
python experiments/download_gold_data.py
```

This will download weekly OHLC data from Yahoo Finance and save it to `gold-data.json`.

## Data Format

The `gold-data.json` file contains real OHLC data in the following format:

```json
[
  { "time": "YYYY-MM-DD", "open": X, "high": X, "low": X, "close": X },
  ...
]
```

## Technical Implementation

### Support Low Detection
Swing lows are detected using the condition:
```
low[i] < low[i-1] AND low[i] < low[i+1]
```

### N-Point Selection
From all detected swing lows, the N lowest values are selected for curve fitting.

### Libraries Used
- **React 18** (via CDN)
- **TradingView Lightweight Charts v4.1** (via CDN)
- **Babel** (for JSX transformation in browser)

## License

This project is released into the public domain under the [Unlicense](LICENSE).

## References

- [Power Law - Wikipedia](https://en.wikipedia.org/wiki/Power_law)
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/)
- [Yahoo Finance](https://finance.yahoo.com/) - Data source for historical gold prices
- [yfinance Python Library](https://github.com/ranaroussi/yfinance) - Used for downloading market data
