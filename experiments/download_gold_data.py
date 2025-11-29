#!/usr/bin/env python3
"""
Download real historical gold (XAU/USD) OHLC price data using yfinance.
This script downloads actual market data from Yahoo Finance from 1971 to present.
"""

import json
import sys
from datetime import datetime
from typing import List, Dict

try:
    import yfinance as yf
except ImportError:
    print("Error: yfinance library is not installed.")
    print("Please install it using: pip install yfinance")
    sys.exit(1)


def download_gold_data(ticker: str = "GC=F", interval: str = "1wk") -> List[Dict]:
    """
    Download real historical gold price data from Yahoo Finance.

    Args:
        ticker: Yahoo Finance ticker symbol for gold
                Options: "GC=F" (Gold Futures), "XAUUSD=X" (Gold Spot)
        interval: Data interval ("1d" for daily, "1wk" for weekly)

    Returns:
        List of dictionaries with time, open, high, low, close
    """
    print(f"Downloading gold price data for {ticker}...")
    print(f"Interval: {interval}")

    # Download data from Yahoo Finance
    # period="max" gets all available historical data
    gold = yf.Ticker(ticker)
    df = gold.history(period="max", interval=interval)

    if df.empty:
        raise ValueError(f"No data retrieved for ticker {ticker}")

    print(f"Downloaded {len(df)} data points")
    print(f"Date range: {df.index[0].strftime('%Y-%m-%d')} to {df.index[-1].strftime('%Y-%m-%d')}")
    print(f"Starting price: ${df['Close'].iloc[0]:.2f}")
    print(f"Ending price: ${df['Close'].iloc[-1]:.2f}")

    # Convert DataFrame to list of dictionaries
    data = []
    for timestamp, row in df.iterrows():
        # Skip rows with missing data
        if any(pd.isna(val) for val in [row['Open'], row['High'], row['Low'], row['Close']]):
            continue

        data.append({
            "time": timestamp.strftime("%Y-%m-%d"),
            "open": round(float(row['Open']), 2),
            "high": round(float(row['High']), 2),
            "low": round(float(row['Low']), 2),
            "close": round(float(row['Close']), 2)
        })

    return data


def try_multiple_tickers() -> List[Dict]:
    """
    Try multiple ticker symbols to get the best historical data.
    Returns data from the ticker with the longest history.
    """
    tickers = [
        ("XAUUSD=X", "Gold Spot (XAU/USD)"),
        ("GC=F", "Gold Futures"),
    ]

    best_data = None
    best_ticker_name = None
    earliest_date = None

    for ticker, name in tickers:
        try:
            print(f"\n{'='*60}")
            print(f"Trying {name} ({ticker})...")
            print(f"{'='*60}")

            data = download_gold_data(ticker, interval="1wk")

            if data:
                first_date = datetime.strptime(data[0]['time'], '%Y-%m-%d')

                if earliest_date is None or first_date < earliest_date:
                    earliest_date = first_date
                    best_data = data
                    best_ticker_name = name

        except Exception as e:
            print(f"Failed to download {name}: {e}")
            continue

    if best_data:
        print(f"\n{'='*60}")
        print(f"Selected: {best_ticker_name}")
        print(f"Data points: {len(best_data)}")
        print(f"Date range: {best_data[0]['time']} to {best_data[-1]['time']}")
        print(f"{'='*60}\n")
        return best_data
    else:
        raise ValueError("Failed to download data from any ticker")


def main():
    """Download gold data and save to JSON file."""
    try:
        # Import pandas here to check if it's available
        global pd
        import pandas as pd

        print("="*60)
        print("Real Gold Price Data Downloader")
        print("="*60)

        # Try multiple tickers and select the best one
        data = try_multiple_tickers()

        # Save to JSON file in the project root
        output_file = "gold-data.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"\n✓ Real data saved to: {output_file}")

        # Print some sample data points for verification
        print("\nSample data points:")
        print(f"First: {data[0]}")
        print(f"Last: {data[-1]}")

        # Show some interesting historical points if available
        for year in [1980, 2000, 2008, 2011, 2020]:
            year_data = [d for d in data if d['time'].startswith(str(year))]
            if year_data:
                print(f"{year}: {year_data[0]}")

    except ImportError:
        print("\nError: Required libraries not installed.")
        print("Please install them using:")
        print("  pip install yfinance pandas")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
