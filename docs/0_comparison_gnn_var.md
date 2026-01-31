# GNN vs VAR: Economic Forecasting Methods Comparison

## Overview

This document compares two approaches to macroeconomic forecasting:
- **WWAI-GraphECast (Port 8012)**: Traditional VAR-based econometric methods
- **WWAI-GNN (Port 3789)**: Graph Neural Network deep learning approach

Both systems forecast economic indicators (GDP, Inflation, Unemployment, Interest Rates) across 26 major economies, but use fundamentally different methodologies.

---

## Methodology Differences

| Aspect | GraphECast (VAR) | WWAI-GNN (GNN) |
|--------|------------------|----------------|
| **Model Type** | Vector Autoregression | Graph Neural Network |
| **Linearity** | Linear relationships only | Non-linear learned |
| **Shock Propagation** | IRF (Impulse Response) | Message Passing (8 steps) |
| **Edge Weights** | Fixed (trade volume) | Learned attention weights |
| **Interpretability** | Granger causality p-values | Attention visualization |
| **Training** | Least squares estimation | Gradient descent |
| **Flexibility** | Requires stationarity | Handles non-stationary |
| **Parameters** | ~100s (VAR coefficients) | 4.03M (neural network) |
| **Data Requirements** | Smaller datasets OK | Requires more data |

---

## VAR Method (GraphECast)

### Mathematical Formulation

```
Y_t = A₁Y_{t-1} + A₂Y_{t-2} + ... + AₚY_{t-p} + ε_t

Where:
- Y_t = vector of economic variables at time t
- A₁...Aₚ = coefficient matrices (learned)
- ε_t = error term (white noise)
- p = lag order (typically 1-4 quarters)
```

### Bivariate vs Multivariate

**GraphECast uses MULTIVARIATE VAR**, not bivariate.

#### Number of Variables in the System

| Category | Variables | Count |
|----------|-----------|-------|
| **US Variables** | fed_funds, gdp_growth, unemployment_rate, cpi, sp500 | 5 |
| **Korea Variables** | policy_rate, gdp_growth, cpi, usd_krw | 4 |
| **Combined Model** | us_fed_funds, us_unemployment, us_cpi, kr_policy_rate, kr_cpi, kr_usd_krw | 6-9 |

#### Variable Definitions (from `var_analysis.py`)

```python
# US Variables (5)
us_variables = [
    "fed_funds",           # Federal funds rate (policy rate)
    "gdp_growth",          # Real GDP growth rate
    "unemployment_rate",   # Unemployment rate
    "cpi",                 # Consumer Price Index (inflation)
    "sp500",               # S&P 500 (financial conditions)
]

# Korea Variables (4)
korea_variables = [
    "interest_rates",      # BOK policy rate
    "gdp_growth",          # GDP growth
    "cpi",                 # Inflation
    "exchange_rates",      # USD/KRW
]
```

#### Why Multivariate Matters

- **Bivariate VAR** (2 variables): Can only test X → Y or Y → X
- **Multivariate VAR** (6-9 variables): Captures complex interdependencies
  - Fed rate affects Korea via USD/KRW AND via trade
  - US GDP affects Korea directly AND through China
  - Spillover effects are properly controlled

#### Coefficient Matrix Size

For VAR(p) with n variables:
- **Number of coefficients**: n² × p + n (intercepts)
- **Example**: 6 variables, lag 4 → 6² × 4 + 6 = **150 coefficients**

This is why VAR doesn't scale well to many variables (coefficient explosion).

---

### Lag Order Selection

```python
# Automatic lag selection using information criteria
model = VAR(data)
lag_order = model.select_order(maxlags=12)  # Test up to 12 lags
optimal_lag = lag_order.aic  # Use AIC-selected lag

# Typical results:
# - Monthly data: 4-6 lags optimal
# - Quarterly data: 1-4 lags optimal
```

| Criterion | Formula | Tendency |
|-----------|---------|----------|
| **AIC** (Akaike) | -2LL + 2k | Larger models |
| **BIC** (Bayesian) | -2LL + k×ln(n) | Smaller models |
| **HQIC** (Hannan-Quinn) | -2LL + 2k×ln(ln(n)) | Balanced |

---

### Key Components

1. **Granger Causality**
   - Tests if variable X helps predict variable Y
   - Based on F-tests of coefficient significance
   - Provides p-values for interpretability

2. **Impulse Response Functions (IRF)**
   - Shows how a shock to one variable affects others over time
   - Assumes linear decay pattern
   - Used for shock propagation simulation

3. **Markov Regime Switching**
   - Detects Bull/Bear market regimes
   - Allows different VAR coefficients per regime
   - Captures structural breaks

---

### Markov Regime Switching: Detailed Explanation

#### What is Markov Regime Switching?

The Markov Switching model (Hamilton, 1989) assumes the economy transitions between discrete "regimes" or "states" with different statistical properties.

```
State S_t ∈ {0, 1, ..., K-1}

Y_t | S_t = s ~ N(μ_s, σ²_s)

Transition probability: P(S_t = j | S_{t-1} = i) = p_{ij}
```

#### Number of States (K)

**GraphECast tests K = 2 and K = 3 states:**

| n_regimes | States | Use Case |
|-----------|--------|----------|
| **K = 2** (Default) | State 0, State 1 | Bull/Bear, Expansion/Recession, Low Vol/High Vol |
| **K = 3** (Optional) | State 0, State 1, State 2 | Bear/Normal/Bull, Recession/Normal/High Growth |

#### Three Separate Regime Models

GraphECast runs **three independent** Markov Switching models:

```python
# 1. Growth Regime (GDP-based)
detect_growth_regime(data, n_regimes=2, variable="gdp_growth")
# States: "Recession/Contraction" vs "Expansion/Growth"

# 2. Volatility Regime (VIX-based)
detect_volatility_regime(data, n_regimes=2)
# States: "Low Volatility (Calm)" vs "High Volatility (Turbulent)"

# 3. Market Regime (S&P 500 returns)
detect_market_regime(data, n_regimes=2)
# States: "Bear Market" vs "Bull Market"
```

#### Hyperparameter: Number of States

| Parameter | Default | Tested Values | Selection Method |
|-----------|---------|---------------|------------------|
| `n_regimes` | 2 | 2, 3 | **Fixed** (not optimized) |

**Why not optimize K?**
- K=2 is standard in economic literature (expansion/recession)
- K=3 adds "normal" state but increases complexity
- Model selection (AIC/BIC) could choose K, but typically K=2 is used

#### Model Specification (from `regime_detection.py`)

```python
from statsmodels.tsa.regime_switching.markov_regression import MarkovRegression

model = MarkovRegression(
    y,                        # Time series data (GDP growth, VIX, S&P returns)
    k_regimes=n_regimes,      # Number of states (2 or 3)
    trend='c',                # Include constant/intercept
    switching_variance=True   # Allow different variance in each regime
)

fitted = model.fit(disp=False)
```

#### Transition Matrix

For K=2 states, the transition matrix P:

```
         To State 0   To State 1
From 0   [  p_00        p_01    ]    p_00 + p_01 = 1
From 1   [  p_10        p_11    ]    p_10 + p_11 = 1
```

**Example (typical values):**
```
         Recession    Expansion
Recession [  0.85        0.15   ]   # Stay in recession 85%, exit 15%
Expansion [  0.05        0.95   ]   # Stay in expansion 95%, exit 5%
```

#### Expected Duration in Each Regime

```python
expected_duration[regime] = 1 / (1 - p_stay)

# Example:
# Recession: p_stay = 0.85 → Duration = 1/(1-0.85) = 6.7 quarters
# Expansion: p_stay = 0.95 → Duration = 1/(1-0.95) = 20 quarters
```

#### Regime Labels Assignment

States are labeled by sorting regime means:

```python
# For Growth Regime:
regime_means = {0: -1.2%, 1: +2.8%}  # Mean GDP growth in each state
sorted_regimes = sorted(regime_means.items(), key=lambda x: x[1])
# State 0 → "Recession" (lower mean)
# State 1 → "Expansion" (higher mean)

# For K=3:
# Lowest mean → "Recession"
# Middle mean → "Normal Growth"
# Highest mean → "High Growth"
```

#### Model Selection Criteria

```python
# Model fit statistics
fitted.aic   # Akaike Information Criterion (lower = better)
fitted.bic   # Bayesian Information Criterion (lower = better)
fitted.llf   # Log-likelihood (higher = better)
```

| Comparison | When to use K=2 | When to use K=3 |
|------------|-----------------|-----------------|
| AIC/BIC | K=2 has lower AIC | K=3 has lower AIC |
| Interpretability | Clear binary states | Need "normal" middle |
| Data requirements | Less data needed | More data needed |

#### Current Implementation Choice

**GraphECast uses K=2 (fixed)** because:
1. Economic theory: Business cycles are typically binary (expansion/recession)
2. NBER definition: Recession is binary (yes/no)
3. Interpretability: Easier to communicate "Bull" vs "Bear"
4. Robustness: Fewer parameters, less overfitting

#### Risk Score Computation

The three regime models combine into a risk score:

```python
risk_score = 0

if growth_regime == "Recession":
    risk_score += 40

if volatility_regime == "High Volatility":
    risk_score += 30

if market_regime == "Bear Market":
    risk_score += 30

# Maximum risk score: 100 (all three in bad state)
# Interpretation:
#   0-29: Low risk
#   30-59: Moderate risk
#   60-100: High risk
```

---

### Limitations

- ❌ Assumes linear relationships between variables
- ❌ Requires stationary data (differencing may lose information)
- ❌ Fixed lag structure (same for all variables)
- ❌ Cannot capture complex non-linear interactions
- ❌ Sensitive to outliers and structural breaks
- ❌ Coefficient explosion with many variables

---

## GNN Method (WWAI-GNN)

### Mathematical Formulation

```
h_i^{(k+1)} = UPDATE(h_i^{(k)}, AGGREGATE({h_j^{(k)} : j ∈ N(i)}))

Where:
- h_i^{(k)} = hidden state of node i at layer k
- N(i) = neighbors of node i in the graph
- AGGREGATE = attention-weighted sum of neighbor messages
- UPDATE = MLP with residual connections
```

### Architecture (GraphCast-inspired)

```
Input (4 quarters × 5 indicators × 26 countries)
    │
    ▼
┌─────────────────────────────────────────────┐
│  ENCODER (1 step)                           │
│  - Embed each country to 128-dim latent     │
│  - MLP: input_dim → 128 → 128               │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  PROCESSOR (8 message passing steps)        │
│  For each step:                             │
│    1. Compute attention over edges          │
│    2. Aggregate neighbor messages           │
│    3. Update node states (residual)         │
│  Edge types: Trade, Geographic, Similarity  │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  DECODER (1 step)                           │
│  - Project latent → predictions             │
│  - MLP: 128 → 64 → 5 (indicators)           │
└─────────────────────────────────────────────┘
    │
    ▼
Output (5 indicators × 26 countries for next quarter)
```

### Key Components

1. **Typed Graph Structure**
   - Nodes: 26 countries with economic features
   - Edges: Trade relationships, Geographic proximity, Economic similarity
   - Each edge type has separate learned weights

2. **Message Passing**
   - Information flows through graph edges
   - 8 steps allow multi-hop spillovers (USA → China → Korea)
   - Attention weights determine importance

3. **Learned Representations**
   - Countries embedded in latent space
   - Similar economies cluster together
   - Non-linear patterns captured automatically

### Advantages

- ✅ Learns non-linear relationships automatically
- ✅ Handles heterogeneous nodes (different country sizes)
- ✅ Adaptive attention weights (learns what matters)
- ✅ Multi-hop information flow (8 steps)
- ✅ Can model structural breaks and regime changes
- ✅ Scales to many variables without coefficient explosion

---

## Feature Comparison

### GraphECast Dashboard (Port 8012)

| Feature | Method | Description |
|---------|--------|-------------|
| 🌍 Economic Weather Map | Real-time data | World map with GDP/Inflation overlays |
| 💥 Shock Propagation Simulator | VAR IRF | Linear impulse response simulation |
| 📈 Historical Data & Forecasts | VAR forecast | Time series with confidence intervals |
| 🕸️ Economic Network Graph | Fixed weights | Force-directed trade network |
| 📊 Trade Flow Matrix | Bilateral trade | Trade intensity heatmap |
| 🔥 GDP Correlation Heatmap | Pearson correlation | Economic cycle synchronization |
| 🌊 Spillover Channel Flow | VAR decomposition | Sankey diagram of shock channels |
| 🔗 Shock Transmission Network | Granger causality | Interactive spillover paths |

### WWAI-GNN Dashboard (Port 3789)

| Feature | Method | Description |
|---------|--------|-------------|
| 📊 Country Scorecard | GNN prediction | Q1 2026 forecasts for 10 countries |
| 📈 Model Stats | Training metrics | R² 99.49%, Val Loss 0.0117 |
| 🔷 Architecture Diagram | Visual | Encoder → Processor → Decoder flow |
| 🌐 Language Toggle | UI | English / Korean support |

---

## Integration Roadmap

Features to add to WWAI-GNN frontend (using GNN equivalents):

| GraphECast Feature | GNN Equivalent | Implementation |
|-------------------|----------------|----------------|
| Shock Simulator | GNN Forward Pass | Perturb input node, run inference |
| Network Graph | Attention Visualization | Show learned edge weights |
| Transmission Network | Message Passing Flow | Animate 8-step propagation |
| Correlation Heatmap | Embedding Similarity | Cosine similarity of latent vectors |
| Spillover Channels | Multi-edge Attention | Trade/Geo/Similarity edge analysis |
| World Map | GNN Predictions Overlay | Show forecasts on geographic map |

### Proposed Architecture

```
WWAI-GNN Frontend (Port 3789)
    │
    ├── Current Features (keep)
    │   ├── Country Scorecard
    │   ├── Model Stats (R² 99.49%)
    │   └── Language Toggle (EN/KO)
    │
    └── New Features (GNN-native)
        │
        ├── 🌍 GNN Economic Map
        │   └── Show GNN predictions on world map
        │   └── Color by GDP growth / risk score
        │
        ├── 💥 GNN Shock Simulator
        │   └── Input: Select country + shock magnitude
        │   └── Process: Perturb node → 8-step message passing
        │   └── Output: Predicted impact on all countries
        │   └── Advantage: Non-linear propagation patterns
        │
        ├── 🕸️ GNN Attention Network
        │   └── Visualize learned edge attention weights
        │   └── Show which connections matter most
        │   └── Compare Trade vs Geo vs Similarity edges
        │
        ├── 📈 Historical + GNN Forecasts
        │   └── Time series with actual vs predicted
        │   └── Rolling forecast evaluation
        │   └── Uncertainty quantification
        │
        └── 🔗 Message Passing Animation
            └── Step-by-step visualization of 8 MP steps
            └── Show how information propagates
            └── Highlight multi-hop effects
```

---

## Key Insight: Why GNN is Better for Economic Forecasting

### VAR Captures:
- Linear Granger causality (X predicts Y)
- Fixed trade relationship weights
- Same-time correlation patterns

### GNN Captures:
- **Non-linear spillovers**: Economic shocks don't propagate linearly
- **Learned importance**: Some trade relationships matter more
- **Multi-hop effects**: USA → China → Korea semiconductor chain
- **Regime adaptation**: Attention weights can shift with market conditions
- **Heterogeneous nodes**: Large economies (USA, China) vs small (Belgium)

### Example: Semiconductor Shock

**VAR approach:**
```
Korea_GDP = 0.3 × USA_GDP + 0.2 × China_GDP + 0.1 × Japan_GDP + ...
(Fixed linear coefficients)
```

**GNN approach:**
```
Step 1: USA shock → high attention to China (supply chain)
Step 2: China impact → high attention to Korea (semiconductor demand)
Step 3: Korea impact → attention to Japan, Germany (auto industry)
...
Step 8: Full propagation with non-linear interactions
```

The GNN naturally learns that semiconductor shocks propagate differently than oil shocks, without explicit programming.

---

## API Endpoints Comparison

### GraphECast APIs (150+ endpoints)
- `/api/var/simulate-fed-shock` - VAR-based simulation
- `/api/var/granger-causality` - Causality tests
- `/api/viz/transmission-network` - Network visualization
- `/api/correlation/matrix` - Linear correlations

### WWAI-GNN APIs (to be built)
- `/api/gnn/simulate-shock` - GNN message passing simulation
- `/api/gnn/attention-weights` - Learned edge importance
- `/api/gnn/embedding-similarity` - Latent space analysis
- `/api/gnn/message-flow` - Step-by-step propagation

---

## Performance Comparison

| Metric | GraphECast (VAR) | WWAI-GNN |
|--------|------------------|----------|
| Training Time | Fast (seconds) | Slower (minutes-hours) |
| Inference Time | Very fast | Fast |
| R² Score | ~0.85-0.90 | 0.9949 |
| Non-linear Capture | ❌ No | ✅ Yes |
| Interpretability | High (coefficients) | Medium (attention) |
| Data Requirements | Low | Higher |

---

## Conclusion

Both approaches are valuable:

- **VAR (GraphECast)**: Best for quick analysis, interpretability, when linear relationships dominate
- **GNN (WWAI-GNN)**: Best for capturing complex spillovers, non-linear patterns, multi-hop effects

The integration plan brings the rich visualization features from GraphECast to the WWAI-GNN frontend while leveraging GNN's superior modeling capabilities for shock propagation and spillover analysis.

---

## Detailed Technical Specifications

### 6.1 GNN Architecture Details

The WWAI-GNN model follows the DeepMind GraphCast encoder-processor-decoder architecture:

#### Model Configuration (from `graph_econcast.py`)
```python
@dataclass
class ModelConfig:
    latent_size: int = 256           # Latent embedding dimension
    mlp_hidden_size: int = 256       # MLP hidden layer size
    mlp_hidden_layers: int = 1       # Number of hidden layers in MLPs
    num_message_passing_steps: int = 8  # Message passing iterations
```

#### Task Configuration
```python
@dataclass
class TaskConfig:
    input_features: int = 5          # GDP, inflation, unemployment, interest, trade
    static_features: int = 7         # Geographic + economic characteristics
    input_timesteps: int = 4         # Quarterly lag window (1 year)
    output_features: int = 5         # Same as input features
```

#### Architecture Components

| Component | Specification | Purpose |
|-----------|--------------|---------|
| **Encoder** | `TypedGraphNet` | Maps country nodes + edges to latent space |
| **Processor** | `DeepTypedGraphNet` | 8-step message passing for spillover propagation |
| **Decoder** | `Linear(256 → 5)` | Projects latent states back to economic indicators |
| **Activation** | `jax.nn.swish` | Smooth non-linearity (β=1.0) |
| **Normalization** | `hk.LayerNorm` | Per-layer normalization for stability |

#### Attention Mechanism
- **Type**: Implicit attention via learned edge weights
- **Edge Types**: `trade`, `geographic`, `similarity`
- **Edge Features**: Trade volume, geographic distance, economic correlation
- **Aggregation**: Sum aggregation with edge-weighted messages

#### Graph Structure
```
Nodes: 26 countries (G20 + key economies)
Edge Types:
  - trade: 650 edges (bilateral trade matrix)
  - geographic: 650 edges (distance-based connections)
  - similarity: 650 edges (economic structure similarity)
Total Edges: ~1,950
```

---

### 6.2 Data Sources

#### FRED API (Federal Reserve Economic Data)
| Series ID | Description | Frequency | Transform |
|-----------|-------------|-----------|-----------|
| `GDPC1` | Real GDP (billions, chained 2017$) | Quarterly | YoY % change |
| `A191RL1Q225SBEA` | Real GDP growth rate | Quarterly | Direct |
| `CPIAUCSL` | Consumer Price Index | Monthly | YoY % change |
| `UNRATE` | Unemployment Rate | Monthly | Level |
| `FEDFUNDS` | Federal Funds Rate | Daily → Quarterly | Average |
| `DFF` | Effective Fed Funds Rate | Daily | Average |
| `T10Y2Y` | 10Y-2Y Treasury Spread | Daily | Level |
| `VIXCLS` | VIX Volatility Index | Daily | Level |
| `SP500` | S&P 500 Index | Daily | % change |
| `DEXKOUS` | USD/KRW Exchange Rate | Daily | Level |

#### BOK ECOS API (Bank of Korea)
| Code | Description | Frequency |
|------|-------------|-----------|
| `200Y104` | Real GDP (KRW billions) | Quarterly |
| `901Y009` | Consumer Price Index | Monthly |
| `722Y001` | Base Interest Rate | Monthly |
| `731Y003` | KRW/USD Exchange Rate | Daily |
| `403Y001` | Export/Import Statistics | Monthly |
| `104Y014` | Unemployment Rate | Monthly |

#### World Bank Indicators
| Indicator Code | Description |
|----------------|-------------|
| `NY.GDP.MKTP.KD.ZG` | GDP growth (annual %) |
| `FP.CPI.TOTL.ZG` | Inflation, consumer prices |
| `SL.UEM.TOTL.ZS` | Unemployment rate |
| `NE.TRD.GNFS.ZS` | Trade (% of GDP) |
| `BX.KLT.DINV.WD.GD.ZS` | FDI inflows (% of GDP) |

#### Data Processing Pipeline
```
Raw API → Quarterly Alignment → Missing Value Imputation → Normalization → Graph Features
         ↓                      ↓                         ↓
    Time aggregation        KNN/MICE                  Z-score per feature
```

---

### 6.3 Training Details

#### Loss Functions (from `losses.py`)

**Primary Loss: Weighted MSE**
```python
def economic_mse_loss(predictions, targets, feature_weights):
    """
    MSE with per-variable importance weights

    feature_weights = {
        'gdp_growth_rate': 2.0,      # High importance
        'inflation_rate': 2.0,        # High importance
        'unemployment_rate': 1.5,     # Medium importance
        'interest_rate': 1.0,         # Standard importance
        'trade_balance': 1.0          # Standard importance
    }
    """
    squared_errors = (predictions - targets) ** 2
    weighted_errors = squared_errors * feature_weights
    return jnp.mean(weighted_errors)
```

**Alternative Losses Available:**
- `economic_mae_loss`: L1 loss for outlier robustness
- `economic_huber_loss`: Huber loss (δ=1.0) for balanced sensitivity

#### Optimizer Configuration (from `config.yaml`)
```yaml
training:
  learning_rate: 0.001
  batch_size: 8
  num_epochs: 100
  warmup_epochs: 5
  optimizer: "adam"
  adam_beta1: 0.9
  adam_beta2: 0.999
  weight_decay: 0.0001
  gradient_clip: 1.0

  # Learning rate schedule
  lr_scheduler: "cosine"
  min_lr: 0.0001

  # Early stopping
  early_stopping: true
  patience: 10
  min_delta: 0.0001
```

#### Training Metrics
```python
def compute_metrics(predictions, targets):
    return {
        'mse': mean_squared_error(predictions, targets),
        'mae': mean_absolute_error(predictions, targets),
        'r2': r2_score(predictions, targets),           # Target: >0.99
        'directional_accuracy': direction_accuracy(),    # Target: >80%
        'per_feature_mse': per_feature_breakdown(),
        'per_country_mae': per_country_breakdown()
    }
```

#### Hardware Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU | GTX 1080 (8GB) | RTX 3090 (24GB) |
| RAM | 16 GB | 32 GB |
| Training Time | ~2 hours | ~30 minutes |
| Inference | <100ms | <50ms |

---

### 6.4 Spillover Methodology

#### VAR-based Spillover (Diebold-Yilmaz Index)

**Forecast Error Variance Decomposition (FEVD):**
```python
def compute_spillover_index(var_model, horizon=10):
    """
    Diebold-Yilmaz (2012) Spillover Index

    Steps:
    1. Estimate VAR(p) model
    2. Compute H-step ahead FEVD
    3. Normalize each row to sum to 100%
    4. Spillover Index = (sum of off-diagonal) / N × 100
    """
    fevd = var_model.fevd(horizon)

    # Normalize
    fevd_normalized = fevd / fevd.sum(axis=1, keepdims=True)

    # Total spillover = off-diagonal contributions
    n = fevd_normalized.shape[0]
    own_contribution = np.trace(fevd_normalized)
    total_spillover = (n - own_contribution) / n * 100

    return total_spillover, fevd_normalized
```

**Directional Spillovers:**
- **TO others**: Sum of column (excluding diagonal) - shock impact to others
- **FROM others**: Sum of row (excluding diagonal) - shock received from others
- **NET**: TO - FROM (positive = net transmitter)

#### GNN-based Spillover

**Message Passing Interpretation:**
```python
def gnn_spillover_analysis(model, shock_country, shock_size=1.0):
    """
    Track shock propagation through 8 message passing steps

    Returns:
        step_impacts: dict[step] -> dict[country] -> impact_magnitude
        attention_weights: learned edge importance at each step
    """
    # Initial shock
    node_states = model.initialize_states()
    node_states[shock_country] += shock_size

    step_impacts = {}
    for step in range(8):
        # Message passing
        messages = model.processor.compute_messages(node_states)
        node_states = model.processor.update_nodes(node_states, messages)

        # Record impacts
        step_impacts[step] = {
            country: node_states[country] - baseline[country]
            for country in countries
        }

    return step_impacts
```

**Key Differences in Spillover Analysis:**

| Aspect | VAR (FEVD) | GNN (Message Passing) |
|--------|------------|----------------------|
| **Mechanism** | Linear variance decomposition | Non-linear attention-weighted messages |
| **Steps** | H-step forecast (typically 10) | 8 message passing iterations |
| **Edge Weights** | Implicit (VAR coefficients) | Explicit (learned attention) |
| **Non-linearity** | ❌ Linear only | ✅ Non-linear transformations |
| **Interpretability** | Direct coefficient interpretation | Attention weight visualization |

---

### 6.5 Code Examples

#### Running VAR Shock Simulation (GraphECast)
```python
# var_analysis.py
from data_sources.var_analysis import VARModel

# Initialize model
var = VARModel(
    variables=['gdp_growth', 'inflation', 'unemployment',
               'interest_rate', 'sp500', 'fed_funds'],
    lag_order=4  # AIC-selected or fixed
)

# Fit to data
var.fit(data, start='2000-01-01', end='2024-12-31')

# Simulate Fed rate shock
irf = var.impulse_response(
    impulse='fed_funds',
    response=['gdp_growth', 'unemployment', 'sp500'],
    periods=20,
    shock_size=0.25  # 25 basis points
)

# Compute Diebold-Yilmaz spillover
spillover_index, fevd_matrix = var.compute_spillover(horizon=10)
print(f"Total Spillover Index: {spillover_index:.1f}%")

# Granger causality test
causality = var.granger_causality_test(
    cause='fed_funds',
    effect='gdp_growth',
    max_lag=4
)
print(f"p-value: {causality['p_value']:.4f}")
```

#### Running GNN Shock Simulation (WWAI-GNN)
```python
# gnn_shock_simulation.py
import jax
import haiku as hk
from wwai_gnn.models.graph_econcast import GraphEconCast
from wwai_gnn.models.economic_graph import build_economic_graph

# Load trained model
model = GraphEconCast.from_checkpoint('checkpoints/best_model.pkl')

# Build economic graph
graph = build_economic_graph(
    countries=['USA', 'China', 'Korea', 'Japan', 'Germany', ...],
    trade_matrix=load_trade_matrix(),
    features=load_country_features()
)

# Simulate shock
shock_config = {
    'country': 'USA',
    'variable': 'interest_rate',
    'magnitude': 1.0,  # 1 standard deviation
    'type': 'persistent'  # or 'transient'
}

# Run propagation
results = model.simulate_shock(graph, shock_config)

# Analyze step-by-step impacts
for step in range(8):
    print(f"\n=== Step {step + 1} ===")
    for country, impact in results['step_impacts'][step].items():
        if abs(impact['gdp_growth']) > 0.01:
            print(f"  {country}: GDP impact = {impact['gdp_growth']:+.3f}")

# Get attention weights for interpretation
attention = model.get_attention_weights(graph)
top_edges = attention.top_k(k=10)
print("\nTop Spillover Channels:")
for src, dst, weight in top_edges:
    print(f"  {src} → {dst}: {weight:.3f}")
```

#### API Usage Comparison
```bash
# GraphECast (VAR) - Port 8012
curl -X POST http://localhost:8012/api/var/simulate-fed-shock \
  -H "Content-Type: application/json" \
  -d '{"shock_size": 0.25, "horizon": 20}'

# WWAI-GNN - Port 8000
curl -X POST http://localhost:8000/api/gnn/simulate-shock \
  -H "Content-Type: application/json" \
  -d '{
    "country": "USA",
    "variable": "interest_rate",
    "magnitude": 1.0,
    "steps": 8
  }'
```

---

### 6.6 Visualization Specifications

#### Library Usage

| Library | Purpose | Components |
|---------|---------|------------|
| **Plotly.js** | Interactive charts | IRF plots, time series, 3D surfaces |
| **D3.js** | Custom visualizations | Force-directed graphs, sankey diagrams |
| **vis-network** | Network graphs | Transmission networks, country connections |
| **Recharts** | React charts | Dashboard metrics, bar charts |
| **Chart.js** | Simple charts | Pie charts, basic line graphs |

#### Chart Specifications

**1. Economic Weather Map (Plotly Choropleth)**
```javascript
// Plotly configuration
{
  type: 'choropleth',
  locationmode: 'country names',
  colorscale: [
    [0, '#dc2626'],      // Red: contraction
    [0.5, '#fbbf24'],    // Yellow: neutral
    [1, '#22c55e']       // Green: expansion
  ],
  colorbar: {
    title: 'Economic Health Index',
    tickvals: [-1, 0, 1],
    ticktext: ['Contraction', 'Neutral', 'Expansion']
  }
}
```

**2. Shock Propagation Network (vis-network)**
```javascript
// vis-network configuration
{
  nodes: {
    shape: 'dot',
    scaling: {
      min: 10,
      max: 50,
      label: { enabled: true }
    },
    color: {
      border: '#475569',
      background: '#3b82f6',
      highlight: { background: '#60a5fa' }
    }
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    color: { inherit: 'from' },
    smooth: { type: 'continuous' }
  },
  physics: {
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -50,
      centralGravity: 0.01,
      springLength: 200
    }
  }
}
```

**3. Impulse Response Functions (Plotly Line)**
```javascript
// Multi-line IRF plot
{
  type: 'scatter',
  mode: 'lines',
  line: { width: 2 },
  fill: 'tozeroy',      // Confidence bands
  fillcolor: 'rgba(59, 130, 246, 0.2)'
}
// Layout
{
  xaxis: { title: 'Quarters after shock' },
  yaxis: { title: 'Response (% deviation)' },
  hovermode: 'x unified',
  legend: { orientation: 'h', y: -0.2 }
}
```

**4. FEVD Heatmap (Plotly Heatmap)**
```javascript
{
  type: 'heatmap',
  colorscale: 'RdBu',
  reversescale: true,
  zmin: -1,
  zmax: 1,
  hovertemplate: 'From: %{x}<br>To: %{y}<br>Contribution: %{z:.1%}'
}
```

**5. Message Passing Animation (D3.js)**
```javascript
// Animated node updates per step
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2));

// Step animation
function animateStep(step) {
  nodes.transition()
    .duration(500)
    .attr('r', d => 10 + stepImpacts[step][d.id] * 20)
    .style('fill', d => colorScale(stepImpacts[step][d.id]));

  edges.transition()
    .duration(500)
    .style('stroke-width', d => attention[step][d.id] * 5);
}
```

#### Dashboard Color Palette (Dark Theme)
```css
/* Financial indicators */
--bullish: #22c55e;        /* Green-500 */
--bearish: #ef4444;        /* Red-500 */
--neutral: #64748b;        /* Slate-500 */

/* Chart backgrounds */
--chart-bg: #1e293b;       /* Slate-800 */
--chart-grid: #334155;     /* Slate-700 */
--chart-text: #cbd5e1;     /* Slate-300 */

/* Regime colors */
--regime-expansion: #22c55e;
--regime-contraction: #ef4444;
--regime-transition: #f59e0b;
```

---

## References

1. GraphCast: Learning skillful medium-range global weather forecasting (Lam et al., 2023)
2. Learning to Simulate Complex Physics with Graph Networks (Sanchez-Gonzalez et al., 2020)
3. Vector Autoregression (Sims, 1980)
4. Relational inductive biases, deep learning, and graph networks (Battaglia et al., 2018)

---

*Document created: 2026-01-31*
*WWAI-GNN Project Documentation*
