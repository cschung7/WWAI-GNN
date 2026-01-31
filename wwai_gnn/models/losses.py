# Copyright 2024 WWAI Project
#
# Loss functions for economic forecasting.

"""Loss functions and metrics for economic forecasting."""

from typing import Dict, Optional, Tuple
import jax.numpy as jnp
import jax


def economic_mse_loss(
    predictions: jnp.ndarray,
    targets: jnp.ndarray,
    weights: Optional[jnp.ndarray] = None,
    per_variable_weights: Optional[Dict[int, float]] = None,
) -> jnp.ndarray:
    """Compute weighted MSE loss for economic predictions.

    Args:
        predictions: Predicted values, shape (n_countries, n_features).
        targets: Target values, shape (n_countries, n_features).
        weights: Optional per-country weights, shape (n_countries,).
        per_variable_weights: Optional weights per feature index.

    Returns:
        Scalar loss value.
    """
    # Compute squared errors
    squared_errors = (predictions - targets) ** 2

    # Apply per-variable weights if provided
    if per_variable_weights is not None:
        n_features = predictions.shape[-1]
        var_weights = jnp.array([
            per_variable_weights.get(i, 1.0) for i in range(n_features)
        ])
        squared_errors = squared_errors * var_weights

    # Apply per-country weights if provided
    if weights is not None:
        weights = weights[:, None]  # Broadcast to (n_countries, 1)
        squared_errors = squared_errors * weights
        loss = jnp.sum(squared_errors) / jnp.sum(weights)
    else:
        loss = jnp.mean(squared_errors)

    return loss


def economic_mae_loss(
    predictions: jnp.ndarray,
    targets: jnp.ndarray,
    weights: Optional[jnp.ndarray] = None,
) -> jnp.ndarray:
    """Compute weighted MAE loss for economic predictions.

    Args:
        predictions: Predicted values, shape (n_countries, n_features).
        targets: Target values, shape (n_countries, n_features).
        weights: Optional per-country weights, shape (n_countries,).

    Returns:
        Scalar loss value.
    """
    abs_errors = jnp.abs(predictions - targets)

    if weights is not None:
        weights = weights[:, None]
        abs_errors = abs_errors * weights
        loss = jnp.sum(abs_errors) / jnp.sum(weights)
    else:
        loss = jnp.mean(abs_errors)

    return loss


def directional_accuracy(
    predictions: jnp.ndarray,
    targets: jnp.ndarray,
    previous: jnp.ndarray,
) -> jnp.ndarray:
    """Compute directional accuracy (correct sign of change).

    Args:
        predictions: Predicted values, shape (n_countries, n_features).
        targets: Target values, shape (n_countries, n_features).
        previous: Previous timestep values, shape (n_countries, n_features).

    Returns:
        Accuracy as proportion of correct directions.
    """
    pred_direction = jnp.sign(predictions - previous)
    actual_direction = jnp.sign(targets - previous)

    correct = (pred_direction == actual_direction).astype(jnp.float32)

    return jnp.mean(correct)


def economic_huber_loss(
    predictions: jnp.ndarray,
    targets: jnp.ndarray,
    delta: float = 1.0,
    weights: Optional[jnp.ndarray] = None,
) -> jnp.ndarray:
    """Compute Huber loss (robust to outliers).

    Args:
        predictions: Predicted values.
        targets: Target values.
        delta: Threshold for switching between L1 and L2.
        weights: Optional sample weights.

    Returns:
        Scalar loss value.
    """
    errors = jnp.abs(predictions - targets)
    quadratic = jnp.minimum(errors, delta)
    linear = errors - quadratic

    loss = 0.5 * quadratic ** 2 + delta * linear

    if weights is not None:
        weights = weights[:, None]
        loss = loss * weights
        return jnp.sum(loss) / jnp.sum(weights)
    else:
        return jnp.mean(loss)


def compute_metrics(
    predictions: jnp.ndarray,
    targets: jnp.ndarray,
    previous: Optional[jnp.ndarray] = None,
    feature_names: Optional[Tuple[str, ...]] = None,
) -> Dict[str, float]:
    """Compute comprehensive metrics for evaluation.

    Args:
        predictions: Predicted values, shape (n_countries, n_features).
        targets: Target values, shape (n_countries, n_features).
        previous: Previous timestep values (for directional accuracy).
        feature_names: Names of features for per-feature metrics.

    Returns:
        Dictionary of metric names to values.
    """
    metrics = {}

    # Overall metrics
    metrics["mse"] = float(jnp.mean((predictions - targets) ** 2))
    metrics["mae"] = float(jnp.mean(jnp.abs(predictions - targets)))
    metrics["rmse"] = float(jnp.sqrt(metrics["mse"]))

    # R-squared
    ss_res = jnp.sum((targets - predictions) ** 2)
    ss_tot = jnp.sum((targets - jnp.mean(targets)) ** 2)
    metrics["r2"] = float(1 - ss_res / (ss_tot + 1e-8))

    # Directional accuracy
    if previous is not None:
        metrics["directional_accuracy"] = float(
            directional_accuracy(predictions, targets, previous)
        )

    # Per-feature metrics
    if feature_names is not None:
        for i, name in enumerate(feature_names):
            pred_i = predictions[:, i]
            tgt_i = targets[:, i]
            metrics[f"mse_{name}"] = float(jnp.mean((pred_i - tgt_i) ** 2))
            metrics[f"mae_{name}"] = float(jnp.mean(jnp.abs(pred_i - tgt_i)))

            if previous is not None:
                prev_i = previous[:, i]
                pred_dir = jnp.sign(pred_i - prev_i)
                actual_dir = jnp.sign(tgt_i - prev_i)
                metrics[f"dir_acc_{name}"] = float(
                    jnp.mean((pred_dir == actual_dir).astype(jnp.float32))
                )

    return metrics


def create_loss_fn(
    loss_type: str = "mse",
    per_variable_weights: Optional[Dict[int, float]] = None,
    huber_delta: float = 1.0,
):
    """Factory function to create loss function.

    Args:
        loss_type: Type of loss ("mse", "mae", "huber").
        per_variable_weights: Weights per variable index.
        huber_delta: Delta parameter for Huber loss.

    Returns:
        Loss function with signature (predictions, targets) -> loss.
    """
    def loss_fn(predictions: jnp.ndarray, targets: jnp.ndarray) -> jnp.ndarray:
        if loss_type == "mse":
            return economic_mse_loss(
                predictions, targets,
                per_variable_weights=per_variable_weights
            )
        elif loss_type == "mae":
            return economic_mae_loss(predictions, targets)
        elif loss_type == "huber":
            return economic_huber_loss(predictions, targets, delta=huber_delta)
        else:
            raise ValueError(f"Unknown loss type: {loss_type}")

    return loss_fn
