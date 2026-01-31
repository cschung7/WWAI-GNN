# Data loading utilities for WWAI-GNN

"""Data loading and preprocessing for economic forecasting."""

from wwai_gnn.data.countries import (
    COUNTRIES,
    COUNTRY_NAMES,
    COUNTRY_COORDINATES,
    DEVELOPMENT_LEVELS,
    TRADE_BLOCS,
    G7_COUNTRIES,
    BRICS_COUNTRIES,
    EU_COUNTRIES,
)
from wwai_gnn.data.data_loader import (
    EconomicDataLoader,
    load_economic_data,
    create_training_batch,
)

__all__ = [
    "COUNTRIES",
    "COUNTRY_NAMES",
    "COUNTRY_COORDINATES",
    "DEVELOPMENT_LEVELS",
    "TRADE_BLOCS",
    "G7_COUNTRIES",
    "BRICS_COUNTRIES",
    "EU_COUNTRIES",
    "EconomicDataLoader",
    "load_economic_data",
    "create_training_batch",
]
