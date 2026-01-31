# WWAI-GNN: Graph Neural Network Economic Forecasting

A complete implementation of GNN-based economic forecasting, adapted from DeepMind's GraphCast architecture for macroeconomic prediction.

## Overview

WWAI-GNN uses Graph Neural Networks to forecast economic indicators across 26 major economies, leveraging:

- **Trade relationships**: Bilateral trade data connections
- **Geographic proximity**: Spatial relationships between countries
- **Economic similarity**: Development level and structural similarities

## Architecture

```
Input → Encoder (1 step) → Processor (8 steps) → Decoder → Output
          ↓                      ↓                   ↓
     Embed to latent      Message passing     Project to predictions
```

### Key Components

- **TypedGraph**: Graph structure with typed nodes and edges
- **DeepTypedGraphNet**: Message passing network with residual connections
- **EconomicGraphBuilder**: Creates economic graphs with trade, geographic, and similarity edges

## Installation

```bash
# Clone repository
cd /mnt/nas/WWAI/WWAI-MACRO/WWAI-GNN

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.template .env
# Edit .env and add your FRED_API_KEY
```

## Quick Start

### 1. Initialize and Test

```python
import jax
import jax.numpy as jnp

from wwai_gnn.models.graph_econcast import (
    ModelConfig, TaskConfig, init_model, create_sample_graph
)

# Initialize model
rng_key = jax.random.PRNGKey(42)
model, params = init_model(rng_key)

# Create sample graph
graph = create_sample_graph(n_countries=26)

# Forward pass
output = model.apply(params, graph, is_training=False)
predictions = output.nodes["country_nodes"].features
print(f"Predictions shape: {predictions.shape}")  # (26, 5)
```

### 2. Train Model

```bash
# Basic training
python scripts/train.py --epochs 100 --learning-rate 0.001

# With custom config
python scripts/train.py \
    --latent-size 256 \
    --num-message-passing 8 \
    --epochs 200 \
    --batch-size 16
```

### 3. Generate Predictions

```bash
# Using trained model
python scripts/predict.py \
    --checkpoint data/checkpoints/best \
    --output predictions.json
```

## Project Structure

```
WWAI-GNN/
├── config/
│   └── config.yaml              # Model and training configs
│
├── wwai_gnn/
│   ├── core/                    # Core GNN components (from GraphCast)
│   │   ├── typed_graph.py       # Graph data structures
│   │   ├── typed_graph_net.py   # Graph network layers
│   │   ├── deep_typed_graph_net.py  # Message passing
│   │   └── mlp.py               # MLP utilities
│   │
│   ├── models/                  # Economic models
│   │   ├── economic_graph.py    # TypedGraph builder
│   │   ├── graph_econcast.py    # Main model
│   │   └── losses.py            # Loss functions
│   │
│   ├── data/                    # Data loading
│   │   ├── data_loader.py       # FRED/World Bank loader
│   │   └── countries.py         # Country definitions
│   │
│   └── training/                # Training infrastructure
│       ├── trainer.py           # Training loop
│       └── metrics.py           # Evaluation metrics
│
├── scripts/
│   ├── train.py                 # Training script
│   └── predict.py               # Inference script
│
└── data/
    ├── cache/                   # API cache
    └── checkpoints/             # Model checkpoints
```

## Economic Indicators

| Indicator | Description |
|-----------|-------------|
| GDP Growth Rate | Real quarterly GDP growth |
| Inflation Rate | Consumer price index change |
| Unemployment Rate | Labor market slack |
| Interest Rate | Central bank policy rate |
| Trade Balance | Exports minus imports |

## Countries (26)

G7, BRICS, and major economies:
USA, CHN, JPN, DEU, IND, GBR, FRA, ITA, BRA, CAN, KOR, ESP, AUS, RUS, MEX, IDN, NLD, SAU, TUR, CHE, POL, SWE, BEL, ARG, NOR, AUT

## Key Fixes from Original GraphEconCast

| Issue | Old Behavior | Fix |
|-------|--------------|-----|
| `build_graph()` | Returns `jraph.GraphsTuple` | Returns `TypedGraph` |
| Edge types | Combined in single edge set | Separate typed edge sets |
| Forward pass | Incomplete chain | Complete encode→process→decode |
| Loss function | Weather lat/level weights | Economic MSE |

## Configuration

### Model Config
```yaml
model:
  latent_size: 256
  num_message_passing_steps: 8
  mlp_num_hidden_layers: 2
  activation: "swish"
```

### Training Config
```yaml
training:
  learning_rate: 0.001
  num_epochs: 100
  batch_size: 8
  per_variable_weights:
    gdp_growth_rate: 2.0
    inflation_rate: 2.0
```

## API Keys

### FRED API
Get your free API key from: https://fred.stlouisfed.org/docs/api/api_key.html

### World Bank
No API key required - uses public API.

## License

Core GNN components adapted from DeepMind's GraphCast under Apache 2.0 License.
Economic extensions under MIT License.

## References

- [GraphCast: Learning skillful medium-range global weather forecasting](https://arxiv.org/abs/2212.12794)
- [Learning to Simulate Complex Physics with Graph Networks](https://arxiv.org/abs/2002.09405)
- [Relational inductive biases, deep learning, and graph networks](https://arxiv.org/abs/1806.01261)
