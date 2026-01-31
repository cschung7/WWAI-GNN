# GraphEconCast: Investment Q&A

*Frequently Asked Questions for Market Participants*
*Date: 2026-01-29*

---

## General Overview

### Q: What is GraphEconCast?

**A:** GraphEconCast is a Graph Neural Network (GNN) model that forecasts macroeconomic indicators across 26 major economies. Unlike traditional econometric models that treat countries in isolation, GraphEconCast explicitly models the network of economic relationships—trade linkages, geographic proximity, and development similarity—to predict how economies move together and how shocks propagate across borders.

---

### Q: What does the model predict?

**A:** The model predicts 5 key economic indicators on a quarterly basis:

| Indicator | Description |
|-----------|-------------|
| GDP Growth | Real quarterly GDP growth rate |
| Inflation | Consumer price index change (YoY) |
| Unemployment | Labor market unemployment rate |
| Interest Rate | Central bank policy rate |
| Trade Balance | Exports minus imports |

---

### Q: Which countries are covered?

**A:** 26 major economies representing ~85% of global GDP:

- **G7:** USA, Canada, UK, France, Germany, Italy, Japan
- **BRICS:** Brazil, Russia, India, China
- **Other Developed:** South Korea, Spain, Australia, Netherlands, Switzerland, Sweden, Belgium, Norway, Austria, Poland
- **Other Emerging:** Mexico, Indonesia, Saudi Arabia, Turkey, Argentina

---

### Q: How accurate is the model?

**A:** In-sample validation shows **99.49% R²** on historical FRED data (2000-2025). However, this is in-sample performance. Out-of-sample backtesting on held-out periods is recommended before live deployment.

| Metric | Value |
|--------|-------|
| Validation R² | 99.49% |
| Best Val Loss | 0.0117 |
| Parameters | 4M |

---

## Use Cases

### Q: How can macro hedge funds use this?

**A:** Three primary use cases:

1. **Relative Value:** Rank countries by expected GDP growth to identify long/short opportunities
   > *Example: "Model expects Germany to underperform France by 1.2%—consider long CAC40 vs DAX"*

2. **Regime Detection:** Identify when economies shift from expansion to contraction
   > *Example: "Model detects China entering slowdown regime—reduce EM exposure"*

3. **Spillover Analysis:** Understand how shocks propagate
   > *Example: "If US growth falls 1%, model estimates Mexico GDP falls 0.6% via trade linkage"*

---

### Q: How can fixed income traders use this?

**A:** Focus on interest rate and inflation predictions:

1. **Central Bank Path:** Compare Fed vs ECB vs BOJ rate trajectories
2. **Inflation Surprises:** Identify where model diverges from consensus
3. **Spread Trades:** Use growth differentials to trade yield spreads

> *Example: "Model sees US inflation sticky at 3.2% vs consensus 2.8%—expect Fed to stay higher for longer"*

---

### Q: How can EM specialists use this?

**A:** Country risk and contagion analysis:

1. **Vulnerability Index:** Combine trade balance, growth, and rates into stress score
2. **Contagion Mapping:** Identify first-order and second-order spillover targets
3. **Twin Deficit Alerts:** Flag countries with deteriorating fundamentals

> *Example: "If Brazil enters recession, model estimates 80% probability Argentina follows within 2 quarters"*

---

### Q: How can corporate treasurers use this?

**A:** FX and growth exposure management:

1. **Regional Forecasts:** Plan inventory and capex based on growth outlook
2. **FX Implications:** Growth differentials drive currency movements
3. **Scenario Planning:** Stress test supply chain under different macro scenarios

---

## Methodology

### Q: Why use a Graph Neural Network instead of traditional VAR models?

**A:** Four key advantages:

| Traditional VAR | GraphEconCast GNN |
|-----------------|-------------------|
| Countries modeled independently | **Network structure captures relationships** |
| Linear spillover assumptions | **Non-linear contagion dynamics** |
| Fixed coefficients | **Learned, adaptive edge weights** |
| Difficult to interpret | **Graph attention provides explainability** |

The GNN can answer questions like: *"If German GDP falls 1%, how much does Poland's GDP fall?"*—capturing the causal transmission through trade edges.

---

### Q: What are the three types of edges in the model?

**A:** The economic graph has three edge types:

1. **Trade Edges:** Bilateral trade relationships (exports/imports)
2. **Geographic Edges:** Physical proximity between countries
3. **Similarity Edges:** Development level and structural similarity

Each edge type has learned weights that indicate the strength of economic transmission.

---

### Q: How does the model handle non-linear effects?

**A:** Traditional models assume: *"1% China slowdown = X% impact everywhere."*

GraphEconCast can learn: *"Small China slowdown = mild impact, but large slowdown triggers contagion cascade as second-order effects compound."*

This is captured through 8 message-passing steps that allow effects to propagate through the network.

---

### Q: Can the model explain its predictions?

**A:** Yes, through edge attention analysis:

> *"This quarter's US GDP prediction was driven by:*
> - *40% domestic momentum (self-edge)*
> - *25% China trade edge*
> - *20% Europe geographic cluster*
> - *15% other factors"*

This interpretability is a key advantage over black-box models.

---

## Practical Application

### Q: What's the prediction frequency?

**A:** Quarterly. The model uses 4 quarters of history to predict the next quarter's values.

| Aspect | Detail |
|--------|--------|
| Input | 4 quarters of lagged indicators |
| Output | Next quarter prediction |
| Update | Quarterly (as new FRED data releases) |

---

### Q: How far ahead can the model predict?

**A:** The model is designed for 1-quarter ahead predictions. For longer horizons:

- **2Q ahead:** Feed Q1 predictions as inputs, predict Q2
- **4Q ahead:** Iterative rollout with compounding uncertainty

Accuracy degrades with horizon length—best used for 1-2 quarter outlook.

---

### Q: What data sources does the model use?

**A:** Federal Reserve Economic Data (FRED), which aggregates:

- OECD statistics
- IMF data
- National statistical agencies
- BIS (Bank for International Settlements)

Data is quarterly, with typical 2-3 month publication lag.

---

### Q: How often should predictions be updated?

**A:** Recommended cadence:

| Frequency | Use Case |
|-----------|----------|
| **Quarterly** | Full model re-run with new GDP data |
| **Monthly** | Update with inflation/unemployment data |
| **Weekly** | Monitor for consensus divergence |

---

## Signals & Alerts

### Q: What signals can the model generate?

**A:** Five primary signal types:

1. **Momentum Ranking:** Countries ranked by predicted GDP growth
2. **Divergence Alerts:** Model vs consensus differs by >2σ
3. **Regime Change:** Economy shifts from expansion to contraction
4. **Spillover Risk:** Elevated contagion probability
5. **Decoupling Detection:** Correlation breakdown between economies

---

### Q: Can you give an example of a divergence alert?

**A:**

```
⚠️ DIVERGENCE ALERT: Germany Q2 2026

Model Prediction:  GDP +0.3%
Consensus:         GDP +0.8%
Divergence:        -0.5% (2.1σ below consensus)

Key Drivers:
- Manufacturing PMI edge weight declining
- China trade linkage weakening
- Energy price sensitivity elevated

Implication:
- Consider underweight German equities
- EUR downside risk vs USD
- Bund rally potential (growth disappointment → lower rates)
```

---

### Q: How do I interpret a spillover warning?

**A:**

```
🔴 SPILLOVER ALERT: China Slowdown Scenario

If China GDP falls to 3% (from 5%):

First-Order Impact (direct trade):
  Korea:    -1.2%
  Taiwan:   -1.0%
  Japan:    -0.8%
  Australia:-0.7%

Second-Order Impact (via supply chains):
  Germany:  -0.5%
  USA:      -0.3%

Confidence: 85% based on historical edge weights
```

---

## Limitations & Caveats

### Q: What are the model's limitations?

**A:** Important caveats:

| Limitation | Explanation |
|------------|-------------|
| **In-sample R²** | 99.5% R² is on training data; live performance may differ |
| **Quarterly lag** | Economic data has 2-3 month publication delay |
| **Black swans** | Model learns from history; unprecedented events need judgment |
| **Not for trading** | Strategic tool, not tactical trading signal |

---

### Q: What can the model NOT do?

**A:**

- **Not a price predictor:** Outputs are economic indicators, not asset prices
- **Not real-time:** Quarterly frequency with data lag
- **Not deterministic:** Predictions have uncertainty bands
- **Not immune to regime breaks:** COVID-style shocks require human judgment

---

### Q: How should I validate the model before using it?

**A:** Recommended validation steps:

1. **Out-of-sample backtest:** Hold out 2020-2024 data, measure true R²
2. **Consensus comparison:** Does model beat IMF/Bloomberg forecasts?
3. **Directional accuracy:** What % of up/down moves are correctly predicted?
4. **Portfolio simulation:** Can signals generate risk-adjusted alpha?

---

## Integration

### Q: What output formats are available?

**A:**

| Format | Audience | Content |
|--------|----------|---------|
| **Weekly PDF** | Portfolio managers | Top calls, scorecard, alerts |
| **Dashboard** | Analysts | Interactive charts, scenario tools |
| **API/Data feed** | Quants | Raw predictions, factor exposures |
| **Alerts** | Traders | Push notifications on signals |

---

### Q: How can I integrate this with my trading system?

**A:** API integration path:

```python
# Example API call
from wwai_gnn.api import GraphEconCastAPI

api = GraphEconCastAPI(api_key="your_key")

# Get latest predictions
predictions = api.get_predictions(
    countries=["USA", "DEU", "CHN"],
    indicators=["gdp_growth", "inflation"],
    horizon="1Q"
)

# Get spillover matrix
spillovers = api.get_spillover_matrix(
    shock_country="CHN",
    shock_magnitude=-0.02  # -2% GDP shock
)
```

---

### Q: What's the recommended workflow for a macro PM?

**A:**

```
Monday AM:
1. Check weekly scorecard email
2. Review any divergence alerts
3. Note regime change flags

Weekly Process:
1. Compare model vs your views
2. Identify high-conviction divergences
3. Size positions based on model confidence

Quarterly:
1. Review model performance vs consensus
2. Analyze which edges drove predictions
3. Adjust portfolio based on new forecasts
```

---

## Future Development

### Q: What enhancements are planned?

**A:** Roadmap:

| Priority | Enhancement |
|----------|-------------|
| P1 | Out-of-sample backtesting framework |
| P1 | Consensus comparison module |
| P2 | Interactive dashboard (Streamlit) |
| P2 | Edge attention visualization |
| P3 | Real-time data pipeline |
| P3 | Multi-horizon forecasting |

---

### Q: Can the model be customized for specific use cases?

**A:** Yes, potential customizations:

- **Sector focus:** Add industry-level indicators
- **Higher frequency:** Integrate monthly/weekly data
- **Custom countries:** Add/remove countries from graph
- **Alternative edges:** Use capital flows, sentiment, or policy similarity

---

## Contact & Resources

### Q: Where can I learn more?

**A:** Resources:

- **Technical documentation:** `docs/1_summary_training_results.md`
- **Model architecture:** Based on DeepMind's GraphCast
- **Data source:** FRED API (fred.stlouisfed.org)

### Q: How do I report issues or request features?

**A:** Contact the WWAI-GNN development team or submit issues via the project repository.

---

*Document version: 1.0*
*Last updated: 2026-01-29*
*Model: GraphEconCast v1.0 (R² 99.49%)*
