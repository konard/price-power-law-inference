#!/usr/bin/env python3
"""
Generate realistic historical gold (XAU/USD) OHLC price data from 1971 to 2025.
This script creates weekly data points with realistic volatility and follows
the actual historical trend of gold prices.
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict
import math


def generate_gold_data() -> List[Dict]:
    """
    Generate realistic gold price data from January 1971 to December 2025.

    Historical context:
    - 1971-1974: Gold standard ended, price rose from ~$35 to ~$195
    - 1975-1979: Consolidation and rise to ~$850
    - 1980: Peak at ~$850 (January 1980)
    - 1980-1985: Decline to ~$300
    - 1985-2000: Low period, bottom around $250-$280
    - 2001-2011: Bull market, rose to ~$1900
    - 2012-2015: Correction to ~$1050
    - 2016-2019: Recovery to ~$1500
    - 2020: COVID spike to ~$2000+
    - 2021-2025: Volatility around $1700-$2400

    Returns:
        List of dictionaries with time, open, high, low, close
    """

    # Define key historical price points (date, approximate price)
    key_points = [
        ("1971-01-04", 35.0),
        ("1974-12-30", 195.0),
        ("1980-01-21", 850.0),  # Peak
        ("1982-06-21", 300.0),
        ("1985-02-25", 285.0),
        ("1999-08-23", 252.0),  # Bottom
        ("2001-04-02", 255.0),
        ("2005-12-12", 510.0),
        ("2008-03-17", 1000.0),
        ("2008-10-27", 720.0),  # Financial crisis dip
        ("2011-09-05", 1895.0),  # Peak
        ("2013-04-15", 1360.0),
        ("2015-12-17", 1050.0),  # Low
        ("2016-07-06", 1360.0),
        ("2019-09-04", 1550.0),
        ("2020-08-06", 2067.0),  # COVID peak
        ("2021-03-08", 1680.0),
        ("2022-03-08", 2050.0),
        ("2022-09-28", 1620.0),
        ("2023-12-04", 2050.0),
        ("2024-04-12", 2350.0),
        ("2025-01-06", 2650.0),
        ("2025-11-28", 2700.0),  # Current approximate
    ]

    # Convert key points to datetime and price
    milestones = [(datetime.strptime(date, "%Y-%m-%d"), price)
                  for date, price in key_points]

    # Generate weekly data points
    data = []
    current_date = datetime(1971, 1, 4)  # Start Monday, Jan 4, 1971
    end_date = datetime(2025, 11, 28)

    # Add some variability factors
    random.seed(42)  # For reproducibility

    while current_date <= end_date:
        # Find the interpolated price for this date
        price = interpolate_price(current_date, milestones)

        # Add realistic weekly volatility (typically 1-3% per week)
        volatility = random.uniform(0.01, 0.03)

        # Generate OHLC for the week
        # Open is base price with small random variation
        open_price = price * (1 + random.uniform(-volatility/2, volatility/2))

        # High and low based on weekly volatility
        high_price = price * (1 + random.uniform(0, volatility * 1.5))
        low_price = price * (1 - random.uniform(0, volatility * 1.5))

        # Close somewhere between high and low, biased toward the trend
        close_price = price * (1 + random.uniform(-volatility/2, volatility/2))

        # Ensure high >= open, close and low <= open, close
        high_price = max(high_price, open_price, close_price)
        low_price = min(low_price, open_price, close_price)

        # Round to 2 decimal places
        data.append({
            "time": current_date.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2)
        })

        # Move to next week
        current_date += timedelta(days=7)

    return data


def interpolate_price(date: datetime, milestones: List[tuple]) -> float:
    """
    Interpolate gold price for a given date based on historical milestones.
    Uses smooth interpolation between key points.

    Args:
        date: The date to interpolate for
        milestones: List of (datetime, price) tuples

    Returns:
        Interpolated price
    """
    # Find the two milestones that bracket this date
    for i in range(len(milestones) - 1):
        date1, price1 = milestones[i]
        date2, price2 = milestones[i + 1]

        if date1 <= date <= date2:
            # Linear interpolation
            days_total = (date2 - date1).days
            days_elapsed = (date - date1).days

            if days_total == 0:
                return price1

            # Calculate interpolation factor
            factor = days_elapsed / days_total

            # Use smooth interpolation (ease-in-out) for more realistic curves
            # This makes the transitions smoother
            smooth_factor = smooth_step(factor)

            price = price1 + (price2 - price1) * smooth_factor
            return price

    # If date is before first milestone, return first price
    if date < milestones[0][0]:
        return milestones[0][1]

    # If date is after last milestone, return last price with slight upward drift
    if date > milestones[-1][0]:
        # Add small random walk for future projection
        days_beyond = (date - milestones[-1][0]).days
        drift = 1 + (days_beyond / 365) * 0.02  # 2% annual drift
        return milestones[-1][1] * drift

    return milestones[-1][1]


def smooth_step(x: float) -> float:
    """
    Smoothstep function for smoother interpolation.
    Returns a value between 0 and 1 with smooth acceleration/deceleration.
    """
    # Clamp x to [0, 1]
    x = max(0, min(1, x))
    # Smoothstep formula: 3x^2 - 2x^3
    return x * x * (3 - 2 * x)


def main():
    """Generate gold data and save to JSON file."""
    print("Generating historical gold price data...")

    data = generate_gold_data()

    print(f"Generated {len(data)} weekly data points")
    print(f"Date range: {data[0]['time']} to {data[-1]['time']}")
    print(f"Starting price: ${data[0]['close']:.2f}")
    print(f"Ending price: ${data[-1]['close']:.2f}")

    # Save to JSON file
    output_file = "/tmp/gh-issue-solver-1764312293499/gold-data.json"
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\nData saved to: {output_file}")

    # Print some sample data points
    print("\nSample data points:")
    print(f"1971: {data[0]}")
    print(f"1980 (peak): {[d for d in data if d['time'].startswith('1980-01')][0]}")
    print(f"1999 (bottom): {[d for d in data if d['time'].startswith('1999-08')][0]}")
    print(f"2011 (peak): {[d for d in data if d['time'].startswith('2011-09')][0]}")
    print(f"2020 (COVID): {[d for d in data if d['time'].startswith('2020-08')][0]}")
    print(f"2025 (latest): {data[-1]}")


if __name__ == "__main__":
    main()
