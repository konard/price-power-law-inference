#!/usr/bin/env python3
"""
Download historical gold price data from Free Gold API.
This script downloads 768 years of gold price data (1258-2025) from freegoldapi.com.
The data includes prices from multiple sources with automatic daily updates.

Data source: https://freegoldapi.com/
Coverage: 1258-2025 (1,711+ data points)
Sources: Yahoo Finance (daily), World Bank (monthly), MeasuringWorth London & British (annual)
"""

import json
import sys
import csv
import subprocess
from datetime import datetime
from typing import List, Dict
from io import StringIO


def download_gold_data_from_api() -> List[Dict]:
    """
    Download historical gold price data from Free Gold API using curl.

    Returns:
        List of dictionaries with date, price, and source information
    """
    print("Downloading gold price data from Free Gold API...")
    print("URL: https://freegoldapi.com/data/latest.csv")

    try:
        # Use curl to download the CSV data
        result = subprocess.run(
            ['curl', '-s', 'https://freegoldapi.com/data/latest.csv'],
            capture_output=True,
            text=True,
            check=True
        )

        if result.returncode != 0:
            raise ValueError(f"curl failed with return code {result.returncode}")

        # Parse CSV data
        csv_data = StringIO(result.stdout)
        reader = csv.DictReader(csv_data)

        raw_data = []
        for row in reader:
            raw_data.append({
                'date': row['date'],
                'price': float(row['price']),
                'source': row['source']
            })

        print(f"Downloaded {len(raw_data)} data points")

        if raw_data:
            print(f"Date range: {raw_data[0]['date']} to {raw_data[-1]['date']}")
            print(f"Starting price: ${raw_data[0]['price']:.2f}")
            print(f"Ending price: ${raw_data[-1]['price']:.2f}")

        return raw_data

    except (subprocess.CalledProcessError, ValueError) as e:
        raise ValueError(f"Failed to download data from Free Gold API: {e}")


def convert_to_ohlc_format(raw_data: List[Dict]) -> List[Dict]:
    """
    Convert single-price data to OHLC format for compatibility with the visualization.

    Since we only have one price per time period, we use it for all OHLC values.
    This is a common approach for historical data that only includes closing prices.

    Args:
        raw_data: List of dictionaries with date, price, source

    Returns:
        List of dictionaries with time, open, high, low, close
    """
    print("\nConverting to OHLC format...")

    ohlc_data = []
    for entry in raw_data:
        price = round(entry['price'], 2)

        # Use the same price for all OHLC values
        # This is standard practice when only closing prices are available
        ohlc_data.append({
            "time": entry['date'],
            "open": price,
            "high": price,
            "low": price,
            "close": price
        })

    print(f"Converted {len(ohlc_data)} data points to OHLC format")
    return ohlc_data


def filter_data_by_year(data: List[Dict], start_year: int = None, end_year: int = None) -> List[Dict]:
    """
    Filter data to only include entries within the specified year range.

    Args:
        data: List of OHLC data
        start_year: Minimum year to include (None = no minimum)
        end_year: Maximum year to include (None = no maximum)

    Returns:
        Filtered list of data points
    """
    if start_year is None and end_year is None:
        return data

    filtered = []
    for entry in data:
        year = int(entry['time'].split('-')[0])

        if start_year and year < start_year:
            continue
        if end_year and year > end_year:
            continue

        filtered.append(entry)

    print(f"Filtered to {len(filtered)} data points (years {start_year or 'all'} - {end_year or 'all'})")
    return filtered


def save_data_to_json(data: List[Dict], output_file: str):
    """
    Save data to JSON file.

    Args:
        data: List of OHLC data
        output_file: Output file path
    """
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n✓ Data saved to: {output_file}")


def print_data_summary(data: List[Dict]):
    """
    Print summary statistics about the data.

    Args:
        data: List of OHLC data
    """
    if not data:
        return

    print("\nData Summary:")
    print(f"  Total data points: {len(data)}")
    print(f"  Date range: {data[0]['time']} to {data[-1]['time']}")
    print(f"  Starting price: ${data[0]['close']:.2f}")
    print(f"  Ending price: ${data[-1]['close']:.2f}")

    # Calculate price change
    price_change = data[-1]['close'] - data[0]['close']
    price_change_pct = (price_change / data[0]['close']) * 100
    print(f"  Total change: ${price_change:,.2f} ({price_change_pct:+.1f}%)")

    # Find min and max prices
    min_price = min(d['close'] for d in data)
    max_price = max(d['close'] for d in data)
    min_entry = next(d for d in data if d['close'] == min_price)
    max_entry = next(d for d in data if d['close'] == max_price)

    print(f"  Minimum price: ${min_price:.2f} on {min_entry['time']}")
    print(f"  Maximum price: ${max_price:.2f} on {max_entry['time']}")

    # Sample data points by century
    print("\nSample data points by century:")
    for century_start in [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]:
        century_data = [d for d in data if century_start <= int(d['time'].split('-')[0]) < century_start + 100]
        if century_data:
            sample = century_data[0]
            print(f"  {century_start}s: {sample['time']}, ${sample['close']:.2f}")


def main():
    """Download gold data from Free Gold API and save to JSON file."""
    try:
        print("="*70)
        print("Free Gold API - Historical Gold Price Data Downloader")
        print("="*70)
        print("\nData source: https://freegoldapi.com/")
        print("Coverage: 1258-2025 (768 years)")
        print("Sources: Yahoo Finance, World Bank, MeasuringWorth")
        print("="*70)

        # Download raw data
        raw_data = download_gold_data_from_api()

        # Convert to OHLC format
        ohlc_data = convert_to_ohlc_format(raw_data)

        # Optional: Filter data by year range (uncomment to use)
        # For example, to only include data from 1800 onwards:
        # ohlc_data = filter_data_by_year(ohlc_data, start_year=1800)

        # Save to JSON file in the project root
        output_file = "gold-data.json"
        save_data_to_json(ohlc_data, output_file)

        # Print summary
        print_data_summary(ohlc_data)

        # Print first and last entries
        print("\nFirst entry:")
        print(f"  {json.dumps(ohlc_data[0], indent=2)}")
        print("\nLast entry:")
        print(f"  {json.dumps(ohlc_data[-1], indent=2)}")

        print("\n" + "="*70)
        print("Download completed successfully!")
        print("="*70)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
