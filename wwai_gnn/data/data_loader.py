# Copyright 2024 WWAI Project
#
# Data loading utilities for economic forecasting.

"""Data loader for economic indicators from FRED and World Bank."""

import os
import json
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from wwai_gnn.data.countries import (
    COUNTRIES,
    FRED_SERIES_BY_COUNTRY,
    WORLD_BANK_INDICATORS,
    GDP_ESTIMATES,
    POPULATION_ESTIMATES,
    DEVELOPMENT_LEVELS,
    COUNTRY_COORDINATES,
)


# Cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "cache"


def ensure_cache_dir():
    """Ensure cache directory exists."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


class EconomicDataLoader:
    """Loads economic data from various sources with caching."""

    def __init__(
        self,
        countries: Optional[List[str]] = None,
        indicators: Optional[List[str]] = None,
        start_date: str = "2000-01-01",
        end_date: Optional[str] = None,
        cache_dir: Optional[Path] = None,
        use_cache: bool = True,
    ):
        """Initialize data loader.

        Args:
            countries: List of country codes. Defaults to all 26.
            indicators: List of indicator names. Defaults to core indicators.
            start_date: Start date for data (YYYY-MM-DD).
            end_date: End date for data. Defaults to today.
            cache_dir: Directory for caching data.
            use_cache: Whether to use cached data.
        """
        self.countries = countries or COUNTRIES
        self.indicators = indicators or [
            "gdp_growth", "inflation", "unemployment",
            "interest_rate", "trade_balance",
        ]
        self.start_date = pd.Timestamp(start_date)
        self.end_date = pd.Timestamp(end_date) if end_date else pd.Timestamp.now()
        self.cache_dir = Path(cache_dir) if cache_dir else CACHE_DIR
        self.use_cache = use_cache

        ensure_cache_dir()

        # Data storage
        self._data: Dict[str, pd.DataFrame] = {}
        self._fred_api = None
        self._wb_api = None

    def _init_fred(self):
        """Initialize FRED API client."""
        if self._fred_api is not None:
            return

        try:
            from fredapi import Fred
            api_key = os.getenv("FRED_API_KEY")
            if api_key:
                self._fred_api = Fred(api_key=api_key)
            else:
                warnings.warn("FRED_API_KEY not set. Using synthetic data.")
        except ImportError:
            warnings.warn("fredapi not installed. Using synthetic data.")

    def _init_world_bank(self):
        """Initialize World Bank API client."""
        if self._wb_api is not None:
            return

        try:
            import wbgapi as wb
            self._wb_api = wb
        except ImportError:
            warnings.warn("wbgapi not installed. Using synthetic data.")

    def load_data(
        self,
        force_refresh: bool = False,
    ) -> Dict[str, pd.DataFrame]:
        """Load economic data for all countries.

        Args:
            force_refresh: Ignore cache and fetch fresh data.

        Returns:
            Dictionary mapping country codes to DataFrames.
        """
        # Try cache first
        if self.use_cache and not force_refresh:
            cached = self._load_from_cache()
            if cached:
                self._data = cached
                return self._data

        # Fetch fresh data
        self._data = self._fetch_all_data()

        # Save to cache
        if self.use_cache:
            self._save_to_cache(self._data)

        return self._data

    def _fetch_all_data(self) -> Dict[str, pd.DataFrame]:
        """Fetch data from all sources."""
        data = {}

        for country in self.countries:
            try:
                df = self._fetch_country_data(country)
                if df is not None and not df.empty:
                    data[country] = df
                else:
                    data[country] = self._generate_synthetic_data(country)
            except Exception as e:
                warnings.warn(f"Failed to fetch data for {country}: {e}")
                data[country] = self._generate_synthetic_data(country)

        return data

    def _fetch_country_data(self, country: str) -> Optional[pd.DataFrame]:
        """Fetch data for a single country."""
        dfs = []

        # Try FRED first for countries with FRED series
        if country in FRED_SERIES_BY_COUNTRY:
            self._init_fred()
            if self._fred_api:
                for indicator, series_id in FRED_SERIES_BY_COUNTRY[country].items():
                    try:
                        series = self._fred_api.get_series(
                            series_id,
                            observation_start=self.start_date,
                            observation_end=self.end_date,
                        )
                        if series is not None:
                            df = pd.DataFrame({indicator: series})
                            dfs.append(df)
                    except Exception:
                        pass

        # Try World Bank for remaining indicators
        self._init_world_bank()
        if self._wb_api:
            for indicator in self.indicators:
                if indicator in WORLD_BANK_INDICATORS:
                    try:
                        wb_indicator = WORLD_BANK_INDICATORS[indicator]
                        df = self._wb_api.data.DataFrame(
                            wb_indicator,
                            economy=country,
                            time=range(self.start_date.year, self.end_date.year + 1),
                        )
                        if df is not None and not df.empty:
                            # Reshape World Bank data
                            df = df.T
                            df.columns = [indicator]
                            dfs.append(df)
                    except Exception:
                        pass

        if dfs:
            # Combine all DataFrames
            result = pd.concat(dfs, axis=1)
            # Ensure DatetimeIndex for resampling
            if not isinstance(result.index, pd.DatetimeIndex):
                try:
                    result.index = pd.to_datetime(result.index)
                except Exception:
                    # If conversion fails, return None to use synthetic data
                    return None
            # Resample to quarterly
            result = result.resample("QE").mean()
            return result

        return None

    def _generate_synthetic_data(self, country: str) -> pd.DataFrame:
        """Generate synthetic data for a country.

        Uses realistic patterns based on country characteristics.
        """
        # Generate quarterly date range
        dates = pd.date_range(
            start=self.start_date,
            end=self.end_date,
            freq="QE",
        )

        n_periods = len(dates)

        # Base values based on development level
        dev_level = DEVELOPMENT_LEVELS.get(country, 1)
        gdp = GDP_ESTIMATES.get(country, 1.0)

        # GDP growth: developed ~2%, emerging ~4%, developing ~5%
        base_gdp_growth = [2.0, 4.0, 5.0][2 - dev_level]

        # Inflation: developed ~2%, emerging ~5%, developing ~8%
        base_inflation = [2.0, 5.0, 8.0][2 - dev_level]

        # Unemployment: developed ~5%, emerging ~7%, developing ~10%
        base_unemployment = [5.0, 7.0, 10.0][2 - dev_level]

        # Interest rate: developed ~2%, emerging ~5%, developing ~8%
        base_interest = [2.0, 5.0, 8.0][2 - dev_level]

        # Generate with noise and cycles
        np.random.seed(hash(country) % 2**32)

        # Business cycle (8-year cycle)
        cycle = np.sin(np.linspace(0, 2 * np.pi * n_periods / 32, n_periods))

        data = {
            "gdp_growth": base_gdp_growth + 2 * cycle + np.random.randn(n_periods) * 1.0,
            "inflation": base_inflation + cycle + np.random.randn(n_periods) * 0.5,
            "unemployment": base_unemployment - cycle + np.random.randn(n_periods) * 0.3,
            "interest_rate": base_interest + 0.5 * cycle + np.random.randn(n_periods) * 0.2,
            "trade_balance": (gdp * 0.02) + np.random.randn(n_periods) * (gdp * 0.01),
        }

        df = pd.DataFrame(data, index=dates)

        # Clip to realistic ranges
        df["gdp_growth"] = df["gdp_growth"].clip(-10, 15)
        df["inflation"] = df["inflation"].clip(-2, 20)
        df["unemployment"] = df["unemployment"].clip(1, 25)
        df["interest_rate"] = df["interest_rate"].clip(0, 20)

        return df

    def _load_from_cache(self) -> Optional[Dict[str, pd.DataFrame]]:
        """Load data from cache."""
        cache_file = self.cache_dir / "economic_data.json"
        if not cache_file.exists():
            return None

        try:
            with open(cache_file, "r") as f:
                cache_meta = json.load(f)

            # Check if cache is fresh (less than 7 days old)
            cache_time = datetime.fromisoformat(cache_meta["timestamp"])
            if datetime.now() - cache_time > timedelta(days=7):
                return None

            # Load DataFrames
            data = {}
            for country in self.countries:
                csv_file = self.cache_dir / f"{country}.csv"
                if csv_file.exists():
                    df = pd.read_csv(csv_file, index_col=0, parse_dates=True)
                    data[country] = df

            return data if data else None

        except Exception:
            return None

    def _save_to_cache(self, data: Dict[str, pd.DataFrame]):
        """Save data to cache."""
        try:
            # Save metadata
            cache_meta = {
                "timestamp": datetime.now().isoformat(),
                "countries": list(data.keys()),
                "indicators": self.indicators,
            }
            with open(self.cache_dir / "economic_data.json", "w") as f:
                json.dump(cache_meta, f)

            # Save DataFrames
            for country, df in data.items():
                df.to_csv(self.cache_dir / f"{country}.csv")

        except Exception as e:
            warnings.warn(f"Failed to save cache: {e}")

    def get_feature_matrix(
        self,
        n_timesteps: int = 4,
        target_date: Optional[str] = None,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Get feature matrix for training/inference.

        Args:
            n_timesteps: Number of historical timesteps.
            target_date: Target date for prediction (default: latest).

        Returns:
            (input_features, target_features, static_features) arrays.
        """
        if not self._data:
            self.load_data()

        # Determine target date
        if target_date:
            target = pd.Timestamp(target_date)
        else:
            # Find common latest date
            latest_dates = [df.index.max() for df in self._data.values()]
            target = min(latest_dates)

        n_countries = len(self.countries)
        n_features = len(self.indicators)

        # Build feature matrices
        input_features = np.zeros((n_countries, n_timesteps, n_features))
        target_features = np.zeros((n_countries, n_features))
        static_features = np.zeros((n_countries, 7))  # lat, lon, sin/cos, dev_level

        for i, country in enumerate(self.countries):
            df = self._data.get(country)
            if df is None:
                continue

            # Get data up to target date
            df_until_target = df[df.index <= target]
            if len(df_until_target) < n_timesteps + 1:
                continue

            # Input: last n_timesteps before target
            for j, indicator in enumerate(self.indicators):
                if indicator in df_until_target.columns:
                    vals = df_until_target[indicator].values
                    input_features[i, :, j] = vals[-(n_timesteps+1):-1]
                    target_features[i, j] = vals[-1]

            # Static features
            lat, lon = COUNTRY_COORDINATES.get(country, (0.0, 0.0))
            dev = DEVELOPMENT_LEVELS.get(country, 1)
            static_features[i] = [
                lat / 90.0,
                lon / 180.0,
                np.sin(np.radians(lat)),
                np.cos(np.radians(lat)),
                np.sin(np.radians(lon)),
                np.cos(np.radians(lon)),
                dev / 2.0,
            ]

        # Flatten input features: (n_countries, n_timesteps * n_features)
        input_features = input_features.reshape(n_countries, -1)

        return input_features, target_features, static_features


def load_economic_data(
    countries: Optional[List[str]] = None,
    indicators: Optional[List[str]] = None,
    start_date: str = "2000-01-01",
) -> Dict[str, pd.DataFrame]:
    """Convenience function to load economic data.

    Args:
        countries: List of country codes.
        indicators: List of indicator names.
        start_date: Start date for data.

    Returns:
        Dictionary of country DataFrames.
    """
    loader = EconomicDataLoader(
        countries=countries,
        indicators=indicators,
        start_date=start_date,
    )
    return loader.load_data()


def create_training_batch(
    loader: EconomicDataLoader,
    batch_dates: List[str],
    n_timesteps: int = 4,
) -> Tuple[np.ndarray, np.ndarray]:
    """Create a training batch from multiple dates.

    Args:
        loader: EconomicDataLoader instance.
        batch_dates: List of target dates.
        n_timesteps: Number of input timesteps.

    Returns:
        (inputs, targets) arrays with batch dimension.
    """
    inputs_list = []
    targets_list = []

    for date in batch_dates:
        input_feat, target_feat, static_feat = loader.get_feature_matrix(
            n_timesteps=n_timesteps,
            target_date=date,
        )
        # Combine input and static features
        combined_input = np.concatenate([static_feat, input_feat], axis=-1)
        inputs_list.append(combined_input)
        targets_list.append(target_feat)

    # Stack into batch
    inputs = np.stack(inputs_list, axis=0)
    targets = np.stack(targets_list, axis=0)

    return inputs, targets
