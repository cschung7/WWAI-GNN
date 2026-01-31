#!/usr/bin/env python3
# Copyright 2024 WWAI Project
#
# Training script for GraphEconCast.

"""Train GraphEconCast model for economic forecasting."""

import argparse
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import jax
import jax.numpy as jnp

from wwai_gnn.models.graph_econcast import ModelConfig, TaskConfig
from wwai_gnn.training.trainer import Trainer, TrainingConfig


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Train GraphEconCast model")

    # Model config
    parser.add_argument("--latent-size", type=int, default=256,
                       help="Latent dimension size")
    parser.add_argument("--num-message-passing", type=int, default=8,
                       help="Number of message passing steps")
    parser.add_argument("--hidden-layers", type=int, default=2,
                       help="Number of hidden layers in MLPs")

    # Training config
    parser.add_argument("--epochs", type=int, default=100,
                       help="Number of training epochs")
    parser.add_argument("--learning-rate", type=float, default=1e-3,
                       help="Learning rate")
    parser.add_argument("--batch-size", type=int, default=8,
                       help="Batch size")
    parser.add_argument("--n-timesteps", type=int, default=4,
                       help="Number of input timesteps (quarters)")

    # Paths
    parser.add_argument("--checkpoint-dir", type=str, default="data/checkpoints",
                       help="Directory for saving checkpoints")
    parser.add_argument("--log-dir", type=str, default="data/logs",
                       help="Directory for logs")

    # Other
    parser.add_argument("--seed", type=int, default=42,
                       help="Random seed")
    parser.add_argument("--resume", type=str, default=None,
                       help="Resume from checkpoint")

    return parser.parse_args()


def main():
    """Main training function."""
    args = parse_args()

    print("=" * 60)
    print("WWAI-GNN: GraphEconCast Training")
    print("=" * 60)

    # Set random seed
    rng_key = jax.random.PRNGKey(args.seed)

    # Create configs
    model_config = ModelConfig(
        latent_size=args.latent_size,
        mlp_hidden_size=args.latent_size,
        mlp_num_hidden_layers=args.hidden_layers,
        num_message_passing_steps=args.num_message_passing,
    )

    task_config = TaskConfig(
        input_features=(
            "gdp_growth_rate",
            "inflation_rate",
            "unemployment_rate",
            "interest_rate",
            "trade_balance",
        ),
        target_features=(
            "gdp_growth_rate",
            "inflation_rate",
            "unemployment_rate",
            "interest_rate",
            "trade_balance",
        ),
        num_input_timesteps=args.n_timesteps,
    )

    training_config = TrainingConfig(
        learning_rate=args.learning_rate,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        n_timesteps=args.n_timesteps,
        checkpoint_dir=args.checkpoint_dir,
        log_dir=args.log_dir,
    )

    # Print config
    print("\nModel Configuration:")
    print(f"  Latent size: {model_config.latent_size}")
    print(f"  Message passing steps: {model_config.num_message_passing_steps}")
    print(f"  Hidden layers: {model_config.mlp_num_hidden_layers}")

    print("\nTraining Configuration:")
    print(f"  Epochs: {training_config.num_epochs}")
    print(f"  Learning rate: {training_config.learning_rate}")
    print(f"  Batch size: {training_config.batch_size}")
    print(f"  Input timesteps: {training_config.n_timesteps}")

    # Create trainer
    trainer = Trainer(
        model_config=model_config,
        task_config=task_config,
        training_config=training_config,
    )

    # Resume from checkpoint if specified
    if args.resume:
        trainer.load_checkpoint(args.resume)

    # Train
    print("\nStarting training...")
    history = trainer.train(rng_key)

    # Save final checkpoint
    trainer.save_checkpoint("final")

    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)

    # Print final metrics
    if history["val_loss"]:
        print(f"Best validation loss: {min(history['val_loss']):.6f}")
    if history["val_metrics"]:
        final_metrics = history["val_metrics"][-1]
        print(f"Final R²: {final_metrics.get('r2', 0):.4f}")


if __name__ == "__main__":
    main()
