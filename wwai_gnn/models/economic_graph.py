# Copyright 2024 WWAI Project
#
# Economic graph construction for GraphEconCast using TypedGraph.
# This is the key fix from the broken implementation: returns TypedGraph
# instead of jraph.GraphsTuple.

"""Economic graph builder that creates TypedGraph compatible with DeepTypedGraphNet."""

from typing import Dict, List, Optional, Tuple
import numpy as np
import jax.numpy as jnp

from wwai_gnn.core.typed_graph import (
    TypedGraph,
    NodeSet,
    EdgeSet,
    EdgesIndices,
    EdgeSetKey,
    Context,
)


# Default 26 countries for economic analysis
DEFAULT_COUNTRIES = [
    "USA", "CHN", "JPN", "DEU", "IND", "GBR", "FRA", "ITA", "BRA", "CAN",
    "KOR", "ESP", "AUS", "RUS", "MEX", "IDN", "NLD", "SAU", "TUR", "CHE",
    "POL", "SWE", "BEL", "ARG", "NOR", "AUT",
]


# Country coordinates (latitude, longitude)
COUNTRY_COORDINATES = {
    "USA": (39.0, -98.0), "CHN": (35.0, 105.0), "JPN": (36.0, 138.0),
    "DEU": (51.0, 10.0), "IND": (20.0, 77.0), "GBR": (54.0, -2.0),
    "FRA": (46.0, 2.0), "ITA": (42.5, 12.5), "BRA": (-10.0, -55.0),
    "CAN": (56.0, -106.0), "KOR": (36.0, 128.0), "ESP": (40.0, -4.0),
    "AUS": (-25.0, 135.0), "RUS": (60.0, 100.0), "MEX": (23.0, -102.0),
    "IDN": (-5.0, 120.0), "NLD": (52.5, 5.75), "SAU": (24.0, 45.0),
    "TUR": (39.0, 35.0), "CHE": (47.0, 8.0), "POL": (52.0, 20.0),
    "SWE": (62.0, 15.0), "BEL": (50.5, 4.5), "ARG": (-38.0, -64.0),
    "NOR": (62.0, 10.0), "AUT": (47.5, 14.5),
}


# Geographic neighbors
GEOGRAPHIC_NEIGHBORS = {
    "USA": ["CAN", "MEX"],
    "CAN": ["USA"],
    "MEX": ["USA"],
    "DEU": ["FRA", "POL", "AUT", "CHE", "NLD", "BEL"],
    "FRA": ["DEU", "ITA", "ESP", "CHE", "BEL"],
    "ITA": ["FRA", "CHE", "AUT"],
    "ESP": ["FRA"],
    "POL": ["DEU", "RUS"],
    "RUS": ["POL", "CHN"],
    "CHN": ["RUS", "IND", "KOR"],
    "IND": ["CHN"],
    "KOR": ["CHN"],
    "BRA": ["ARG"],
    "ARG": ["BRA"],
    "NLD": ["DEU", "BEL"],
    "BEL": ["DEU", "FRA", "NLD"],
    "CHE": ["DEU", "FRA", "ITA", "AUT"],
    "AUT": ["DEU", "ITA", "CHE"],
    "SWE": ["NOR"],
    "NOR": ["SWE"],
}


# Trade blocs
TRADE_BLOCS = {
    "EU": ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"],
    "NAFTA": ["USA", "CAN", "MEX"],
    "BRICS": ["BRA", "RUS", "IND", "CHN"],
    "G7": ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "JPN"],
}


class EconomicGraphBuilder:
    """Builds economic graphs with trade, geographic, and similarity edges.

    Key difference from broken implementation: Returns TypedGraph instead of
    jraph.GraphsTuple, making it compatible with DeepTypedGraphNet.
    """

    def __init__(
        self,
        countries: Optional[List[str]] = None,
        k_trade: int = 10,
        k_similar: int = 5,
        distance_threshold_km: float = 2000.0,
    ):
        """Initialize the economic graph builder.

        Args:
            countries: List of country codes. Defaults to 26 major economies.
            k_trade: Number of top trade partners per country.
            k_similar: Number of most similar countries per country.
            distance_threshold_km: Max distance for geographic edges.
        """
        self.countries = countries or DEFAULT_COUNTRIES
        self.n_countries = len(self.countries)
        self.k_trade = min(k_trade, self.n_countries - 1)
        self.k_similar = min(k_similar, self.n_countries - 1)
        self.distance_threshold = distance_threshold_km

        # Build country index
        self.country_to_idx = {c: i for i, c in enumerate(self.countries)}

        # Cache distance matrix
        self._distance_matrix = self._compute_distance_matrix()

    def _compute_distance_matrix(self) -> np.ndarray:
        """Compute haversine distance matrix between all countries."""
        n = self.n_countries
        dist = np.zeros((n, n))

        for i, c1 in enumerate(self.countries):
            for j, c2 in enumerate(self.countries):
                if i != j:
                    dist[i, j] = self._haversine_distance(c1, c2)

        return dist

    def _haversine_distance(self, country1: str, country2: str) -> float:
        """Calculate haversine distance between two countries in km."""
        if country1 not in COUNTRY_COORDINATES or country2 not in COUNTRY_COORDINATES:
            return 10000.0  # Default large distance

        lat1, lon1 = COUNTRY_COORDINATES[country1]
        lat2, lon2 = COUNTRY_COORDINATES[country2]

        R = 6371  # Earth's radius in km

        lat1, lat2, lon1, lon2 = map(np.radians, [lat1, lat2, lon1, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))

        return R * c

    def build_trade_edges(
        self,
        trade_matrix: Optional[np.ndarray] = None
    ) -> Tuple[List[int], List[int], np.ndarray]:
        """Build trade edges from bilateral trade data.

        Args:
            trade_matrix: (n_countries, n_countries) matrix of trade volumes.
                         If None, uses synthetic gravity model.

        Returns:
            senders, receivers, edge_features
        """
        if trade_matrix is None:
            trade_matrix = self._synthetic_trade_matrix()

        senders = []
        receivers = []
        features = []

        for i in range(self.n_countries):
            # Get top-k trade partners
            trade_volumes = trade_matrix[i, :]
            trade_volumes[i] = -np.inf  # Exclude self
            top_partners = np.argsort(trade_volumes)[::-1][:self.k_trade]

            for j in top_partners:
                if trade_matrix[i, j] > 0:
                    senders.append(i)
                    receivers.append(j)
                    # Edge features: trade volume, distance, bloc membership
                    dist_norm = self._distance_matrix[i, j] / 20000  # Normalize
                    same_bloc = float(self._same_trade_bloc(
                        self.countries[i], self.countries[j]))
                    features.append([trade_matrix[i, j], dist_norm, same_bloc])

        return senders, receivers, np.array(features) if features else np.zeros((0, 3))

    def _synthetic_trade_matrix(self) -> np.ndarray:
        """Generate synthetic trade matrix using gravity model."""
        n = self.n_countries
        trade = np.zeros((n, n))

        # Approximate GDP weights (normalized)
        gdp_weights = {
            "USA": 1.0, "CHN": 0.8, "JPN": 0.3, "DEU": 0.25, "IND": 0.18,
            "GBR": 0.18, "FRA": 0.17, "ITA": 0.12, "BRA": 0.1, "CAN": 0.1,
            "KOR": 0.09, "ESP": 0.08, "AUS": 0.08, "RUS": 0.08, "MEX": 0.07,
            "IDN": 0.06, "NLD": 0.06, "SAU": 0.05, "TUR": 0.05, "CHE": 0.05,
            "POL": 0.04, "SWE": 0.04, "BEL": 0.04, "ARG": 0.03, "NOR": 0.03,
            "AUT": 0.03,
        }

        for i in range(n):
            for j in range(n):
                if i != j:
                    gi = gdp_weights.get(self.countries[i], 0.02)
                    gj = gdp_weights.get(self.countries[j], 0.02)
                    dist = max(self._distance_matrix[i, j], 100)  # Min 100km

                    # Gravity model: trade ~ (GDP_i * GDP_j) / distance^1.5
                    trade[i, j] = (gi * gj) / (dist / 1000) ** 1.5

                    # Boost trade within same bloc
                    if self._same_trade_bloc(self.countries[i], self.countries[j]):
                        trade[i, j] *= 2.0

        # Normalize
        if trade.max() > 0:
            trade = trade / trade.max()

        return trade

    def _same_trade_bloc(self, c1: str, c2: str) -> bool:
        """Check if two countries are in the same trade bloc."""
        for bloc, members in TRADE_BLOCS.items():
            if c1 in members and c2 in members:
                return True
        return False

    def build_geographic_edges(self) -> Tuple[List[int], List[int], np.ndarray]:
        """Build geographic edges based on neighbors and proximity.

        Returns:
            senders, receivers, edge_features
        """
        senders = []
        receivers = []
        features = []

        for i, c1 in enumerate(self.countries):
            # Direct neighbors
            neighbors = GEOGRAPHIC_NEIGHBORS.get(c1, [])
            for neighbor in neighbors:
                if neighbor in self.country_to_idx:
                    j = self.country_to_idx[neighbor]
                    senders.append(i)
                    receivers.append(j)
                    dist_norm = self._distance_matrix[i, j] / 20000
                    features.append([1.0, dist_norm, 0.0])  # direct neighbor

            # Proximity edges (within threshold, not already neighbors)
            for j, c2 in enumerate(self.countries):
                if i != j and c2 not in neighbors:
                    dist = self._distance_matrix[i, j]
                    if dist < self.distance_threshold:
                        senders.append(i)
                        receivers.append(j)
                        proximity = 1.0 - (dist / self.distance_threshold)
                        dist_norm = dist / 20000
                        features.append([proximity, dist_norm, 0.0])

        return senders, receivers, np.array(features) if features else np.zeros((0, 3))

    def build_similarity_edges(
        self,
        similarity_matrix: Optional[np.ndarray] = None
    ) -> Tuple[List[int], List[int], np.ndarray]:
        """Build similarity edges based on economic indicators.

        Args:
            similarity_matrix: (n_countries, n_countries) similarity scores.
                              If None, uses synthetic similarity.

        Returns:
            senders, receivers, edge_features
        """
        if similarity_matrix is None:
            similarity_matrix = self._synthetic_similarity_matrix()

        senders = []
        receivers = []
        features = []

        for i in range(self.n_countries):
            # Get top-k most similar
            sim_scores = similarity_matrix[i, :].copy()
            sim_scores[i] = -np.inf  # Exclude self
            top_similar = np.argsort(sim_scores)[::-1][:self.k_similar]

            for j in top_similar:
                if similarity_matrix[i, j] > 0.3:  # Threshold
                    senders.append(i)
                    receivers.append(j)
                    dist_norm = self._distance_matrix[i, j] / 20000
                    same_bloc = float(self._same_trade_bloc(
                        self.countries[i], self.countries[j]))
                    features.append([similarity_matrix[i, j], dist_norm, same_bloc])

        return senders, receivers, np.array(features) if features else np.zeros((0, 3))

    def _synthetic_similarity_matrix(self) -> np.ndarray:
        """Generate synthetic similarity matrix based on development level."""
        n = self.n_countries

        # Development level (0=developing, 1=emerging, 2=developed)
        dev_levels = {
            "USA": 2, "CHN": 1, "JPN": 2, "DEU": 2, "IND": 0,
            "GBR": 2, "FRA": 2, "ITA": 2, "BRA": 1, "CAN": 2,
            "KOR": 2, "ESP": 2, "AUS": 2, "RUS": 1, "MEX": 1,
            "IDN": 0, "NLD": 2, "SAU": 1, "TUR": 1, "CHE": 2,
            "POL": 2, "SWE": 2, "BEL": 2, "ARG": 1, "NOR": 2,
            "AUT": 2,
        }

        similarity = np.zeros((n, n))

        for i in range(n):
            for j in range(n):
                if i != j:
                    level_i = dev_levels.get(self.countries[i], 1)
                    level_j = dev_levels.get(self.countries[j], 1)
                    diff = abs(level_i - level_j)
                    similarity[i, j] = 1.0 - diff * 0.3

                    # Boost similarity within same bloc
                    if self._same_trade_bloc(self.countries[i], self.countries[j]):
                        similarity[i, j] = min(similarity[i, j] + 0.2, 1.0)

        return similarity

    def build_typed_graph(
        self,
        node_features: Optional[np.ndarray] = None,
        trade_matrix: Optional[np.ndarray] = None,
        similarity_matrix: Optional[np.ndarray] = None,
    ) -> TypedGraph:
        """Build complete TypedGraph with all edge types.

        This is the key method that returns TypedGraph instead of GraphsTuple.

        Args:
            node_features: (n_countries, n_features) node features.
                          If None, uses coordinates and development level.
            trade_matrix: Optional trade volume matrix.
            similarity_matrix: Optional similarity matrix.

        Returns:
            TypedGraph compatible with DeepTypedGraphNet.
        """
        # Build default node features if not provided
        if node_features is None:
            node_features = self._default_node_features()

        node_features = jnp.array(node_features, dtype=jnp.float32)

        # Build edge sets
        trade_s, trade_r, trade_f = self.build_trade_edges(trade_matrix)
        geo_s, geo_r, geo_f = self.build_geographic_edges()
        sim_s, sim_r, sim_f = self.build_similarity_edges(similarity_matrix)

        # Create node set
        nodes = {
            "country_nodes": NodeSet(
                n_node=jnp.array([self.n_countries]),
                features=node_features,
            )
        }

        # Create edge sets
        edges = {}

        # Trade edges
        if len(trade_s) > 0:
            trade_key = EdgeSetKey(
                name="trade",
                node_sets=("country_nodes", "country_nodes")
            )
            edges[trade_key] = EdgeSet(
                n_edge=jnp.array([len(trade_s)]),
                indices=EdgesIndices(
                    senders=jnp.array(trade_s, dtype=jnp.int32),
                    receivers=jnp.array(trade_r, dtype=jnp.int32),
                ),
                features=jnp.array(trade_f, dtype=jnp.float32),
            )

        # Geographic edges
        if len(geo_s) > 0:
            geo_key = EdgeSetKey(
                name="geographic",
                node_sets=("country_nodes", "country_nodes")
            )
            edges[geo_key] = EdgeSet(
                n_edge=jnp.array([len(geo_s)]),
                indices=EdgesIndices(
                    senders=jnp.array(geo_s, dtype=jnp.int32),
                    receivers=jnp.array(geo_r, dtype=jnp.int32),
                ),
                features=jnp.array(geo_f, dtype=jnp.float32),
            )

        # Similarity edges
        if len(sim_s) > 0:
            sim_key = EdgeSetKey(
                name="similarity",
                node_sets=("country_nodes", "country_nodes")
            )
            edges[sim_key] = EdgeSet(
                n_edge=jnp.array([len(sim_s)]),
                indices=EdgesIndices(
                    senders=jnp.array(sim_s, dtype=jnp.int32),
                    receivers=jnp.array(sim_r, dtype=jnp.int32),
                ),
                features=jnp.array(sim_f, dtype=jnp.float32),
            )

        # Create context (global features - empty for now)
        context = Context(
            n_graph=jnp.array([1]),
            features=(),
        )

        return TypedGraph(
            context=context,
            nodes=nodes,
            edges=edges,
        )

    def _default_node_features(self) -> np.ndarray:
        """Generate default node features from coordinates and development."""
        features = []

        # Development levels
        dev_levels = {
            "USA": 2, "CHN": 1, "JPN": 2, "DEU": 2, "IND": 0,
            "GBR": 2, "FRA": 2, "ITA": 2, "BRA": 1, "CAN": 2,
            "KOR": 2, "ESP": 2, "AUS": 2, "RUS": 1, "MEX": 1,
            "IDN": 0, "NLD": 2, "SAU": 1, "TUR": 1, "CHE": 2,
            "POL": 2, "SWE": 2, "BEL": 2, "ARG": 1, "NOR": 2,
            "AUT": 2,
        }

        for country in self.countries:
            lat, lon = COUNTRY_COORDINATES.get(country, (0.0, 0.0))
            dev = dev_levels.get(country, 1)

            # Features: lat, lon, sin(lat), cos(lat), sin(lon), cos(lon), dev_level
            lat_rad = np.radians(lat)
            lon_rad = np.radians(lon)
            features.append([
                lat / 90.0,  # Normalized latitude
                lon / 180.0,  # Normalized longitude
                np.sin(lat_rad),
                np.cos(lat_rad),
                np.sin(lon_rad),
                np.cos(lon_rad),
                dev / 2.0,  # Normalized development level
            ])

        return np.array(features, dtype=np.float32)

    def get_statistics(self) -> Dict:
        """Get graph statistics for debugging/logging."""
        trade_s, trade_r, _ = self.build_trade_edges()
        geo_s, geo_r, _ = self.build_geographic_edges()
        sim_s, sim_r, _ = self.build_similarity_edges()

        return {
            "n_countries": self.n_countries,
            "n_trade_edges": len(trade_s),
            "n_geographic_edges": len(geo_s),
            "n_similarity_edges": len(sim_s),
            "total_edges": len(trade_s) + len(geo_s) + len(sim_s),
            "avg_degree_trade": len(trade_s) / self.n_countries,
            "avg_degree_geo": len(geo_s) / self.n_countries,
            "avg_degree_sim": len(sim_s) / self.n_countries,
        }
