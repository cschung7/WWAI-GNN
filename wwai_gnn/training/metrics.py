# Copyright 2024 WWAI Project
#
# Metrics for economic forecasting evaluation.

"""Metrics and evaluation utilities for economic forecasting."""

from typing import Dict, List, Optional, Tuple, NamedTuple
from dataclasses import dataclass
import numpy as np
import jax.numpy as jnp


@dataclass
class EconomicMetrics:
    """Container for economic forecasting metrics."""
    mse: float
    mae: float
    rmse: float
    r2: float
    directional_accuracy: float
    mse_per_feature: Dict[str, float]
    mae_per_feature: Dict[str, float]
    dir_acc_per_feature: Dict[str, float]


def compute_all_metrics(
    predictions: np.ndarray,
    targets: np.ndarray,
    previous: Optional[np.ndarray] = None,
    feature_names: Optional[List[str]] = None,
) -> EconomicMetrics:
    """Compute comprehensive metrics for evaluation.

    Args:
        predictions: Predicted values, shape (n_samples, n_features).
        targets: Target values, shape (n_samples, n_features).
        previous: Previous timestep values for directional accuracy.
        feature_names: Names of features for per-feature metrics.

    Returns:
        EconomicMetrics dataclass with all metrics.
    """
    if feature_names is None:
        feature_names = [
            "gdp_growth", "inflation", "unemployment",
            "interest_rate", "trade_balance"
        ]

    # Overall metrics
    mse = float(np.mean((predictions - targets) ** 2))
    mae = float(np.mean(np.abs(predictions - targets)))
    rmse = float(np.sqrt(mse))

    # R-squared
    ss_res = np.sum((targets - predictions) ** 2)
    ss_tot = np.sum((targets - np.mean(targets)) ** 2)
    r2 = float(1 - ss_res / (ss_tot + 1e-8))

    # Directional accuracy
    if previous is not None:
        pred_dir = np.sign(predictions - previous)
        actual_dir = np.sign(targets - previous)
        dir_acc = float(np.mean((pred_dir == actual_dir).astype(float)))
    else:
        dir_acc = 0.0

    # Per-feature metrics
    mse_per_feature = {}
    mae_per_feature = {}
    dir_acc_per_feature = {}

    n_features = min(predictions.shape[-1], len(feature_names))

    for i in range(n_features):
        name = feature_names[i]
        pred_i = predictions[..., i]
        tgt_i = targets[..., i]

        mse_per_feature[name] = float(np.mean((pred_i - tgt_i) ** 2))
        mae_per_feature[name] = float(np.mean(np.abs(pred_i - tgt_i)))

        if previous is not None:
            prev_i = previous[..., i]
            pred_dir_i = np.sign(pred_i - prev_i)
            actual_dir_i = np.sign(tgt_i - prev_i)
            dir_acc_per_feature[name] = float(
                np.mean((pred_dir_i == actual_dir_i).astype(float))
            )
        else:
            dir_acc_per_feature[name] = 0.0

    return EconomicMetrics(
        mse=mse,
        mae=mae,
        rmse=rmse,
        r2=r2,
        directional_accuracy=dir_acc,
        mse_per_feature=mse_per_feature,
        mae_per_feature=mae_per_feature,
        dir_acc_per_feature=dir_acc_per_feature,
    )


def compute_country_metrics(
    predictions: np.ndarray,
    targets: np.ndarray,
    countries: List[str],
) -> Dict[str, Dict[str, float]]:
    """Compute metrics per country.

    Args:
        predictions: Predicted values, shape (n_countries, n_features).
        targets: Target values, shape (n_countries, n_features).
        countries: List of country codes.

    Returns:
        Dictionary mapping country codes to metric dictionaries.
    """
    metrics = {}

    for i, country in enumerate(countries):
        pred_i = predictions[i]
        tgt_i = targets[i]

        metrics[country] = {
            "mse": float(np.mean((pred_i - tgt_i) ** 2)),
            "mae": float(np.mean(np.abs(pred_i - tgt_i))),
        }

    return metrics


def compute_rolling_metrics(
    predictions_history: List[np.ndarray],
    targets_history: List[np.ndarray],
    window_size: int = 10,
) -> Dict[str, List[float]]:
    """Compute rolling metrics over prediction history.

    Args:
        predictions_history: List of prediction arrays over time.
        targets_history: List of target arrays over time.
        window_size: Rolling window size.

    Returns:
        Dictionary of metric names to lists of rolling values.
    """
    n_samples = len(predictions_history)

    metrics = {
        "rolling_mse": [],
        "rolling_mae": [],
        "rolling_r2": [],
    }

    for i in range(window_size, n_samples):
        window_preds = np.stack(predictions_history[i-window_size:i])
        window_tgts = np.stack(targets_history[i-window_size:i])

        window_preds_flat = window_preds.reshape(-1)
        window_tgts_flat = window_tgts.reshape(-1)

        mse = float(np.mean((window_preds_flat - window_tgts_flat) ** 2))
        mae = float(np.mean(np.abs(window_preds_flat - window_tgts_flat)))

        ss_res = np.sum((window_tgts_flat - window_preds_flat) ** 2)
        ss_tot = np.sum((window_tgts_flat - np.mean(window_tgts_flat)) ** 2)
        r2 = float(1 - ss_res / (ss_tot + 1e-8))

        metrics["rolling_mse"].append(mse)
        metrics["rolling_mae"].append(mae)
        metrics["rolling_r2"].append(r2)

    return metrics


def log_metrics(
    metrics: EconomicMetrics,
    step: int,
    prefix: str = "",
) -> str:
    """Format metrics for logging.

    Args:
        metrics: EconomicMetrics instance.
        step: Current training step.
        prefix: Prefix for metric names (e.g., "train", "val").

    Returns:
        Formatted string for logging.
    """
    lines = [f"Step {step} - {prefix} Metrics:"]
    lines.append(f"  MSE: {metrics.mse:.6f}")
    lines.append(f"  MAE: {metrics.mae:.6f}")
    lines.append(f"  RMSE: {metrics.rmse:.6f}")
    lines.append(f"  R²: {metrics.r2:.4f}")

    if metrics.directional_accuracy > 0:
        lines.append(f"  Directional Accuracy: {metrics.directional_accuracy:.2%}")

    lines.append("  Per-Feature MSE:")
    for name, value in metrics.mse_per_feature.items():
        lines.append(f"    {name}: {value:.6f}")

    return "\n".join(lines)


def compare_models(
    model_metrics: Dict[str, EconomicMetrics],
) -> str:
    """Compare metrics across multiple models.

    Args:
        model_metrics: Dictionary mapping model names to metrics.

    Returns:
        Formatted comparison table.
    """
    lines = ["Model Comparison:"]
    lines.append("-" * 60)
    lines.append(f"{'Model':<20} {'MSE':<10} {'MAE':<10} {'R²':<10}")
    lines.append("-" * 60)

    for name, metrics in model_metrics.items():
        lines.append(f"{name:<20} {metrics.mse:<10.6f} {metrics.mae:<10.6f} {metrics.r2:<10.4f}")

    lines.append("-" * 60)

    return "\n".join(lines)


def compute_forecast_intervals(
    predictions: np.ndarray,
    std_estimates: np.ndarray,
    confidence_level: float = 0.95,
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute confidence intervals for predictions.

    Args:
        predictions: Point predictions.
        std_estimates: Estimated standard deviations.
        confidence_level: Confidence level (default 95%).

    Returns:
        (lower_bounds, upper_bounds) tuple.
    """
    from scipy import stats

    z_score = stats.norm.ppf((1 + confidence_level) / 2)
    margin = z_score * std_estimates

    lower = predictions - margin
    upper = predictions + margin

    return lower, upper


def calibration_error(
    predictions: np.ndarray,
    targets: np.ndarray,
    std_estimates: np.ndarray,
    n_bins: int = 10,
) -> float:
    """Compute calibration error for uncertainty estimates.

    Measures how well predicted confidence intervals match actual coverage.

    Args:
        predictions: Point predictions.
        targets: True values.
        std_estimates: Estimated standard deviations.
        n_bins: Number of confidence level bins.

    Returns:
        Expected calibration error.
    """
    confidence_levels = np.linspace(0.1, 0.9, n_bins)
    calibration_errors = []

    for conf in confidence_levels:
        lower, upper = compute_forecast_intervals(
            predictions, std_estimates, conf
        )

        # Actual coverage
        in_interval = (targets >= lower) & (targets <= upper)
        actual_coverage = np.mean(in_interval)

        # Calibration error
        calibration_errors.append(abs(conf - actual_coverage))

    return float(np.mean(calibration_errors))
