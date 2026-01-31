#!/usr/bin/env python3
# Copyright 2024 WWAI Project
#
# Prediction script for GraphEconCast.

"""Generate predictions using trained GraphEconCast model."""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import jax
import jax.numpy as jnp

from wwai_gnn.models.graph_econcast import (
    ModelConfig, TaskConfig, create_model, count_parameters
)
from wwai_gnn.models.economic_graph import EconomicGraphBuilder, DEFAULT_COUNTRIES
from wwai_gnn.data.data_loader import EconomicDataLoader
from wwai_gnn.data.countries import COUNTRY_NAMES


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Generate economic predictions")

    parser.add_argument("--checkpoint", type=str, required=True,
                       help="Path to model checkpoint")
    parser.add_argument("--output", type=str, default="predictions.json",
                       help="Output file for predictions")
    parser.add_argument("--n-timesteps", type=int, default=4,
                       help="Number of input timesteps")
    parser.add_argument("--countries", type=str, nargs="+", default=None,
                       help="List of country codes (default: all 26)")

    return parser.parse_args()


def load_checkpoint(checkpoint_path: str):
    """Load model checkpoint and config."""
    checkpoint_path = Path(checkpoint_path)

    # Load config
    config_path = checkpoint_path.parent / f"{checkpoint_path.stem}_config.json"
    if config_path.exists():
        with open(config_path, "r") as f:
            config = json.load(f)
    else:
        config = {}

    # Create model config
    model_config = ModelConfig(
        latent_size=config.get("model_config", {}).get("latent_size", 256),
        mlp_hidden_size=config.get("model_config", {}).get("mlp_hidden_size", 256),
        mlp_num_hidden_layers=config.get("model_config", {}).get("mlp_num_hidden_layers", 2),
        num_message_passing_steps=config.get("model_config", {}).get("num_message_passing_steps", 8),
    )

    task_config = TaskConfig()

    # Load parameters
    data = np.load(str(checkpoint_path) + ".npz", allow_pickle=True)
    tree_def = data["tree_def"].item()
    flat_params = [data[f"arr_{i}"] for i in range(len(data.files) - 3)]
    params = jax.tree_util.tree_unflatten(tree_def, flat_params)

    return model_config, task_config, params


def main():
    """Main prediction function."""
    args = parse_args()

    print("=" * 60)
    print("WWAI-GNN: Economic Forecasting")
    print("=" * 60)

    # Load checkpoint
    print(f"\nLoading checkpoint: {args.checkpoint}")
    model_config, task_config, params = load_checkpoint(args.checkpoint)

    n_params = count_parameters(params)
    print(f"Loaded model with {n_params:,} parameters")

    # Create model
    model = create_model(model_config, task_config)

    # Set up countries
    countries = args.countries or DEFAULT_COUNTRIES
    print(f"\nGenerating predictions for {len(countries)} countries")

    # Load data
    print("\nLoading economic data...")
    data_loader = EconomicDataLoader(
        countries=countries,
        indicators=list(task_config.input_features),
    )
    data_loader.load_data()

    # Get latest features
    input_feat, _, static_feat = data_loader.get_feature_matrix(
        n_timesteps=args.n_timesteps,
    )

    # Combine features
    combined = np.concatenate([static_feat, input_feat], axis=-1)

    # Build graph
    graph_builder = EconomicGraphBuilder(countries=countries)
    graph = graph_builder.build_typed_graph(node_features=combined)

    # Generate predictions
    print("\nGenerating predictions...")
    output_graph = model.apply(params, graph, is_training=False)
    predictions = np.array(output_graph.nodes["country_nodes"].features)

    # Format results
    feature_names = list(task_config.target_features)
    results = {
        "timestamp": datetime.now().isoformat(),
        "model_checkpoint": args.checkpoint,
        "predictions": {}
    }

    for i, country in enumerate(countries):
        country_name = COUNTRY_NAMES.get(country, country)
        results["predictions"][country] = {
            "name": country_name,
            "forecasts": {
                name: float(predictions[i, j])
                for j, name in enumerate(feature_names)
            }
        }

    # Save results
    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nPredictions saved to: {args.output}")

    # Print summary
    print("\n" + "=" * 60)
    print("Prediction Summary")
    print("=" * 60)
    print(f"\n{'Country':<20} {'GDP Growth':<12} {'Inflation':<12} {'Unemployment':<12}")
    print("-" * 56)

    for country in countries[:10]:  # Show top 10
        preds = results["predictions"][country]["forecasts"]
        print(f"{COUNTRY_NAMES.get(country, country):<20} "
              f"{preds.get('gdp_growth_rate', 0):>10.2f}% "
              f"{preds.get('inflation_rate', 0):>10.2f}% "
              f"{preds.get('unemployment_rate', 0):>10.2f}%")

    if len(countries) > 10:
        print(f"... and {len(countries) - 10} more countries")


if __name__ == "__main__":
    main()
