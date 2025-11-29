// Configuration object
const CONFIG = {
    supportPoints: 15,           // N lowest support points
    dataSource: "local",         // or "yahoo"
    curveStrategy: "powerlaw",   // default method
    polynomialDegree: 2,         // only for polynomial mode
    percentileValue: 0.03,       // 3% percentile for envelope
    rollingWindow: 52            // rolling window size for geometric mean and percentile
};

// ============================================================================
// CURVE FITTING ALGORITHMS
// ============================================================================

/**
 * Detect swing lows in price data
 * A swing low occurs when: low[i] < low[i-1] AND low[i] < low[i+1]
 */
function detectSwingLows(data) {
    const swingLows = [];
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i].low < data[i - 1].low && data[i].low < data[i + 1].low) {
            swingLows.push({
                index: i,
                time: data[i].time,
                low: data[i].low
            });
        }
    }
    return swingLows;
}

/**
 * Select the N lowest support points from swing lows
 */
function selectLowestSupportPoints(swingLows, n) {
    const sorted = [...swingLows].sort((a, b) => a.low - b.low);
    return sorted.slice(0, n).sort((a, b) => a.index - b.index);
}

/**
 * Linear regression helper
 * Returns { slope, intercept, r2 }
 */
function linearRegression(xValues, yValues) {
    const n = xValues.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += xValues[i];
        sumY += yValues[i];
        sumXY += xValues[i] * yValues[i];
        sumX2 += xValues[i] * xValues[i];
        sumY2 += yValues[i] * yValues[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
        const yPred = slope * xValues[i] + intercept;
        ssTot += (yValues[i] - yMean) ** 2;
        ssRes += (yValues[i] - yPred) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
}

/**
 * Strategy A: Power-Law Regression
 * Model: y = A * x^B
 * Linearized: ln(y) = ln(A) + B * ln(x)
 */
function powerLawRegression(supportPoints, allData) {
    // Convert x to days since start (avoiding log(0))
    const startTime = new Date(allData[0].time).getTime();

    const xValues = supportPoints.map(p => {
        const days = (new Date(p.time).getTime() - startTime) / (1000 * 60 * 60 * 24) + 1;
        return Math.log(days);
    });
    const yValues = supportPoints.map(p => Math.log(p.low));

    const { slope: B, intercept: lnA, r2 } = linearRegression(xValues, yValues);
    const A = Math.exp(lnA);

    // Generate curve for all data points
    const curve = allData.map(d => {
        const days = (new Date(d.time).getTime() - startTime) / (1000 * 60 * 60 * 24) + 1;
        return {
            time: d.time,
            value: A * Math.pow(days, B)
        };
    });

    return { curve, params: { A, B }, r2, name: 'Power-Law' };
}

/**
 * Strategy B: Exponential Regression
 * Model: y = A * exp(B * x)
 * Linearized: ln(y) = ln(A) + B * x
 */
function exponentialRegression(supportPoints, allData) {
    const startTime = new Date(allData[0].time).getTime();

    const xValues = supportPoints.map(p => {
        return (new Date(p.time).getTime() - startTime) / (1000 * 60 * 60 * 24);
    });
    const yValues = supportPoints.map(p => Math.log(p.low));

    const { slope: B, intercept: lnA, r2 } = linearRegression(xValues, yValues);
    const A = Math.exp(lnA);

    const curve = allData.map(d => {
        const days = (new Date(d.time).getTime() - startTime) / (1000 * 60 * 60 * 24);
        return {
            time: d.time,
            value: A * Math.exp(B * days)
        };
    });

    return { curve, params: { A, B }, r2, name: 'Exponential' };
}

/**
 * Strategy C: Polynomial Regression (degree n)
 * Model: y = a_n*x^n + ... + a_1*x + a_0
 * Uses normal equations: (X^T * X) * coeffs = X^T * y
 */
function polynomialRegression(supportPoints, allData, degree = 2) {
    const startTime = new Date(allData[0].time).getTime();
    const maxDays = (new Date(allData[allData.length - 1].time).getTime() - startTime) / (1000 * 60 * 60 * 24);

    // Normalize x to [0, 1] for numerical stability
    const xValues = supportPoints.map(p => {
        const days = (new Date(p.time).getTime() - startTime) / (1000 * 60 * 60 * 24);
        return days / maxDays;
    });
    const yValues = supportPoints.map(p => p.low);

    // Build Vandermonde matrix
    const n = xValues.length;
    const X = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j <= degree; j++) {
            row.push(Math.pow(xValues[i], j));
        }
        X.push(row);
    }

    // Solve using normal equations with simple Gaussian elimination
    const coeffs = solveNormalEquations(X, yValues, degree + 1);

    // Generate curve
    const curve = allData.map(d => {
        const days = (new Date(d.time).getTime() - startTime) / (1000 * 60 * 60 * 24);
        const x = days / maxDays;
        let value = 0;
        for (let j = 0; j <= degree; j++) {
            value += coeffs[j] * Math.pow(x, j);
        }
        return { time: d.time, value: Math.max(value, 0) };
    });

    // Calculate R²
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
        let yPred = 0;
        for (let j = 0; j <= degree; j++) {
            yPred += coeffs[j] * Math.pow(xValues[i], j);
        }
        ssTot += (yValues[i] - yMean) ** 2;
        ssRes += (yValues[i] - yPred) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { curve, params: { coefficients: coeffs }, r2, name: `Polynomial (degree ${degree})` };
}

/**
 * Solve normal equations (X^T * X) * coeffs = X^T * y
 * Using simple Gaussian elimination with partial pivoting
 */
function solveNormalEquations(X, y, numCoeffs) {
    const n = X.length;

    // Build X^T * X
    const XtX = [];
    for (let i = 0; i < numCoeffs; i++) {
        XtX.push([]);
        for (let j = 0; j < numCoeffs; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += X[k][i] * X[k][j];
            }
            XtX[i].push(sum);
        }
    }

    // Build X^T * y
    const Xty = [];
    for (let i = 0; i < numCoeffs; i++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
            sum += X[k][i] * y[k];
        }
        Xty.push(sum);
    }

    // Solve using Gaussian elimination
    return gaussianElimination(XtX, Xty);
}

/**
 * Gaussian elimination with partial pivoting
 */
function gaussianElimination(A, b) {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
        // Partial pivoting
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        // Eliminate
        for (let row = col + 1; row < n; row++) {
            if (aug[col][col] !== 0) {
                const factor = aug[row][col] / aug[col][col];
                for (let j = col; j <= n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= aug[i][j] * x[j];
        }
        x[i] = aug[i][i] !== 0 ? sum / aug[i][i] : 0;
    }

    return x;
}

/**
 * Strategy D: Logarithmic Regression
 * Model: y = a + b * ln(x)
 */
function logarithmicRegression(supportPoints, allData) {
    const startTime = new Date(allData[0].time).getTime();

    const xValues = supportPoints.map(p => {
        const days = (new Date(p.time).getTime() - startTime) / (1000 * 60 * 60 * 24) + 1;
        return Math.log(days);
    });
    const yValues = supportPoints.map(p => p.low);

    const { slope: b, intercept: a, r2 } = linearRegression(xValues, yValues);

    const curve = allData.map(d => {
        const days = (new Date(d.time).getTime() - startTime) / (1000 * 60 * 60 * 24) + 1;
        return {
            time: d.time,
            value: a + b * Math.log(days)
        };
    });

    return { curve, params: { a, b }, r2, name: 'Logarithmic' };
}

/**
 * Strategy E: Geometric Mean Envelope
 * Computes rolling geometric mean of lows with a multiplier
 */
function geometricMeanEnvelope(allData, windowSize = 52) {
    const lows = allData.map(d => d.low);
    const curve = [];

    for (let i = 0; i < allData.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowLows = lows.slice(start, i + 1);

        // Geometric mean = exp(mean(ln(values)))
        const logSum = windowLows.reduce((sum, val) => sum + Math.log(val), 0);
        const geometricMean = Math.exp(logSum / windowLows.length);

        // Apply a multiplier to create support envelope (below geometric mean)
        const supportLevel = geometricMean * 0.85;

        curve.push({
            time: allData[i].time,
            value: supportLevel
        });
    }

    return { curve, params: { windowSize, multiplier: 0.85 }, r2: null, name: 'Geometric Mean Envelope' };
}

/**
 * Strategy F: Lower Percentile Curve
 * Computes rolling percentile to create robust support floor
 */
function percentileCurve(allData, percentile = 0.03, windowSize = 52) {
    const lows = allData.map(d => d.low);
    const curve = [];

    for (let i = 0; i < allData.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowLows = [...lows.slice(start, i + 1)].sort((a, b) => a - b);

        // Get the percentile value
        const percentileIndex = Math.floor(windowLows.length * percentile);
        const percentileValue = windowLows[Math.max(0, percentileIndex)];

        curve.push({
            time: allData[i].time,
            value: percentileValue
        });
    }

    return { curve, params: { percentile, windowSize }, r2: null, name: `Percentile (${(percentile * 100).toFixed(0)}%)` };
}

/**
 * Main curve fitting function - dispatches to appropriate strategy
 */
function fitCurve(strategy, supportPoints, allData, config) {
    switch (strategy) {
        case 'powerlaw':
            return powerLawRegression(supportPoints, allData);
        case 'exponential':
            return exponentialRegression(supportPoints, allData);
        case 'polynomial':
            return polynomialRegression(supportPoints, allData, config.polynomialDegree);
        case 'logarithmic':
            return logarithmicRegression(supportPoints, allData);
        case 'geometric':
            return geometricMeanEnvelope(allData, config.rollingWindow);
        case 'percentile':
            return percentileCurve(allData, config.percentileValue, config.rollingWindow);
        default:
            return powerLawRegression(supportPoints, allData);
    }
}

// ============================================================================
// REACT COMPONENTS
// ============================================================================

const { useState, useEffect, useRef, useCallback } = React;

/**
 * Main App Component
 */
function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState({ ...CONFIG });
    const [curveResult, setCurveResult] = useState(null);
    const [supportPoints, setSupportPoints] = useState([]);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    // Recalculate when config or data changes
    useEffect(() => {
        if (data) {
            calculateCurve();
        }
    }, [data, config]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            let goldData;
            if (config.dataSource === 'local') {
                const response = await fetch('gold-data.json');
                if (!response.ok) throw new Error('Failed to load gold-data.json');
                goldData = await response.json();
            } else {
                // Yahoo Finance API
                const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=1d&range=max');
                if (!response.ok) throw new Error('Failed to fetch from Yahoo Finance');
                const json = await response.json();
                goldData = parseYahooData(json);
            }

            setData(goldData);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const parseYahooData = (json) => {
        const result = json.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        return timestamps.map((t, i) => ({
            time: new Date(t * 1000).toISOString().split('T')[0],
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i]
        })).filter(d => d.open && d.high && d.low && d.close);
    };

    const calculateCurve = () => {
        const swingLows = detectSwingLows(data);
        const selectedPoints = selectLowestSupportPoints(swingLows, config.supportPoints);
        setSupportPoints(selectedPoints);

        if (selectedPoints.length > 0) {
            const result = fitCurve(config.curveStrategy, selectedPoints, data, config);
            setCurveResult(result);
        }
    };

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return React.createElement('div', { className: 'app-container' },
            React.createElement('div', { className: 'loading' }, 'Loading gold price data...')
        );
    }

    if (error) {
        return React.createElement('div', { className: 'app-container' },
            React.createElement('div', { className: 'error' }, `Error: ${error}`)
        );
    }

    return React.createElement('div', { className: 'app-container' },
        React.createElement(Header, null),
        React.createElement(ControlsPanel, { config, updateConfig }),
        React.createElement(ChartContainer, { data, curveResult, supportPoints }),
        React.createElement(Legend, null),
        React.createElement(StatsPanel, { data, curveResult, supportPoints })
    );
}

/**
 * Header Component
 */
function Header() {
    return React.createElement('header', { className: 'header' },
        React.createElement('h1', null, 'Gold Price Power-Law Analysis'),
        React.createElement('p', null, 'Historical XAU/USD with Support Curve Fitting')
    );
}

/**
 * Controls Panel Component
 */
function ControlsPanel({ config, updateConfig }) {
    return React.createElement('div', { className: 'controls-panel' },
        // Curve Strategy
        React.createElement('div', { className: 'control-group' },
            React.createElement('label', null, 'Curve Strategy'),
            React.createElement('select', {
                value: config.curveStrategy,
                onChange: (e) => updateConfig('curveStrategy', e.target.value)
            },
                React.createElement('option', { value: 'powerlaw' }, 'Power-Law (default)'),
                React.createElement('option', { value: 'exponential' }, 'Exponential'),
                React.createElement('option', { value: 'polynomial' }, 'Polynomial'),
                React.createElement('option', { value: 'logarithmic' }, 'Logarithmic'),
                React.createElement('option', { value: 'geometric' }, 'Geometric Mean Envelope'),
                React.createElement('option', { value: 'percentile' }, 'Percentile-Based Support')
            )
        ),
        // Support Points (N)
        React.createElement('div', { className: 'control-group' },
            React.createElement('label', null, `Support Points: ${config.supportPoints}`),
            React.createElement('input', {
                type: 'range',
                min: 5,
                max: 50,
                value: config.supportPoints,
                onChange: (e) => updateConfig('supportPoints', parseInt(e.target.value))
            })
        ),
        // Polynomial Degree (conditional)
        config.curveStrategy === 'polynomial' && React.createElement('div', { className: 'control-group' },
            React.createElement('label', null, `Polynomial Degree: ${config.polynomialDegree}`),
            React.createElement('input', {
                type: 'range',
                min: 2,
                max: 5,
                value: config.polynomialDegree,
                onChange: (e) => updateConfig('polynomialDegree', parseInt(e.target.value))
            })
        ),
        // Percentile Value (conditional)
        config.curveStrategy === 'percentile' && React.createElement('div', { className: 'control-group' },
            React.createElement('label', null, `Percentile: ${(config.percentileValue * 100).toFixed(0)}%`),
            React.createElement('input', {
                type: 'range',
                min: 1,
                max: 10,
                value: config.percentileValue * 100,
                onChange: (e) => updateConfig('percentileValue', parseInt(e.target.value) / 100)
            })
        ),
        // Rolling Window (for geometric and percentile)
        (config.curveStrategy === 'geometric' || config.curveStrategy === 'percentile') &&
        React.createElement('div', { className: 'control-group' },
            React.createElement('label', null, `Rolling Window: ${config.rollingWindow} weeks`),
            React.createElement('input', {
                type: 'range',
                min: 12,
                max: 156,
                value: config.rollingWindow,
                onChange: (e) => updateConfig('rollingWindow', parseInt(e.target.value))
            })
        )
    );
}

/**
 * Chart Container Component
 */
function ChartContainer({ data, curveResult, supportPoints }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candlestickSeriesRef = useRef(null);
    const curveSeriesRef = useRef(null);
    const markersRef = useRef([]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: '#16213e' },
                textColor: '#888'
            },
            grid: {
                vertLines: { color: '#0f3460' },
                horzLines: { color: '#0f3460' }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: '#0f3460'
            },
            timeScale: {
                borderColor: '#0f3460',
                timeVisible: true,
                secondsVisible: false
            }
        });

        chartRef.current = chart;

        // Add candlestick series
        candlestickSeriesRef.current = chart.addCandlestickSeries({
            upColor: '#00c853',
            downColor: '#ff5252',
            borderUpColor: '#00c853',
            borderDownColor: '#ff5252',
            wickUpColor: '#00c853',
            wickDownColor: '#ff5252'
        });

        // Add curve line series
        curveSeriesRef.current = chart.addLineSeries({
            color: '#2a6cff',
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false
        });

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, []);

    // Update data
    useEffect(() => {
        if (!candlestickSeriesRef.current || !data) return;

        const candleData = data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));

        candlestickSeriesRef.current.setData(candleData);

        // Add markers for support points
        if (supportPoints.length > 0) {
            const markers = supportPoints.map(p => ({
                time: p.time,
                position: 'belowBar',
                color: '#ff9800',
                shape: 'circle',
                size: 1
            }));
            candlestickSeriesRef.current.setMarkers(markers);
        }

        // Fit content
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, [data, supportPoints]);

    // Update curve
    useEffect(() => {
        if (!curveSeriesRef.current || !curveResult) return;

        const curveData = curveResult.curve
            .filter(d => d.value > 0 && isFinite(d.value))
            .map(d => ({
                time: d.time,
                value: d.value
            }));

        curveSeriesRef.current.setData(curveData);
    }, [curveResult]);

    return React.createElement('div', { className: 'chart-container' },
        React.createElement('div', {
            ref: chartContainerRef,
            className: 'chart-wrapper'
        })
    );
}

/**
 * Legend Component
 */
function Legend() {
    return React.createElement('div', { className: 'legend' },
        React.createElement('div', { className: 'legend-item' },
            React.createElement('span', { className: 'legend-color curve' }),
            React.createElement('span', null, 'Support Curve')
        ),
        React.createElement('div', { className: 'legend-item' },
            React.createElement('span', { className: 'legend-color support' }),
            React.createElement('span', null, 'Detected Support Lows')
        )
    );
}

/**
 * Stats Panel Component
 */
function StatsPanel({ data, curveResult, supportPoints }) {
    if (!data || data.length === 0) return null;

    const latestPrice = data[data.length - 1].close;
    const latestCurveValue = curveResult?.curve[curveResult.curve.length - 1]?.value;
    const deviation = latestCurveValue ? ((latestPrice - latestCurveValue) / latestCurveValue * 100) : null;

    return React.createElement('div', { className: 'stats-panel' },
        React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'Current Price'),
            React.createElement('div', { className: 'value' }, `$${latestPrice.toFixed(2)}`)
        ),
        React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'Support Level'),
            React.createElement('div', { className: 'value blue' },
                latestCurveValue ? `$${latestCurveValue.toFixed(2)}` : 'N/A'
            )
        ),
        React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'Deviation from Support'),
            React.createElement('div', { className: 'value green' },
                deviation !== null ? `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%` : 'N/A'
            )
        ),
        React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'Curve Type'),
            React.createElement('div', { className: 'value blue' }, curveResult?.name || 'N/A')
        ),
        (curveResult && curveResult.r2 !== null && curveResult.r2 !== undefined) && React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'R² (Goodness of Fit)'),
            React.createElement('div', { className: 'value green' }, curveResult.r2.toFixed(4))
        ),
        React.createElement('div', { className: 'stat-card' },
            React.createElement('h3', null, 'Support Points Used'),
            React.createElement('div', { className: 'value' }, supportPoints.length)
        )
    );
}

// ============================================================================
// RENDER APPLICATION
// ============================================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
