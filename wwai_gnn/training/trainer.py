# Copyright 2024 WWAI Project
#
# Training infrastructure for GraphEconCast.

"""Training loop and utilities for GraphEconCast."""

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np
import jax
import jax.numpy as jnp
import optax
import haiku as hk
from tqdm import tqdm

from wwai_gnn.core.typed_graph import TypedGraph
from wwai_gnn.models.graph_econcast import (
    GraphEconCast,
    ModelConfig,
    TaskConfig,
    create_model,
    create_sample_graph,
    count_parameters,
)
from wwai_gnn.models.economic_graph import EconomicGraphBuilder, DEFAULT_COUNTRIES
from wwai_gnn.models.losses import economic_mse_loss, compute_metrics
from wwai_gnn.data.data_loader import EconomicDataLoader


@dataclass
class TrainingConfig:
    """Configuration for training."""
    # Optimizer
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    warmup_steps: int = 100
    max_grad_norm: float = 1.0

    # Training
    num_epochs: int = 100
    batch_size: int = 8
    eval_every: int = 10
    save_every: int = 20

    # Data
    n_timesteps: int = 4
    train_val_split: float = 0.8

    # Paths
    checkpoint_dir: str = "data/checkpoints"
    log_dir: str = "data/logs"

    # Loss
    loss_type: str = "mse"
    per_variable_weights: Dict[int, float] = field(default_factory=lambda: {
        0: 2.0,  # GDP growth (most important)
        1: 2.0,  # Inflation
        2: 1.5,  # Unemployment
        3: 1.0,  # Interest rate
        4: 1.0,  # Trade balance
    })


class Trainer:
    """Trainer for GraphEconCast model."""

    def __init__(
        self,
        model_config: ModelConfig,
        task_config: TaskConfig,
        training_config: TrainingConfig,
        countries: Optional[List[str]] = None,
    ):
        """Initialize trainer.

        Args:
            model_config: Model architecture config.
            task_config: Task configuration.
            training_config: Training hyperparameters.
            countries: List of country codes.
        """
        self.model_config = model_config
        self.task_config = task_config
        self.training_config = training_config
        self.countries = countries or DEFAULT_COUNTRIES

        # Create directories
        Path(training_config.checkpoint_dir).mkdir(parents=True, exist_ok=True)
        Path(training_config.log_dir).mkdir(parents=True, exist_ok=True)

        # Initialize model
        self.model = create_model(model_config, task_config)

        # Initialize graph builder
        self.graph_builder = EconomicGraphBuilder(countries=self.countries)

        # Initialize data loader
        self.data_loader = EconomicDataLoader(
            countries=self.countries,
            indicators=list(task_config.input_features),
        )

        # State
        self.params = None
        self.opt_state = None
        self.step = 0
        self.best_val_loss = float("inf")
        self.history: List[Dict] = []

    def initialize(self, rng_key: jnp.ndarray) -> None:
        """Initialize model parameters and optimizer.

        Args:
            rng_key: JAX random key.
        """
        # Create sample graph for initialization
        sample_graph = self._create_graph_from_features(
            np.random.randn(len(self.countries), self._get_input_dim())
        )

        # Initialize parameters
        self.params = self.model.init(rng_key, sample_graph, is_training=True)

        # Create optimizer
        schedule = optax.warmup_cosine_decay_schedule(
            init_value=0.0,
            peak_value=self.training_config.learning_rate,
            warmup_steps=self.training_config.warmup_steps,
            decay_steps=self.training_config.num_epochs * 100,
            end_value=self.training_config.learning_rate * 0.01,
        )

        self.optimizer = optax.chain(
            optax.clip_by_global_norm(self.training_config.max_grad_norm),
            optax.adamw(schedule, weight_decay=self.training_config.weight_decay),
        )

        self.opt_state = self.optimizer.init(self.params)

        n_params = count_parameters(self.params)
        print(f"Initialized model with {n_params:,} parameters")

    def _get_input_dim(self) -> int:
        """Get input feature dimension."""
        n_static = len(self.task_config.static_features)
        n_dynamic = len(self.task_config.input_features)
        n_timesteps = self.task_config.num_input_timesteps
        return n_static + n_dynamic * n_timesteps

    def _create_graph_from_features(
        self,
        node_features: np.ndarray,
    ) -> TypedGraph:
        """Create TypedGraph with given node features."""
        return self.graph_builder.build_typed_graph(node_features=node_features)

    def train(self, rng_key: jnp.ndarray) -> Dict[str, List[float]]:
        """Run training loop.

        Args:
            rng_key: JAX random key.

        Returns:
            Training history dictionary.
        """
        # Load data
        print("Loading economic data...")
        self.data_loader.load_data()

        # Initialize if not done
        if self.params is None:
            rng_key, init_key = jax.random.split(rng_key)
            self.initialize(init_key)

        # Get training dates
        train_dates, val_dates = self._get_train_val_dates()
        print(f"Training samples: {len(train_dates)}, Validation samples: {len(val_dates)}")

        # JIT compile training step
        @jax.jit
        def _train_step(params, opt_state, graph, targets):
            def loss_fn(p):
                output_graph = self.model.apply(p, graph, is_training=True)
                predictions = output_graph.nodes["country_nodes"].features
                return economic_mse_loss(
                    predictions, targets,
                    per_variable_weights=self.training_config.per_variable_weights,
                )

            loss, grads = jax.value_and_grad(loss_fn)(params)
            updates, opt_state_new = self.optimizer.update(grads, opt_state, params)
            params_new = optax.apply_updates(params, updates)
            return params_new, opt_state_new, loss

        # Training loop
        history = {"train_loss": [], "val_loss": [], "val_metrics": []}

        for epoch in range(self.training_config.num_epochs):
            epoch_losses = []

            # Shuffle training dates
            rng_key, shuffle_key = jax.random.split(rng_key)
            train_indices = jax.random.permutation(shuffle_key, len(train_dates))
            shuffled_dates = [train_dates[i] for i in train_indices]

            # Training batches
            for i in range(0, len(shuffled_dates), self.training_config.batch_size):
                batch_dates = shuffled_dates[i:i + self.training_config.batch_size]

                # Skip incomplete batches
                if len(batch_dates) < self.training_config.batch_size:
                    continue

                # Prepare batch (average over batch for simplicity)
                batch_loss = 0.0
                for date in batch_dates:
                    try:
                        input_feat, target_feat, static_feat = \
                            self.data_loader.get_feature_matrix(
                                n_timesteps=self.training_config.n_timesteps,
                                target_date=date,
                            )

                        # Combine features
                        combined = np.concatenate([static_feat, input_feat], axis=-1)
                        graph = self._create_graph_from_features(combined)
                        targets = jnp.array(target_feat, dtype=jnp.float32)

                        # Training step
                        self.params, self.opt_state, loss = _train_step(
                            self.params, self.opt_state, graph, targets
                        )
                        batch_loss += float(loss)
                    except Exception as e:
                        continue

                if batch_loss > 0:
                    epoch_losses.append(batch_loss / len(batch_dates))
                    self.step += 1

            # Epoch summary
            avg_train_loss = np.mean(epoch_losses) if epoch_losses else 0.0
            history["train_loss"].append(avg_train_loss)

            # Validation
            if (epoch + 1) % self.training_config.eval_every == 0:
                val_loss, val_metrics = self._evaluate(val_dates)
                history["val_loss"].append(val_loss)
                history["val_metrics"].append(val_metrics)

                print(f"Epoch {epoch + 1}/{self.training_config.num_epochs} | "
                      f"Train Loss: {avg_train_loss:.4f} | "
                      f"Val Loss: {val_loss:.4f} | "
                      f"Val R²: {val_metrics.get('r2', 0):.4f}")

                # Save best model
                if val_loss < self.best_val_loss:
                    self.best_val_loss = val_loss
                    self.save_checkpoint("best")

            # Periodic checkpoint
            if (epoch + 1) % self.training_config.save_every == 0:
                self.save_checkpoint(f"epoch_{epoch + 1}")

        return history

    def _get_train_val_dates(self) -> Tuple[List[str], List[str]]:
        """Split data into training and validation dates."""
        # Get all available dates
        all_dates = set()
        for df in self.data_loader._data.values():
            all_dates.update(df.index.strftime("%Y-%m-%d").tolist())

        # Filter dates with enough history
        min_date = self.data_loader.start_date + \
            pd.Timedelta(days=self.training_config.n_timesteps * 90)
        valid_dates = sorted([d for d in all_dates if d >= min_date.strftime("%Y-%m-%d")])

        # Split
        split_idx = int(len(valid_dates) * self.training_config.train_val_split)
        return valid_dates[:split_idx], valid_dates[split_idx:]

    def _evaluate(self, dates: List[str]) -> Tuple[float, Dict]:
        """Evaluate model on given dates.

        Args:
            dates: List of evaluation dates.

        Returns:
            (loss, metrics) tuple.
        """
        losses = []
        all_preds = []
        all_targets = []

        for date in dates[:50]:  # Limit for speed
            try:
                input_feat, target_feat, static_feat = \
                    self.data_loader.get_feature_matrix(
                        n_timesteps=self.training_config.n_timesteps,
                        target_date=date,
                    )

                combined = np.concatenate([static_feat, input_feat], axis=-1)
                graph = self._create_graph_from_features(combined)
                targets = jnp.array(target_feat, dtype=jnp.float32)

                # Forward pass
                output_graph = self.model.apply(
                    self.params, graph, is_training=False
                )
                predictions = output_graph.nodes["country_nodes"].features

                # Compute loss
                loss = economic_mse_loss(predictions, targets)
                losses.append(float(loss))
                all_preds.append(np.array(predictions))
                all_targets.append(np.array(targets))

            except Exception:
                continue

        # Aggregate metrics
        avg_loss = np.mean(losses) if losses else 0.0

        if all_preds and all_targets:
            preds = np.concatenate(all_preds, axis=0)
            targets = np.concatenate(all_targets, axis=0)
            metrics = compute_metrics(preds, targets)
        else:
            metrics = {}

        return avg_loss, metrics

    def save_checkpoint(self, name: str) -> None:
        """Save model checkpoint.

        Args:
            name: Checkpoint name.
        """
        checkpoint_path = Path(self.training_config.checkpoint_dir) / f"{name}.npz"

        # Flatten params for numpy saving
        flat_params, tree_def = jax.tree_util.tree_flatten(self.params)

        # Save
        np.savez(
            checkpoint_path,
            *flat_params,
            tree_def=tree_def,
            step=self.step,
            best_val_loss=self.best_val_loss,
        )

        # Save config
        config_path = Path(self.training_config.checkpoint_dir) / f"{name}_config.json"
        with open(config_path, "w") as f:
            json.dump({
                "model_config": {
                    "latent_size": self.model_config.latent_size,
                    "mlp_hidden_size": self.model_config.mlp_hidden_size,
                    "mlp_num_hidden_layers": self.model_config.mlp_num_hidden_layers,
                    "num_message_passing_steps": self.model_config.num_message_passing_steps,
                },
                "task_config": {
                    "input_features": self.task_config.input_features,
                    "target_features": self.task_config.target_features,
                },
                "step": self.step,
                "timestamp": datetime.now().isoformat(),
            }, f, indent=2)

        print(f"Saved checkpoint: {checkpoint_path}")

    def load_checkpoint(self, name: str) -> None:
        """Load model checkpoint.

        Args:
            name: Checkpoint name.
        """
        checkpoint_path = Path(self.training_config.checkpoint_dir) / f"{name}.npz"

        data = np.load(checkpoint_path, allow_pickle=True)

        # Reconstruct params
        tree_def = data["tree_def"].item()
        flat_params = [data[f"arr_{i}"] for i in range(len(data.files) - 3)]
        self.params = jax.tree_util.tree_unflatten(tree_def, flat_params)

        self.step = int(data["step"])
        self.best_val_loss = float(data["best_val_loss"])

        print(f"Loaded checkpoint: {checkpoint_path} (step {self.step})")


def train_step(
    params: Any,
    opt_state: Any,
    optimizer: optax.GradientTransformation,
    model: hk.Transformed,
    graph: TypedGraph,
    targets: jnp.ndarray,
    per_variable_weights: Optional[Dict[int, float]] = None,
) -> Tuple[Any, Any, float]:
    """Single training step (not JIT compiled).

    Args:
        params: Model parameters.
        opt_state: Optimizer state.
        optimizer: Optax optimizer.
        model: Haiku transformed model.
        graph: Input TypedGraph.
        targets: Target values.
        per_variable_weights: Optional per-variable loss weights.

    Returns:
        (new_params, new_opt_state, loss) tuple.
    """
    def loss_fn(p):
        output_graph = model.apply(p, graph, is_training=True)
        predictions = output_graph.nodes["country_nodes"].features
        return economic_mse_loss(
            predictions, targets,
            per_variable_weights=per_variable_weights,
        )

    loss, grads = jax.value_and_grad(loss_fn)(params)
    updates, opt_state_new = optimizer.update(grads, opt_state, params)
    params_new = optax.apply_updates(params, updates)

    return params_new, opt_state_new, float(loss)


def eval_step(
    params: Any,
    model: hk.Transformed,
    graph: TypedGraph,
    targets: jnp.ndarray,
) -> Tuple[jnp.ndarray, float]:
    """Single evaluation step.

    Args:
        params: Model parameters.
        model: Haiku transformed model.
        graph: Input TypedGraph.
        targets: Target values.

    Returns:
        (predictions, loss) tuple.
    """
    output_graph = model.apply(params, graph, is_training=False)
    predictions = output_graph.nodes["country_nodes"].features
    loss = economic_mse_loss(predictions, targets)
    return predictions, float(loss)


# Need to import pandas for date operations
import pandas as pd
