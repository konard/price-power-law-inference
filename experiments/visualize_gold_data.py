#!/usr/bin/env python3
"""
Simple ASCII visualization of the generated gold price data to verify
the historical trend looks realistic.
"""

import json
from datetime import datetime


def create_ascii_chart(data, width=80, height=25):
    """Create a simple ASCII chart of gold prices over time."""

    # Extract closing prices
    closes = [d['close'] for d in data]
    dates = [d['time'] for d in data]

    # Find min and max for scaling
    min_price = min(closes)
    max_price = max(closes)
    price_range = max_price - min_price

    # Scale prices to chart height
    scaled_prices = [
        int((price - min_price) / price_range * (height - 1))
        for price in closes
    ]

    # Sample data points to fit width
    sample_interval = max(1, len(closes) // width)
    sampled_prices = scaled_prices[::sample_interval]
    sampled_dates = dates[::sample_interval]

    # Create chart
    chart = [[' ' for _ in range(len(sampled_prices))] for _ in range(height)]

    # Plot the line
    for i, price_y in enumerate(sampled_prices):
        chart[height - 1 - price_y][i] = '*'

    # Print chart
    print(f"\nGold Price (XAU/USD) Historical Chart")
    print(f"{'=' * (len(sampled_prices) + 10)}")

    # Print y-axis labels and chart
    for i, row in enumerate(chart):
        price_at_row = max_price - (i / (height - 1)) * price_range
        if i % 5 == 0:  # Print label every 5 rows
            print(f"${price_at_row:7.0f} |{''.join(row)}")
        else:
            print(f"        |{''.join(row)}")

    # Print x-axis
    print(f"        +{'-' * len(sampled_prices)}")

    # Print date labels
    num_date_labels = 8
    date_interval = len(sampled_dates) // num_date_labels
    date_line = " " * 9
    for i in range(num_date_labels):
        idx = min(i * date_interval, len(sampled_dates) - 1)
        year = sampled_dates[idx][:4]
        date_line += f"{year:<{date_interval}}"
    print(date_line)


def print_statistics(data):
    """Print key statistics about the data."""
    closes = [d['close'] for d in data]
    highs = [d['high'] for d in data]
    lows = [d['low'] for d in data]

    print("\n" + "=" * 80)
    print("KEY STATISTICS")
    print("=" * 80)

    print(f"\nData Points: {len(data)}")
    print(f"Date Range: {data[0]['time']} to {data[-1]['time']}")
    print(f"\nPrice Range:")
    print(f"  All-time Low:  ${min(lows):,.2f}")
    print(f"  All-time High: ${max(highs):,.2f}")
    print(f"  Starting Price: ${data[0]['close']:,.2f}")
    print(f"  Ending Price: ${data[-1]['close']:,.2f}")
    print(f"  Total Return: {((data[-1]['close'] / data[0]['close']) - 1) * 100:.1f}%")

    # Find key events
    print(f"\nKey Historical Peaks and Troughs:")

    # 1980 peak
    peak_1980 = max([d for d in data if '1979' <= d['time'] <= '1981'],
                    key=lambda x: x['high'])
    print(f"  1980 Peak: ${peak_1980['high']:,.2f} on {peak_1980['time']}")

    # Late 90s/early 2000s trough
    trough_2000 = min([d for d in data if '1998' <= d['time'] <= '2002'],
                      key=lambda x: x['low'])
    print(f"  ~2000 Trough: ${trough_2000['low']:,.2f} on {trough_2000['time']}")

    # 2011 peak
    peak_2011 = max([d for d in data if '2010' <= d['time'] <= '2012'],
                    key=lambda x: x['high'])
    print(f"  2011 Peak: ${peak_2011['high']:,.2f} on {peak_2011['time']}")

    # 2020 COVID peak
    peak_2020 = max([d for d in data if '2020' <= d['time'] <= '2021'],
                    key=lambda x: x['high'])
    print(f"  2020 Peak: ${peak_2020['high']:,.2f} on {peak_2020['time']}")

    print("\n" + "=" * 80)


def main():
    """Load data and create visualizations."""
    with open('/tmp/gh-issue-solver-1764312293499/gold-data.json') as f:
        data = json.load(f)

    print_statistics(data)
    create_ascii_chart(data)

    print("\n\nData file successfully generated at:")
    print("/tmp/gh-issue-solver-1764312293499/gold-data.json")


if __name__ == "__main__":
    main()
