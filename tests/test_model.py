#!/usr/bin/env python3
"""Tests for WWAI-GNN model components."""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import jax
import jax.numpy as jnp
import pytest


class TestTypedGraph:
    """Tests for TypedGraph data structure."""

    def test_typed_graph_creation(self):
        """Test creating a TypedGraph."""
        from wwai_gnn.core.typed_graph import (
            TypedGraph, NodeSet, EdgeSet, EdgesIndices, EdgeSetKey, Context
        )

        # Create node set
        nodes = {
            "test_nodes": NodeSet(
                n_node=jnp.array([5]),
                features=jnp.ones((5, 10)),
            )
        }

        # Create edge set
        edge_key = EdgeSetKey(name="test_edges", node_sets=("test_nodes", "test_nodes"))
        edges = {
            edge_key: EdgeSet(
                n_edge=jnp.array([8]),
                indices=EdgesIndices(
                    senders=jnp.array([0, 1, 2, 3, 0, 1, 2, 3]),
                    receivers=jnp.array([1, 2, 3, 4, 2, 3, 4, 0]),
                ),
                features=jnp.ones((8, 3)),
            )
        }

        # Create context
        context = Context(n_graph=jnp.array([1]), features=())

        # Create graph
        graph = TypedGraph(context=context, nodes=nodes, edges=edges)

        assert graph.nodes["test_nodes"].features.shape == (5, 10)
        assert graph.edges[edge_key].features.shape == (8, 3)

    def test_edge_lookup(self):
        """Test edge lookup by name."""
        from wwai_gnn.core.typed_graph import (
            TypedGraph, NodeSet, EdgeSet, EdgesIndices, EdgeSetKey, Context
        )

        nodes = {"n": NodeSet(n_node=jnp.array([2]), features=jnp.ones((2, 3)))}
        edge_key = EdgeSetKey(name="e", node_sets=("n", "n"))
        edges = {
            edge_key: EdgeSet(
                n_edge=jnp.array([1]),
                indices=EdgesIndices(senders=jnp.array([0]), receivers=jnp.array([1])),
                features=jnp.ones((1, 2)),
            )
        }
        context = Context(n_graph=jnp.array([1]), features=())

        graph = TypedGraph(context=context, nodes=nodes, edges=edges)

        # Test lookup
        found_key = graph.edge_key_by_name("e")
        assert found_key == edge_key

        found_edge = graph.edge_by_name("e")
        assert found_edge.features.shape == (1, 2)


class TestEconomicGraph:
    """Tests for EconomicGraphBuilder."""

    def test_graph_builder_init(self):
        """Test graph builder initialization."""
        from wwai_gnn.models.economic_graph import EconomicGraphBuilder

        builder = EconomicGraphBuilder(countries=["USA", "CHN", "DEU"])
        assert builder.n_countries == 3

    def test_build_typed_graph(self):
        """Test building a complete TypedGraph."""
        from wwai_gnn.models.economic_graph import EconomicGraphBuilder

        builder = EconomicGraphBuilder(countries=["USA", "CHN", "DEU", "JPN", "GBR"])
        graph = builder.build_typed_graph()

        # Check node set
        assert "country_nodes" in graph.nodes
        assert graph.nodes["country_nodes"].features.shape[0] == 5

        # Check edge sets exist
        edge_names = {k.name for k in graph.edges.keys()}
        assert "trade" in edge_names
        assert "geographic" in edge_names or "similarity" in edge_names

    def test_graph_statistics(self):
        """Test graph statistics."""
        from wwai_gnn.models.economic_graph import EconomicGraphBuilder

        builder = EconomicGraphBuilder()  # Default 26 countries
        stats = builder.get_statistics()

        assert stats["n_countries"] == 26
        assert stats["total_edges"] > 0


class TestGraphEconCast:
    """Tests for GraphEconCast model."""

    def test_model_creation(self):
        """Test model creation."""
        from wwai_gnn.models.graph_econcast import (
            ModelConfig, TaskConfig, create_model
        )

        model_config = ModelConfig(latent_size=64, num_message_passing_steps=2)
        task_config = TaskConfig()

        model = create_model(model_config, task_config)
        assert model is not None

    def test_model_init_and_forward(self):
        """Test model initialization and forward pass."""
        from wwai_gnn.models.graph_econcast import (
            ModelConfig, TaskConfig, init_model, create_sample_graph
        )

        # Create small model for testing
        model_config = ModelConfig(
            latent_size=32,
            mlp_hidden_size=32,
            mlp_num_hidden_layers=1,
            num_message_passing_steps=2,
        )
        task_config = TaskConfig()

        # Initialize
        rng_key = jax.random.PRNGKey(42)
        model, params = init_model(rng_key, model_config, task_config)

        # Create sample graph
        graph = create_sample_graph(
            n_countries=10,
            n_input_features=5,
            n_timesteps=4,
            n_static_features=7,
        )

        # Forward pass
        output = model.apply(params, graph, is_training=False)

        # Check output
        assert "country_nodes" in output.nodes
        predictions = output.nodes["country_nodes"].features
        assert predictions.shape == (10, 5)  # 10 countries, 5 features

    def test_model_parameter_count(self):
        """Test parameter counting."""
        from wwai_gnn.models.graph_econcast import (
            ModelConfig, TaskConfig, init_model, count_parameters
        )

        model_config = ModelConfig(latent_size=64)
        task_config = TaskConfig()

        rng_key = jax.random.PRNGKey(0)
        _, params = init_model(rng_key, model_config, task_config)

        n_params = count_parameters(params)
        assert n_params > 0
        print(f"Model has {n_params:,} parameters")


class TestLosses:
    """Tests for loss functions."""

    def test_mse_loss(self):
        """Test MSE loss."""
        from wwai_gnn.models.losses import economic_mse_loss

        predictions = jnp.array([[1.0, 2.0], [3.0, 4.0]])
        targets = jnp.array([[1.0, 2.0], [3.0, 4.0]])

        loss = economic_mse_loss(predictions, targets)
        assert float(loss) == 0.0

        targets_diff = jnp.array([[2.0, 3.0], [4.0, 5.0]])
        loss_diff = economic_mse_loss(predictions, targets_diff)
        assert float(loss_diff) == 1.0

    def test_directional_accuracy(self):
        """Test directional accuracy."""
        from wwai_gnn.models.losses import directional_accuracy

        predictions = jnp.array([[2.0], [4.0]])
        targets = jnp.array([[2.5], [3.5]])
        previous = jnp.array([[1.0], [3.0]])

        acc = directional_accuracy(predictions, targets, previous)
        # Both predict increase, actual is increase for first, decrease for second
        assert 0.0 <= float(acc) <= 1.0

    def test_compute_metrics(self):
        """Test metrics computation."""
        from wwai_gnn.models.losses import compute_metrics

        predictions = np.random.randn(10, 5).astype(np.float32)
        targets = predictions + np.random.randn(10, 5).astype(np.float32) * 0.1

        metrics = compute_metrics(predictions, targets)

        assert "mse" in metrics
        assert "mae" in metrics
        assert "rmse" in metrics
        assert "r2" in metrics


class TestDataLoader:
    """Tests for data loading."""

    def test_synthetic_data(self):
        """Test synthetic data generation."""
        from wwai_gnn.data.data_loader import EconomicDataLoader

        loader = EconomicDataLoader(
            countries=["USA", "DEU", "JPN"],
            use_cache=False,
        )

        # Generate synthetic data
        data = loader._generate_synthetic_data("USA")

        assert not data.empty
        assert "gdp_growth" in data.columns or len(data.columns) > 0

    def test_feature_matrix(self):
        """Test feature matrix generation."""
        from wwai_gnn.data.data_loader import EconomicDataLoader

        loader = EconomicDataLoader(
            countries=["USA", "DEU", "JPN"],
            use_cache=False,
        )
        loader.load_data()

        input_feat, target_feat, static_feat = loader.get_feature_matrix(
            n_timesteps=4,
        )

        assert input_feat.shape[0] == 3  # 3 countries
        assert static_feat.shape[0] == 3


def run_tests():
    """Run all tests."""
    print("=" * 60)
    print("WWAI-GNN Test Suite")
    print("=" * 60)

    # Run with pytest if available
    try:
        import pytest
        pytest.main([__file__, "-v"])
    except ImportError:
        # Manual test execution
        print("\nRunning tests manually...\n")

        test_classes = [
            TestTypedGraph,
            TestEconomicGraph,
            TestGraphEconCast,
            TestLosses,
            TestDataLoader,
        ]

        for test_class in test_classes:
            print(f"\n{test_class.__name__}:")
            instance = test_class()

            for method_name in dir(instance):
                if method_name.startswith("test_"):
                    try:
                        getattr(instance, method_name)()
                        print(f"  ✓ {method_name}")
                    except Exception as e:
                        print(f"  ✗ {method_name}: {e}")

        print("\n" + "=" * 60)
        print("Tests completed")
        print("=" * 60)


if __name__ == "__main__":
    run_tests()
