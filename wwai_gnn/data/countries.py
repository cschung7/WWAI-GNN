# Copyright 2024 WWAI Project
#
# Country definitions and metadata for economic forecasting.

"""Country definitions, coordinates, and groupings."""

from typing import Dict, List, Tuple

# ISO 3166-1 alpha-3 country codes
COUNTRIES: List[str] = [
    "USA", "CHN", "JPN", "DEU", "IND", "GBR", "FRA", "ITA", "BRA", "CAN",
    "KOR", "ESP", "AUS", "RUS", "MEX", "IDN", "NLD", "SAU", "TUR", "CHE",
    "POL", "SWE", "BEL", "ARG", "NOR", "AUT",
]

# Human-readable country names
COUNTRY_NAMES: Dict[str, str] = {
    "USA": "United States",
    "CHN": "China",
    "JPN": "Japan",
    "DEU": "Germany",
    "IND": "India",
    "GBR": "United Kingdom",
    "FRA": "France",
    "ITA": "Italy",
    "BRA": "Brazil",
    "CAN": "Canada",
    "KOR": "South Korea",
    "ESP": "Spain",
    "AUS": "Australia",
    "RUS": "Russia",
    "MEX": "Mexico",
    "IDN": "Indonesia",
    "NLD": "Netherlands",
    "SAU": "Saudi Arabia",
    "TUR": "Turkey",
    "CHE": "Switzerland",
    "POL": "Poland",
    "SWE": "Sweden",
    "BEL": "Belgium",
    "ARG": "Argentina",
    "NOR": "Norway",
    "AUT": "Austria",
}

# Country coordinates (latitude, longitude)
COUNTRY_COORDINATES: Dict[str, Tuple[float, float]] = {
    "USA": (39.0, -98.0),
    "CHN": (35.0, 105.0),
    "JPN": (36.0, 138.0),
    "DEU": (51.0, 10.0),
    "IND": (20.0, 77.0),
    "GBR": (54.0, -2.0),
    "FRA": (46.0, 2.0),
    "ITA": (42.5, 12.5),
    "BRA": (-10.0, -55.0),
    "CAN": (56.0, -106.0),
    "KOR": (36.0, 128.0),
    "ESP": (40.0, -4.0),
    "AUS": (-25.0, 135.0),
    "RUS": (60.0, 100.0),
    "MEX": (23.0, -102.0),
    "IDN": (-5.0, 120.0),
    "NLD": (52.5, 5.75),
    "SAU": (24.0, 45.0),
    "TUR": (39.0, 35.0),
    "CHE": (47.0, 8.0),
    "POL": (52.0, 20.0),
    "SWE": (62.0, 15.0),
    "BEL": (50.5, 4.5),
    "ARG": (-38.0, -64.0),
    "NOR": (62.0, 10.0),
    "AUT": (47.5, 14.5),
}

# Development levels (0=developing, 1=emerging, 2=developed)
DEVELOPMENT_LEVELS: Dict[str, int] = {
    "USA": 2, "CHN": 1, "JPN": 2, "DEU": 2, "IND": 0,
    "GBR": 2, "FRA": 2, "ITA": 2, "BRA": 1, "CAN": 2,
    "KOR": 2, "ESP": 2, "AUS": 2, "RUS": 1, "MEX": 1,
    "IDN": 0, "NLD": 2, "SAU": 1, "TUR": 1, "CHE": 2,
    "POL": 2, "SWE": 2, "BEL": 2, "ARG": 1, "NOR": 2,
    "AUT": 2,
}

# Approximate GDP (2023, trillions USD)
GDP_ESTIMATES: Dict[str, float] = {
    "USA": 26.95, "CHN": 17.70, "JPN": 4.23, "DEU": 4.43, "IND": 3.73,
    "GBR": 3.33, "FRA": 3.05, "ITA": 2.19, "BRA": 2.13, "CAN": 2.12,
    "KOR": 1.71, "ESP": 1.58, "AUS": 1.69, "RUS": 1.86, "MEX": 1.81,
    "IDN": 1.42, "NLD": 1.09, "SAU": 1.07, "TUR": 1.15, "CHE": 0.91,
    "POL": 0.84, "SWE": 0.59, "BEL": 0.63, "ARG": 0.64, "NOR": 0.49,
    "AUT": 0.52,
}

# Approximate population (2023, millions)
POPULATION_ESTIMATES: Dict[str, float] = {
    "USA": 334.0, "CHN": 1412.0, "JPN": 125.0, "DEU": 84.0, "IND": 1428.0,
    "GBR": 67.0, "FRA": 68.0, "ITA": 59.0, "BRA": 216.0, "CAN": 40.0,
    "KOR": 52.0, "ESP": 48.0, "AUS": 26.0, "RUS": 144.0, "MEX": 128.0,
    "IDN": 277.0, "NLD": 18.0, "SAU": 36.0, "TUR": 85.0, "CHE": 9.0,
    "POL": 38.0, "SWE": 10.0, "BEL": 12.0, "ARG": 46.0, "NOR": 5.0,
    "AUT": 9.0,
}

# Trade blocs
TRADE_BLOCS: Dict[str, List[str]] = {
    "G7": ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "JPN"],
    "G20": ["USA", "CHN", "JPN", "DEU", "IND", "GBR", "FRA", "ITA", "BRA",
            "CAN", "KOR", "ESP", "AUS", "RUS", "MEX", "IDN", "SAU", "TUR", "ARG"],
    "EU": ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"],
    "NAFTA/USMCA": ["USA", "CAN", "MEX"],
    "BRICS": ["BRA", "RUS", "IND", "CHN"],  # Note: expanded in 2024
    "OECD": ["USA", "JPN", "DEU", "GBR", "FRA", "ITA", "CAN", "KOR", "ESP",
             "AUS", "MEX", "NLD", "TUR", "CHE", "POL", "SWE", "BEL", "NOR", "AUT"],
}

# Convenience aliases
G7_COUNTRIES = TRADE_BLOCS["G7"]
BRICS_COUNTRIES = TRADE_BLOCS["BRICS"]
EU_COUNTRIES = TRADE_BLOCS["EU"]
OECD_COUNTRIES = TRADE_BLOCS["OECD"]

# FRED series IDs for economic indicators by country
# Sources: OECD, IMF, BIS via FRED
FRED_SERIES_BY_COUNTRY: Dict[str, Dict[str, str]] = {
    "USA": {
        "gdp_growth": "A191RL1Q225SBEA",  # Real GDP growth rate
        "inflation": "CPIAUCSL",  # CPI
        "unemployment": "UNRATE",  # Unemployment rate
        "interest_rate": "FEDFUNDS",  # Federal funds rate
        "industrial_production": "INDPRO",  # Industrial production
    },
    "CHN": {
        "gdp_growth": "MKTGDPCNA646NWDB",  # GDP China
        "inflation": "CHNCPIALLMINMEI",  # CPI China
        "unemployment": "LRUN64TTCNQ156S",  # Unemployment
        "interest_rate": "INTDSRCNM193N",  # Interest rate
        "industrial_production": "CHNPRODINDMISMEI",
    },
    "JPN": {
        "gdp_growth": "JPNRGDPEXP",
        "inflation": "JPNCPIALLMINMEI",
        "unemployment": "LRHUTTTTJPM156S",
        "interest_rate": "IR3TIB01JPM156N",
        "industrial_production": "JPNPROINDMISMEI",
    },
    "DEU": {
        "gdp_growth": "CLVMNACSCAB1GQDE",
        "inflation": "DEUCPIALLMINMEI",
        "unemployment": "LRHUTTTTDEM156S",
        "interest_rate": "IR3TIB01DEM156N",
        "industrial_production": "DEUPROINDMISMEI",
    },
    "IND": {
        "gdp_growth": "MKTGDPINA646NWDB",
        "inflation": "INDCPIALLMINMEI",
        "unemployment": "LRUN64TTINQ156S",
        "interest_rate": "INTDSRINM193N",
        "industrial_production": "INDPROINDMISMEI",
    },
    "GBR": {
        "gdp_growth": "CLVMNACSCAB1GQUK",
        "inflation": "GBRCPIALLMINMEI",
        "unemployment": "LRHUTTTTGBM156S",
        "interest_rate": "IR3TIB01GBM156N",
        "industrial_production": "GBRPROINDMISMEI",
    },
    "FRA": {
        "gdp_growth": "CLVMNACSCAB1GQFR",
        "inflation": "FRACPIALLMINMEI",
        "unemployment": "LRHUTTTTFRM156S",
        "interest_rate": "IR3TIB01FRM156N",
        "industrial_production": "FRAPROINDMISMEI",
    },
    "ITA": {
        "gdp_growth": "CLVMNACSCAB1GQIT",
        "inflation": "ITACPIALLMINMEI",
        "unemployment": "LRHUTTTTITM156S",
        "interest_rate": "IR3TIB01ITM156N",
        "industrial_production": "ITAPROINDMISMEI",
    },
    "BRA": {
        "gdp_growth": "MKTGDPBRA646NWDB",
        "inflation": "BRACPIALLMINMEI",
        "unemployment": "LRUN64TTBRQ156S",
        "interest_rate": "INTDSRBRM193N",
        "industrial_production": "BRAPROINDMISMEI",
    },
    "CAN": {
        "gdp_growth": "NGDPRSAXDCCAQ",
        "inflation": "CPALCY01CAM661N",
        "unemployment": "LRUNTTTTCAM156S",
        "interest_rate": "IR3TIB01CAM156N",
        "industrial_production": "CANPROINDMISMEI",
    },
    "KOR": {
        "gdp_growth": "KORRGDPEXP",
        "inflation": "KORCPIALLMINMEI",
        "unemployment": "LRHUTTTTKRM156S",
        "interest_rate": "IR3TIB01KRM156N",
        "industrial_production": "KORPROINDMISMEI",
    },
    "ESP": {
        "gdp_growth": "CLVMNACSCAB1GQES",
        "inflation": "ESPCPIALLMINMEI",
        "unemployment": "LRHUTTTTESM156S",
        "interest_rate": "IR3TIB01ESM156N",
        "industrial_production": "ESPPROINDMISMEI",
    },
    "AUS": {
        "gdp_growth": "AUSRGDPEXP",
        "inflation": "AUSCPIALLMINMEI",
        "unemployment": "LRHUTTTTAUM156S",
        "interest_rate": "IR3TIB01AUM156N",
        "industrial_production": "AUSPROINDMISMEI",
    },
    "RUS": {
        "gdp_growth": "MKTGDPRUA646NWDB",
        "inflation": "RUSCPIALLMINMEI",
        "unemployment": "LRUN64TTRUQ156S",
        "interest_rate": "INTDSRRUM193N",
        "industrial_production": "RUSPROINDMISMEI",
    },
    "MEX": {
        "gdp_growth": "MKTGDPMXA646NWDB",
        "inflation": "MEXCPIALLMINMEI",
        "unemployment": "LRUN64TTMXQ156S",
        "interest_rate": "INTDSRMXM193N",
        "industrial_production": "MEXPROINDMISMEI",
    },
    "IDN": {
        "gdp_growth": "MKTGDPIDA646NWDB",
        "inflation": "IDNCPIALLMINMEI",
        "unemployment": "LRUN64TTIDQ156S",
        "interest_rate": "INTDSRIDM193N",
    },
    "NLD": {
        "gdp_growth": "CLVMNACSCAB1GQNL",
        "inflation": "NLDCPIALLMINMEI",
        "unemployment": "LRHUTTTTNLM156S",
        "interest_rate": "IR3TIB01NLM156N",
        "industrial_production": "NLDPROINDMISMEI",
    },
    "SAU": {
        "gdp_growth": "MKTGDPSAA646NWDB",
        "inflation": "SAUCPIALLMINMEI",
        "interest_rate": "INTDSRSAM193N",
    },
    "TUR": {
        "gdp_growth": "MKTGDPTRA646NWDB",
        "inflation": "TURCPIALLMINMEI",
        "unemployment": "LRUN64TTTRQ156S",
        "interest_rate": "INTDSRTRM193N",
        "industrial_production": "TURPROINDMISMEI",
    },
    "CHE": {
        "gdp_growth": "CLVMNACSCAB1GQCH",
        "inflation": "CHECPIALLMINMEI",
        "unemployment": "LRHUTTTTCHM156S",
        "interest_rate": "IR3TIB01CHM156N",
        "industrial_production": "CHEPROINDMISMEI",
    },
    "POL": {
        "gdp_growth": "CLVMNACSCAB1GQPL",
        "inflation": "POLCPIALLMINMEI",
        "unemployment": "LRHUTTTTPLM156S",
        "interest_rate": "IR3TIB01PLM156N",
        "industrial_production": "POLPROINDMISMEI",
    },
    "SWE": {
        "gdp_growth": "CLVMNACSCAB1GQSE",
        "inflation": "SWECPIALLMINMEI",
        "unemployment": "LRHUTTTTSEМ156S",
        "interest_rate": "IR3TIB01SEM156N",
        "industrial_production": "SWEPROINDMISMEI",
    },
    "BEL": {
        "gdp_growth": "CLVMNACSCAB1GQBE",
        "inflation": "BELCPIALLMINMEI",
        "unemployment": "LRHUTTTTBEM156S",
        "interest_rate": "IR3TIB01BEM156N",
        "industrial_production": "BELPROINDMISMEI",
    },
    "ARG": {
        "gdp_growth": "MKTGDPARA646NWDB",
        "inflation": "ARGCPIALLMINMEI",
        "unemployment": "LRUN64TTARQ156S",
        "interest_rate": "INTDSRARM193N",
    },
    "NOR": {
        "gdp_growth": "CLVMNACSCAB1GQNO",
        "inflation": "NORCPIALLMINMEI",
        "unemployment": "LRHUTTTTNOM156S",
        "interest_rate": "IR3TIB01NOM156N",
        "industrial_production": "NORPROINDMISMEI",
    },
    "AUT": {
        "gdp_growth": "CLVMNACSCAB1GQAT",
        "inflation": "AUTCPIALLMINMEI",
        "unemployment": "LRHUTTTTAM156S",
        "interest_rate": "IR3TIB01ATM156N",
        "industrial_production": "AUTPROINDMISMEI",
    },
}

# World Bank indicator codes
WORLD_BANK_INDICATORS: Dict[str, str] = {
    "gdp": "NY.GDP.MKTP.CD",
    "gdp_growth": "NY.GDP.MKTP.KD.ZG",
    "gdp_per_capita": "NY.GDP.PCAP.CD",
    "inflation": "FP.CPI.TOTL.ZG",
    "unemployment": "SL.UEM.TOTL.ZS",
    "trade_balance": "BN.GSR.GNFS.CD",
    "current_account": "BN.CAB.XOKA.CD",
    "exports": "NE.EXP.GNFS.CD",
    "imports": "NE.IMP.GNFS.CD",
    "population": "SP.POP.TOTL",
    "industrial_production": "NV.IND.TOTL.CD",
}


def get_country_index(country_code: str) -> int:
    """Get index of country in COUNTRIES list."""
    return COUNTRIES.index(country_code)


def get_countries_by_bloc(bloc_name: str) -> List[str]:
    """Get list of countries in a trade bloc."""
    return TRADE_BLOCS.get(bloc_name, [])


def get_country_metadata(country_code: str) -> Dict:
    """Get all metadata for a country."""
    return {
        "code": country_code,
        "name": COUNTRY_NAMES.get(country_code, country_code),
        "coordinates": COUNTRY_COORDINATES.get(country_code, (0.0, 0.0)),
        "development_level": DEVELOPMENT_LEVELS.get(country_code, 1),
        "gdp": GDP_ESTIMATES.get(country_code, 0.0),
        "population": POPULATION_ESTIMATES.get(country_code, 0.0),
    }
