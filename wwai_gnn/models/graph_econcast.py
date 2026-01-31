# Copyright 2024 WWAI Project
#
# GraphEconCast: GNN-based economic forecasting model.
# Adapted from DeepMind's GraphCast architecture.

"""GraphEconCast model with complete encoder → processor → decoder pipeline."""

from typing import Any, Mapping, Optional, Tuple
from dataclasses import dataclass

import haiku as hk
import jax
import jax.numpy as jnp
import numpy as np

from wwai_gnn.core.typed_graph import TypedGraph, NodeSet, Context
from wwai_gnn.core.deep_typed_graph_net import DeepTypedGraphNet
from wwai_gnn.models.economic_graph import EconomicGraphBuilder, DEFAULT_COUNTRIES


@dataclass(frozen=True)
class ModelConfig:
    """Configuration for the GraphEconCast model."""
    latent_size: int = 256
    mlp_hidden_size: int = 256
    mlp_num_hidden_layers: int = 2
    num_message_passing_steps: int = 8
    num_processor_repetitions: int = 1
    use_layer_norm: bool = True
    activation: str = "swish"
    f32_aggregation: bool = True


@dataclass(frozen=True)
class TaskConfig:
    """Configuration for the economic forecasting task."""
    input_features: Tuple[str, ...] = (
        "gdp_growth_rate",
        "inflation_rate",
        "unemployment_rate",
        "interest_rate",
        "trade_balance",
    )
    target_features: Tuple[str, ...] = (
        "gdp_growth_rate",
        "inflation_rate",
        "unemployment_rate",
        "interest_rate",
        "trade_balance",
    )
    static_features: Tuple[str, ...] = (
        "latitude_norm",
        "longitude_norm",
        "latitude_sin",
        "latitude_cos",
        "longitude_sin",
        "longitude_cos",
        "development_level",
    )
    num_input_timesteps: int = 4  # Quarters of history


class GraphEconCast(hk.Module):
    """GraphEconCast: GNN for macroeconomic forecasting.

    Architecture:
        Input → Encoder(1 step) → Processor(N steps) → Decoder → Output

    The encoder embeds input features into latent space.
    The processor runs message passing across the economic graph.
    The decoder projects latent representations to predictions.
    """

    def __init__(
        self,
        model_config: ModelConfig,
        task_config: TaskConfig,
        name: str = "graph_econcast",
    ):
        """Initialize GraphEconCast.

        Args:
            model_config: Model architecture configuration.
            task_config: Task-specific configuration.
            name: Module name.
        """
        super().__init__(name=name)
        self.model_config = model_config
        self.task_config = task_config

        # Calculate feature dimensions
        self.n_input_features = len(task_config.input_features)
        self.n_static_features = len(task_config.static_features)
        self.n_target_features = len(task_config.target_features)

        # Total input node features = static + (dynamic * timesteps)
        self.n_node_input = (
            self.n_static_features +
            self.n_input_features * task_config.num_input_timesteps
        )

    def __call__(
        self,
        graph: TypedGraph,
        is_training: bool = True,
    ) -> TypedGraph:
        """Forward pass of GraphEconCast.

        Args:
            graph: Input TypedGraph with node features.
            is_training: Whether in training mode.

        Returns:
            TypedGraph with prediction features in nodes.
        """
        latent_size = self.model_config.latent_size

        # Define latent sizes for all components
        node_latent_size = {"country_nodes": latent_size}
        edge_latent_size = {
            "trade": latent_size,
            "geographic": latent_size,
            "similarity": latent_size,
        }

        # Filter edge latent sizes to only include edges present in graph
        present_edge_types = {key.name for key in graph.edges.keys()}
        edge_latent_size = {k: v for k, v in edge_latent_size.items()
                          if k in present_edge_types}

        # === ENCODER ===
        # Embeds input features into latent space
        encoder = DeepTypedGraphNet(
            node_latent_size=node_latent_size,
            edge_latent_size=edge_latent_size,
            mlp_hidden_size=self.model_config.mlp_hidden_size,
            mlp_num_hidden_layers=self.model_config.mlp_num_hidden_layers,
            num_message_passing_steps=1,  # Single embedding step
            num_processor_repetitions=1,
            embed_nodes=True,
            embed_edges=True,
            node_output_size=None,  # Keep latent size
            edge_output_size=None,
            include_sent_messages_in_node_update=False,
            use_layer_norm=self.model_config.use_layer_norm,
            activation=self.model_config.activation,
            f32_aggregation=self.model_config.f32_aggregation,
            name="encoder",
        )

        # === PROCESSOR ===
        # Runs message passing across the graph
        processor = DeepTypedGraphNet(
            node_latent_size=node_latent_size,
            edge_latent_size=edge_latent_size,
            mlp_hidden_size=self.model_config.mlp_hidden_size,
            mlp_num_hidden_layers=self.model_config.mlp_num_hidden_layers,
            num_message_passing_steps=self.model_config.num_message_passing_steps,
            num_processor_repetitions=self.model_config.num_processor_repetitions,
            embed_nodes=False,  # Already embedded
            embed_edges=False,
            node_output_size=None,
            edge_output_size=None,
            include_sent_messages_in_node_update=True,
            use_layer_norm=self.model_config.use_layer_norm,
            activation=self.model_config.activation,
            f32_aggregation=False,
            name="processor",
        )

        # === DECODER ===
        # Projects latent to predictions
        decoder = DeepTypedGraphNet(
            node_latent_size=node_latent_size,
            edge_latent_size=edge_latent_size,
            mlp_hidden_size=self.model_config.mlp_hidden_size,
            mlp_num_hidden_layers=self.model_config.mlp_num_hidden_layers,
            num_message_passing_steps=1,
            num_processor_repetitions=1,
            embed_nodes=False,
            embed_edges=False,
            node_output_size={"country_nodes": self.n_target_features},
            edge_output_size=None,
            include_sent_messages_in_node_update=False,
            use_layer_norm=self.model_config.use_layer_norm,
            activation=self.model_config.activation,
            f32_aggregation=False,
            name="decoder",
        )

        # Forward pass
        latent_graph = encoder(graph)
        latent_graph = processor(latent_graph)
        output_graph = decoder(latent_graph)

        return output_graph

    def predict(
        self,
        graph: TypedGraph,
    ) -> jnp.ndarray:
        """Get predictions as a numpy array.

        Args:
            graph: Input TypedGraph.

        Returns:
            Predictions array of shape (n_countries, n_targets).
        """
        output_graph = self(graph, is_training=False)
        return output_graph.nodes["country_nodes"].features


def create_model(
    model_config: Optional[ModelConfig] = None,
    task_config: Optional[TaskConfig] = None,
) -> hk.Transformed:
    """Create a Haiku-transformed GraphEconCast model.

    Args:
        model_config: Model configuration. Uses defaults if None.
        task_config: Task configuration. Uses defaults if None.

    Returns:
        Haiku transformed module with init and apply functions.
    """
    if model_config is None:
        model_config = ModelConfig()
    if task_config is None:
        task_config = TaskConfig()

    def forward_fn(graph: TypedGraph, is_training: bool = True) -> TypedGraph:
        model = GraphEconCast(model_config, task_config)
        return model(graph, is_training)

    # Use without_apply_rng since our model doesn't need stochasticity at inference
    return hk.without_apply_rng(hk.transform(forward_fn))


def create_sample_graph(
    n_countries: int = 26,
    n_input_features: int = 5,
    n_timesteps: int = 4,
    n_static_features: int = 7,
) -> TypedGraph:
    """Create a sample graph for testing/initialization.

    Args:
        n_countries: Number of country nodes.
        n_input_features: Number of dynamic input features.
        n_timesteps: Number of input timesteps.
        n_static_features: Number of static features.

    Returns:
        Sample TypedGraph with random features.
    """
    # Build graph structure
    builder = EconomicGraphBuilder(countries=DEFAULT_COUNTRIES[:n_countries])

    # Create random node features
    total_features = n_static_features + n_input_features * n_timesteps
    node_features = np.random.randn(n_countries, total_features).astype(np.float32)

    return builder.build_typed_graph(node_features=node_features)


def init_model(
    rng_key: jnp.ndarray,
    model_config: Optional[ModelConfig] = None,
    task_config: Optional[TaskConfig] = None,
) -> Tuple[hk.Transformed, Any]:
    """Initialize the model and return params.

    Args:
        rng_key: JAX random key.
        model_config: Model configuration.
        task_config: Task configuration.

    Returns:
        (model, params) tuple.
    """
    if model_config is None:
        model_config = ModelConfig()
    if task_config is None:
        task_config = TaskConfig()

    model = create_model(model_config, task_config)

    # Create sample graph for initialization
    sample_graph = create_sample_graph(
        n_countries=26,
        n_input_features=len(task_config.input_features),
        n_timesteps=task_config.num_input_timesteps,
        n_static_features=len(task_config.static_features),
    )

    # Initialize parameters
    params = model.init(rng_key, sample_graph, is_training=True)

    return model, params


def count_parameters(params: Any) -> int:
    """Count total number of parameters in the model."""
    return sum(x.size for x in jax.tree_util.tree_leaves(params))
