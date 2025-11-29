# Gold Price Power-Law Analysis

A browser-based web application that displays the full historical price of **Gold (XAU/USD)** using the **TradingView Lightweight Charts** library, and computes/visualizes support curves using multiple curve-fitting strategies including **Power-Law Regression**.

**[Live Demo](https://konard.github.io/price-power-law-inference/)** (when deployed to GitHub Pages)

## Features

- **Real Historical Gold Price Data**: 768 years of data from Free Gold API (1258-2025)
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
├── gold-data.json      # Real historical gold price data (1258-2025, 1,711 data points)
├── README.md           # This file
└── experiments/        # Data download and analysis scripts
    ├── download_gold_data_freegoldapi.py  # Download historical data from Free Gold API (768 years)
    ├── download_gold_data.py              # Download data from Yahoo Finance (2000-2025)
    └── generate_gold_data.py              # Legacy script for synthetic data (deprecated)
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

The included `gold-data.json` file contains 768 years of historical gold price data from Free Gold API (1258-2025). To update or re-download the data:

### Option 1: Free Gold API (Longest Historical Data - Recommended)

```bash
# No dependencies required - uses curl
python experiments/download_gold_data_freegoldapi.py
```

This will download 1,711+ data points spanning from 1258 to 2025, sourced from:
- Yahoo Finance (daily prices, 2000+)
- World Bank (monthly prices)
- MeasuringWorth London & British (annual historical prices back to 1258)

**Data Coverage**: 1258-2025 (768 years)
**Source**: [Free Gold API](https://freegoldapi.com/)

### Option 2: Yahoo Finance (Recent Data Only)

```bash
# Install required dependencies
pip install yfinance pandas

# Run the download script
python experiments/download_gold_data.py
```

This will download weekly OHLC data from Yahoo Finance (2000-2025 only).

## Data Format

The `gold-data.json` file contains historical gold price data in OHLC format:

```json
[
  { "time": "YYYY-MM-DD", "open": X, "high": X, "low": X, "close": X },
  ...
]
```

**Note**: For historical data from Free Gold API (pre-2000), only single price points are available, so open, high, low, and close values are all set to the same price. This is a standard practice for historical datasets that only include closing prices.

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
- [Free Gold API](https://freegoldapi.com/) - Primary data source for historical gold prices (1258-2025)
- [Yahoo Finance](https://finance.yahoo.com/) - Alternative data source for recent gold prices
- [yfinance Python Library](https://github.com/ranaroussi/yfinance) - Used for downloading Yahoo Finance data
