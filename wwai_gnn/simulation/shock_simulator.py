# Copyright 2024 WWAI Project
#
# GNN Shock Simulator - Simulates economic shock propagation through message passing.

"""
GNN-based shock simulation using 8-step message passing.

Unlike VAR's impulse response (linear, variance-based), this captures:
- Non-linear shock propagation
- Multi-hop effects through trade/geographic/similarity edges
- Attention-weighted message passing
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np
import jax
import jax.numpy as jnp
import haiku as hk

from wwai_gnn.core.typed_graph import TypedGraph, NodeSet, EdgeSet, EdgesIndices, EdgeSetKey, Context
from wwai_gnn.models.economic_graph import (
    EconomicGraphBuilder,
    DEFAULT_COUNTRIES,
    COUNTRY_COORDINATES,
    TRADE_BLOCS,
)


@dataclass
class ShockConfig:
    """Configuration for shock simulation."""
    country: str
    variable: str  # gdp_growth_rate, inflation_rate, etc.
    magnitude: float  # Standard deviations
    shock_type: str = "persistent"  # persistent or transient


@dataclass
class StepImpact:
    """Impact recorded at each message passing step."""
    step: int
    country_impacts: Dict[str, Dict[str, float]]  # country -> {variable -> impact}
    edge_weights: Dict[str, List[Tuple[str, str, float]]]  # edge_type -> [(src, dst, weight), ...]


class GNNShockSimulator:
    """Simulates economic shock propagation through GNN message passing.

    This simulator tracks how shocks propagate through the economic network
    over 8 message passing steps, recording intermediate states for visualization.
    """

    # Feature indices
    FEATURE_NAMES = [
        "gdp_growth_rate",
        "inflation_rate",
        "unemployment_rate",
        "interest_rate",
        "trade_balance",
    ]

    def __init__(
        self,
        countries: Optional[List[str]] = None,
        num_message_passing_steps: int = 8,
        decay_factor: float = 0.85,
    ):
        """Initialize the shock simulator.

        Args:
            countries: List of country codes to include.
            num_message_passing_steps: Number of propagation steps (default 8).
            decay_factor: Decay per step for shock magnitude.
        """
        self.countries = countries or DEFAULT_COUNTRIES
        self.n_countries = len(self.countries)
        self.num_steps = num_message_passing_steps
        self.decay_factor = decay_factor

        # Build country index
        self.country_to_idx = {c: i for i, c in enumerate(self.countries)}
        self.idx_to_country = {i: c for c, i in self.country_to_idx.items()}

        # Build graph structure
        self.graph_builder = EconomicGraphBuilder(countries=self.countries)
        self._build_adjacency_matrices()

        # Spillover coefficients (learned in real model, synthetic here)
        self._spillover_coefficients = self._compute_spillover_coefficients()

    def _build_adjacency_matrices(self):
        """Build adjacency matrices for each edge type."""
        n = self.n_countries

        # Trade edges
        trade_s, trade_r, trade_f = self.graph_builder.build_trade_edges()
        self.trade_adj = np.zeros((n, n))
        for i, (s, r) in enumerate(zip(trade_s, trade_r)):
            self.trade_adj[s, r] = trade_f[i, 0] if len(trade_f) > 0 else 0.5

        # Geographic edges (scaled down - proximity is secondary to trade)
        geo_s, geo_r, geo_f = self.graph_builder.build_geographic_edges()
        self.geo_adj = np.zeros((n, n))
        for i, (s, r) in enumerate(zip(geo_s, geo_r)):
            # Scale geographic weights to be comparable to trade weights
            raw_weight = geo_f[i, 0] if len(geo_f) > 0 else 0.5
            self.geo_adj[s, r] = raw_weight * 0.3  # Scale down from 1.0 to 0.3 max

        # Similarity edges
        sim_s, sim_r, sim_f = self.graph_builder.build_similarity_edges()
        self.sim_adj = np.zeros((n, n))
        for i, (s, r) in enumerate(zip(sim_s, sim_r)):
            self.sim_adj[s, r] = sim_f[i, 0] if len(sim_f) > 0 else 0.5

        # Combined adjacency with type weights
        # Trade is dominant for economic shock transmission
        # Geographic proximity has indirect effect (supply chain, regional trade)
        # Similarity captures economic structure correlation
        self.combined_adj = (
            0.70 * self.trade_adj +
            0.15 * self.geo_adj +
            0.15 * self.sim_adj
        )

        # Normalize rows
        row_sums = self.combined_adj.sum(axis=1, keepdims=True)
        row_sums = np.where(row_sums > 0, row_sums, 1.0)
        self.combined_adj_norm = self.combined_adj / row_sums

    def _compute_spillover_coefficients(self) -> np.ndarray:
        """Compute spillover coefficients between countries.

        Returns matrix where [i, j] is impact of shock in i on country j.
        Based on trade intensity, economic integration, and development similarity.
        """
        n = self.n_countries
        coeffs = np.zeros((n, n))

        # GDP weights for computing importance
        gdp_weights = {
            "USA": 1.0, "CHN": 0.8, "JPN": 0.3, "DEU": 0.25, "IND": 0.18,
            "GBR": 0.18, "FRA": 0.17, "ITA": 0.12, "BRA": 0.1, "CAN": 0.1,
            "KOR": 0.09, "ESP": 0.08, "AUS": 0.08, "RUS": 0.08, "MEX": 0.07,
            "IDN": 0.06, "NLD": 0.06, "SAU": 0.05, "TUR": 0.05, "CHE": 0.05,
            "POL": 0.04, "SWE": 0.04, "BEL": 0.04, "ARG": 0.03, "NOR": 0.03,
            "AUT": 0.03,
        }

        for i, c1 in enumerate(self.countries):
            for j, c2 in enumerate(self.countries):
                if i == j:
                    coeffs[i, j] = 1.0  # Self impact
                else:
                    # Base spillover from trade
                    trade_coeff = self.trade_adj[i, j]

                    # Adjust by GDP weight of origin
                    gdp_factor = gdp_weights.get(c1, 0.02)

                    # Boost for same trade bloc
                    bloc_bonus = 1.5 if self._same_bloc(c1, c2) else 1.0

                    coeffs[i, j] = trade_coeff * gdp_factor * bloc_bonus * 0.5

        # Clip to reasonable range
        coeffs = np.clip(coeffs, 0, 0.8)

        return coeffs

    def _same_bloc(self, c1: str, c2: str) -> bool:
        """Check if two countries are in the same trade bloc."""
        for members in TRADE_BLOCS.values():
            if c1 in members and c2 in members:
                return True
        return False

    def simulate_shock(
        self,
        config: ShockConfig,
    ) -> Dict[str, Any]:
        """Simulate shock propagation through the economic network.

        Args:
            config: Shock configuration.

        Returns:
            Dictionary with simulation results including step-by-step impacts.
        """
        if config.country not in self.country_to_idx:
            raise ValueError(f"Unknown country: {config.country}")

        if config.variable not in self.FEATURE_NAMES:
            raise ValueError(f"Unknown variable: {config.variable}")

        origin_idx = self.country_to_idx[config.country]
        var_idx = self.FEATURE_NAMES.index(config.variable)

        # Initialize state: (n_countries, n_features)
        state = np.zeros((self.n_countries, len(self.FEATURE_NAMES)))

        # Apply initial shock
        state[origin_idx, var_idx] = config.magnitude

        # Record step impacts
        step_impacts: List[StepImpact] = []

        # Step 0: Initial shock
        step_impacts.append(self._record_step(0, state))

        # Message passing steps
        for step in range(1, self.num_steps + 1):
            state = self._message_passing_step(state, step)
            step_impacts.append(self._record_step(step, state))

        # Compute final spillover matrix
        spillover_matrix = self._compute_final_spillover(state, origin_idx, config.magnitude)

        return {
            "origin_country": config.country,
            "shock_variable": config.variable,
            "shock_magnitude": config.magnitude,
            "num_steps": self.num_steps,
            "step_impacts": [self._step_impact_to_dict(si) for si in step_impacts],
            "final_impacts": self._extract_final_impacts(state),
            "spillover_matrix": spillover_matrix,
            "graph_structure": self._get_graph_structure(),
        }

    def _message_passing_step(
        self,
        state: np.ndarray,
        step: int,
    ) -> np.ndarray:
        """Perform one message passing step with cross-variable effects.

        In GNN terms: h_i^{t+1} = σ(W_self * h_i^t + Σ_j∈N(i) W_edge * a_ij * h_j^t)

        Extended with cross-variable transmission matrix for economic relationships:
        - Interest rate ↓ → GDP ↑ (expansionary policy)
        - Interest rate ↓ → Inflation ↑ (liquidity effect)
        - GDP ↑ → Unemployment ↓ (Okun's law)
        - GDP ↑ → Trade balance (export competitiveness)
        """
        # =====================================================
        # Step 1: Cross-country spillover (same variable)
        # =====================================================
        messages = self.combined_adj_norm @ state

        # Spillover factors vary by variable
        # Calibrated for realistic IRF-style magnitudes
        # Balance: enough to show meaningful spillover, but not unrealistic
        spillover_factors = np.array([
            0.15,  # GDP: high spillover
            0.10,  # Inflation: medium spillover
            0.08,  # Unemployment: lower spillover
            0.12,  # Interest rate: medium-high spillover
            0.15,  # Trade balance: high spillover
        ])

        weighted_messages = messages * spillover_factors

        # =====================================================
        # Step 2: Cross-variable transmission (within country)
        # =====================================================
        # Variables: [gdp(0), inflation(1), unemployment(2), interest_rate(3), trade_balance(4)]
        #
        # Economic relationships (when source INCREASES):
        # - GDP↑ → Inflation↑, Unemployment↓, Trade↑
        # - Inflation↑ → GDP↓ (cost-push), Interest_rate↑ (Taylor rule)
        # - Unemployment↑ → GDP↓, Inflation↓ (Phillips curve)
        # - Interest_rate↑ → GDP↓, Inflation↓, Unemployment↑ (monetary policy)
        # - Trade_balance↑ → GDP↑
        #
        # Matrix[source, target] = effect of source on target
        cross_var_matrix = np.array([
            #           → gdp    → infl  → unemp  → ir    → trade
            # gdp →
            [            0.0,     0.15,   -0.30,   0.0,    0.15],
            # inflation →
            [           -0.10,    0.0,     0.05,   0.20,  -0.05],
            # unemployment →
            [           -0.20,   -0.10,    0.0,    0.0,   -0.10],
            # interest_rate → (KEY: tightening hurts growth, loosening helps)
            [           -0.25,   -0.15,    0.12,   0.0,   -0.08],
            # trade_balance →
            [            0.20,    0.05,   -0.10,   0.0,    0.0],
        ])

        # Apply cross-variable effects within each country
        # For each country: new_effects[i,j] = sum_k(state[i,k] * matrix[k,j])
        # Scale factor calibrated for realistic IRF magnitudes
        cross_var_effects = state @ cross_var_matrix * 0.04

        # =====================================================
        # Step 3: Combine all effects
        # =====================================================
        # Decay current state
        decayed_state = state * self.decay_factor

        # Combine: decayed + cross-country + cross-variable
        combined = decayed_state + weighted_messages * (1 - self.decay_factor ** step) + cross_var_effects

        # Non-linear activation (tanh to bound values)
        new_state = np.tanh(combined)

        return new_state

    def _record_step(self, step: int, state: np.ndarray) -> StepImpact:
        """Record state at current step."""
        country_impacts = {}

        for i, country in enumerate(self.countries):
            impacts = {}
            for j, var in enumerate(self.FEATURE_NAMES):
                if abs(state[i, j]) > 0.0001:  # Lower threshold to show small spillovers (0.01%+)
                    impacts[var] = float(state[i, j])
            if impacts:
                country_impacts[country] = impacts

        # Record significant edge weights (for visualization)
        edge_weights = {
            "trade": self._get_significant_edges(self.trade_adj, state),
            "geographic": self._get_significant_edges(self.geo_adj, state),
            "similarity": self._get_significant_edges(self.sim_adj, state),
        }

        return StepImpact(
            step=step,
            country_impacts=country_impacts,
            edge_weights=edge_weights,
        )

    def _get_significant_edges(
        self,
        adj: np.ndarray,
        state: np.ndarray,
        threshold: float = 0.1,
    ) -> List[Tuple[str, str, float]]:
        """Get edges with significant flow (active countries with high adjacency)."""
        edges = []
        state_magnitude = np.abs(state).sum(axis=1)

        for i in range(self.n_countries):
            if state_magnitude[i] > threshold:
                for j in range(self.n_countries):
                    if i != j and adj[i, j] > 0.05:
                        weight = adj[i, j] * state_magnitude[i]
                        if weight > threshold:
                            edges.append((
                                self.idx_to_country[i],
                                self.idx_to_country[j],
                                float(weight),
                            ))

        return sorted(edges, key=lambda x: -x[2])[:20]  # Top 20

    def _compute_final_spillover(
        self,
        state: np.ndarray,
        origin_idx: int,
        shock_magnitude: float,
    ) -> Dict[str, Dict[str, float]]:
        """Compute spillover matrix from final state."""
        spillover = {}
        origin = self.idx_to_country[origin_idx]

        spillover[origin] = {}
        for j, country in enumerate(self.countries):
            total_impact = float(np.abs(state[j]).sum())
            spillover[origin][country] = total_impact / max(abs(shock_magnitude), 0.01)

        return spillover

    def _extract_final_impacts(self, state: np.ndarray) -> Dict[str, Dict[str, float]]:
        """Extract final impacts per country."""
        impacts = {}

        for i, country in enumerate(self.countries):
            country_impact = {}
            for j, var in enumerate(self.FEATURE_NAMES):
                country_impact[var] = float(state[i, j])
            impacts[country] = country_impact

        return impacts

    def _step_impact_to_dict(self, step_impact: StepImpact) -> Dict:
        """Convert StepImpact to JSON-serializable dict."""
        return {
            "step": step_impact.step,
            "country_impacts": step_impact.country_impacts,
            "edge_weights": step_impact.edge_weights,
        }

    def _get_graph_structure(self) -> Dict:
        """Get graph structure for visualization."""
        nodes = []
        for i, country in enumerate(self.countries):
            lat, lon = COUNTRY_COORDINATES.get(country, (0, 0))
            nodes.append({
                "code": country,
                "index": i,
                "latitude": lat,
                "longitude": lon,
            })

        edges = {
            "trade": [],
            "geographic": [],
            "similarity": [],
        }

        # Trade edges
        trade_s, trade_r, trade_f = self.graph_builder.build_trade_edges()
        for i, (s, r) in enumerate(zip(trade_s, trade_r)):
            edges["trade"].append({
                "source": self.idx_to_country[s],
                "target": self.idx_to_country[r],
                "weight": float(trade_f[i, 0]) if len(trade_f) > 0 else 0.5,
            })

        # Geographic edges
        geo_s, geo_r, geo_f = self.graph_builder.build_geographic_edges()
        for i, (s, r) in enumerate(zip(geo_s, geo_r)):
            edges["geographic"].append({
                "source": self.idx_to_country[s],
                "target": self.idx_to_country[r],
                "weight": float(geo_f[i, 0]) if len(geo_f) > 0 else 0.5,
            })

        # Similarity edges
        sim_s, sim_r, sim_f = self.graph_builder.build_similarity_edges()
        for i, (s, r) in enumerate(zip(sim_s, sim_r)):
            edges["similarity"].append({
                "source": self.idx_to_country[s],
                "target": self.idx_to_country[r],
                "weight": float(sim_f[i, 0]) if len(sim_f) > 0 else 0.5,
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "statistics": self.graph_builder.get_statistics(),
        }

    def get_spillover_matrix(self) -> Dict[str, Dict[str, float]]:
        """Get precomputed spillover coefficients."""
        matrix = {}
        for i, c1 in enumerate(self.countries):
            matrix[c1] = {}
            for j, c2 in enumerate(self.countries):
                matrix[c1][c2] = float(self._spillover_coefficients[i, j])
        return matrix

    def get_countries(self) -> List[Dict]:
        """Get country list with metadata."""
        countries = []
        for country in self.countries:
            lat, lon = COUNTRY_COORDINATES.get(country, (0, 0))
            countries.append({
                "code": country,
                "latitude": lat,
                "longitude": lon,
            })
        return countries
