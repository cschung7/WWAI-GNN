# Copyright 2024 WWAI Project
#
# FastAPI backend for WWAI-GNN economic forecasting.

"""
GNN-based Economic Forecasting API

Endpoints:
- /api/gnn/simulate-shock: Simulate shock propagation through economic network
- /api/gnn/predictions: Get model predictions for all countries
- /api/gnn/spillover-matrix: Get spillover coefficients
- /api/gnn/graph-structure: Get graph topology (nodes and edges)
- /api/gnn/message-flow: Get step-by-step message passing visualization
- /api/gnn/countries: Get country list with metadata
"""

import os
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime
import numpy as np

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from wwai_gnn.simulation.shock_simulator import GNNShockSimulator, ShockConfig
from wwai_gnn.models.economic_graph import DEFAULT_COUNTRIES, COUNTRY_COORDINATES


# =============================================================================
# App Configuration
# =============================================================================

app = FastAPI(
    title="WWAI-GNN Economic Forecasting API",
    description="GNN-based macroeconomic forecasting using DeepMind GraphCast architecture",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# =============================================================================
# Global State
# =============================================================================

# Initialize simulator (singleton)
simulator = GNNShockSimulator()

# Sample predictions (in production, load from trained model)
SAMPLE_PREDICTIONS = {
    "USA": {"gdp_growth_rate": 2.4, "inflation_rate": 3.2, "unemployment_rate": 3.8, "interest_rate": 5.25, "trade_balance": -3.1},
    "CHN": {"gdp_growth_rate": 4.8, "inflation_rate": 1.8, "unemployment_rate": 5.2, "interest_rate": 3.45, "trade_balance": 2.8},
    "JPN": {"gdp_growth_rate": 1.2, "inflation_rate": 2.4, "unemployment_rate": 2.5, "interest_rate": 0.10, "trade_balance": -0.5},
    "DEU": {"gdp_growth_rate": 0.8, "inflation_rate": 2.9, "unemployment_rate": 5.9, "interest_rate": 4.50, "trade_balance": 6.2},
    "IND": {"gdp_growth_rate": 6.8, "inflation_rate": 5.1, "unemployment_rate": 7.8, "interest_rate": 6.50, "trade_balance": -2.1},
    "GBR": {"gdp_growth_rate": 1.1, "inflation_rate": 4.0, "unemployment_rate": 4.2, "interest_rate": 5.25, "trade_balance": -3.8},
    "FRA": {"gdp_growth_rate": 1.4, "inflation_rate": 2.8, "unemployment_rate": 7.3, "interest_rate": 4.50, "trade_balance": -2.4},
    "ITA": {"gdp_growth_rate": 0.9, "inflation_rate": 2.6, "unemployment_rate": 7.8, "interest_rate": 4.50, "trade_balance": 2.1},
    "BRA": {"gdp_growth_rate": 2.1, "inflation_rate": 4.5, "unemployment_rate": 7.9, "interest_rate": 11.75, "trade_balance": 1.2},
    "CAN": {"gdp_growth_rate": 1.5, "inflation_rate": 3.1, "unemployment_rate": 5.8, "interest_rate": 5.00, "trade_balance": -1.8},
    "KOR": {"gdp_growth_rate": 2.2, "inflation_rate": 2.7, "unemployment_rate": 2.8, "interest_rate": 3.50, "trade_balance": 4.5},
    "ESP": {"gdp_growth_rate": 2.0, "inflation_rate": 3.4, "unemployment_rate": 11.8, "interest_rate": 4.50, "trade_balance": 1.2},
    "AUS": {"gdp_growth_rate": 1.8, "inflation_rate": 3.6, "unemployment_rate": 3.9, "interest_rate": 4.35, "trade_balance": 2.8},
    "RUS": {"gdp_growth_rate": 2.3, "inflation_rate": 7.5, "unemployment_rate": 3.0, "interest_rate": 16.0, "trade_balance": 8.1},
    "MEX": {"gdp_growth_rate": 2.5, "inflation_rate": 4.8, "unemployment_rate": 2.9, "interest_rate": 11.25, "trade_balance": -0.8},
    "IDN": {"gdp_growth_rate": 5.1, "inflation_rate": 2.8, "unemployment_rate": 5.3, "interest_rate": 6.25, "trade_balance": 2.1},
    "NLD": {"gdp_growth_rate": 0.6, "inflation_rate": 2.5, "unemployment_rate": 3.7, "interest_rate": 4.50, "trade_balance": 9.2},
    "SAU": {"gdp_growth_rate": 1.5, "inflation_rate": 2.3, "unemployment_rate": 4.8, "interest_rate": 6.00, "trade_balance": 12.5},
    "TUR": {"gdp_growth_rate": 4.2, "inflation_rate": 65.0, "unemployment_rate": 9.4, "interest_rate": 45.0, "trade_balance": -4.8},
    "CHE": {"gdp_growth_rate": 1.3, "inflation_rate": 1.4, "unemployment_rate": 2.0, "interest_rate": 1.75, "trade_balance": 8.5},
    "POL": {"gdp_growth_rate": 2.8, "inflation_rate": 3.8, "unemployment_rate": 2.9, "interest_rate": 5.75, "trade_balance": -0.5},
    "SWE": {"gdp_growth_rate": 0.2, "inflation_rate": 2.3, "unemployment_rate": 7.8, "interest_rate": 4.00, "trade_balance": 4.2},
    "BEL": {"gdp_growth_rate": 1.1, "inflation_rate": 2.8, "unemployment_rate": 5.6, "interest_rate": 4.50, "trade_balance": 0.8},
    "ARG": {"gdp_growth_rate": -1.5, "inflation_rate": 142.0, "unemployment_rate": 6.2, "interest_rate": 40.0, "trade_balance": 1.8},
    "NOR": {"gdp_growth_rate": 0.5, "inflation_rate": 3.8, "unemployment_rate": 4.0, "interest_rate": 4.50, "trade_balance": 12.8},
    "AUT": {"gdp_growth_rate": 0.3, "inflation_rate": 3.2, "unemployment_rate": 5.1, "interest_rate": 4.50, "trade_balance": 2.1},
}

# Model info
MODEL_INFO = {
    "name": "GraphEconCast",
    "version": "1.0.0",
    "architecture": "Encoder-Processor-Decoder",
    "latent_size": 256,
    "message_passing_steps": 8,
    "parameters": "4.03M",
    "r2_score": 0.9949,
    "val_loss": 0.0117,
    "training_period": "2000-2025",
    "countries": 26,
    "indicators": 5,
}


# =============================================================================
# Pydantic Models
# =============================================================================

class ShockRequest(BaseModel):
    """Request model for shock simulation."""
    country: str = Field(..., description="Country code (e.g., 'USA', 'CHN')")
    variable: str = Field(
        default="gdp_growth_rate",
        description="Variable to shock (gdp_growth_rate, inflation_rate, etc.)"
    )
    magnitude: float = Field(
        default=-1.0,
        description="Shock magnitude in standard deviations"
    )
    shock_type: str = Field(
        default="persistent",
        description="Shock type: persistent or transient"
    )


class PredictionRequest(BaseModel):
    """Request model for predictions."""
    countries: Optional[List[str]] = Field(
        default=None,
        description="List of country codes. None for all countries."
    )


class SpilloverRequest(BaseModel):
    """Request model for spillover analysis."""
    origin_country: str = Field(..., description="Origin country for spillover analysis")
    top_k: int = Field(default=10, description="Number of top affected countries to return")


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/")
async def root():
    """API root - returns basic info."""
    return {
        "name": "WWAI-GNN Economic Forecasting API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "docs": "/api/docs",
            "simulate_shock": "/api/gnn/simulate-shock",
            "predictions": "/api/gnn/predictions",
            "spillover_matrix": "/api/gnn/spillover-matrix",
            "graph_structure": "/api/gnn/graph-structure",
            "countries": "/api/gnn/countries",
            "model_info": "/api/gnn/model-info",
        }
    }


@app.get("/api/gnn/model-info")
async def get_model_info():
    """Get model information and metrics."""
    return {
        "model": MODEL_INFO,
        "features": {
            "input": ["gdp_growth_rate", "inflation_rate", "unemployment_rate", "interest_rate", "trade_balance"],
            "static": ["latitude", "longitude", "development_level"],
            "edge_types": ["trade", "geographic", "similarity"],
        },
        "graph_stats": simulator.graph_builder.get_statistics(),
    }


@app.post("/api/gnn/simulate-shock")
@app.post("/api/gnn/simulate")  # Alias for frontend compatibility
async def simulate_shock(request: ShockRequest):
    """Simulate shock propagation through economic network.

    Uses 8-step message passing to propagate shocks through trade,
    geographic, and similarity edges.
    """
    try:
        config = ShockConfig(
            country=request.country,
            variable=request.variable,
            magnitude=request.magnitude,
            shock_type=request.shock_type,
        )

        result = simulator.simulate_shock(config)

        return {
            "success": True,
            "simulation": result,
            "metadata": {
                "model": "GraphEconCast",
                "timestamp": datetime.now().isoformat(),
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@app.get("/api/gnn/predictions")
async def get_predictions(
    countries: Optional[str] = Query(
        default=None,
        description="Comma-separated country codes. Empty for all."
    )
):
    """Get model predictions for countries.

    Returns predicted values for GDP growth, inflation, unemployment,
    interest rates, and trade balance.
    """
    if countries:
        country_list = [c.strip().upper() for c in countries.split(",")]
    else:
        country_list = DEFAULT_COUNTRIES

    predictions = {}
    for country in country_list:
        if country in SAMPLE_PREDICTIONS:
            predictions[country] = SAMPLE_PREDICTIONS[country]

    return {
        "predictions": predictions,
        "timestamp": datetime.now().isoformat(),
        "model_version": MODEL_INFO["version"],
    }


@app.get("/api/gnn/spillover-matrix")
async def get_spillover_matrix(
    origin: Optional[str] = Query(
        default=None,
        description="Origin country code. Empty for full matrix."
    ),
    top_k: int = Query(
        default=10,
        description="Top K affected countries per origin"
    )
):
    """Get spillover coefficients between countries.

    Shows how much a shock in one country affects others,
    based on trade intensity and economic integration.
    """
    full_matrix = simulator.get_spillover_matrix()

    if origin:
        origin = origin.upper()
        if origin not in full_matrix:
            raise HTTPException(status_code=404, detail=f"Country not found: {origin}")

        # Get top-k affected
        spillovers = full_matrix[origin]
        sorted_spillovers = sorted(
            [(k, v) for k, v in spillovers.items() if k != origin],
            key=lambda x: -x[1]
        )[:top_k]

        return {
            "origin": origin,
            "spillovers": dict(sorted_spillovers),
            "self_impact": spillovers[origin],
        }

    return {
        "matrix": full_matrix,
        "countries": list(full_matrix.keys()),
    }


@app.get("/api/gnn/graph-structure")
async def get_graph_structure(
    edge_type: Optional[str] = Query(
        default=None,
        description="Filter by edge type: trade, geographic, similarity"
    )
):
    """Get graph structure for visualization.

    Returns nodes (countries) and edges (connections) with weights.
    """
    structure = simulator._get_graph_structure()

    if edge_type:
        if edge_type not in ["trade", "geographic", "similarity"]:
            raise HTTPException(status_code=400, detail=f"Invalid edge type: {edge_type}")
        structure["edges"] = {edge_type: structure["edges"].get(edge_type, [])}

    return structure


@app.get("/api/gnn/countries")
async def get_countries():
    """Get list of countries with metadata."""
    countries = []
    for code in DEFAULT_COUNTRIES:
        lat, lon = COUNTRY_COORDINATES.get(code, (0, 0))
        prediction = SAMPLE_PREDICTIONS.get(code, {})

        # Determine signal based on GDP growth
        gdp = prediction.get("gdp_growth_rate", 0)
        if gdp > 3:
            signal = "strong"
        elif gdp > 2:
            signal = "stable"
        elif gdp > 1:
            signal = "slowing"
        elif gdp > 0:
            signal = "weak"
        else:
            signal = "contraction"

        countries.append({
            "code": code,
            "latitude": lat,
            "longitude": lon,
            "prediction": prediction,
            "signal": signal,
        })

    return {
        "countries": countries,
        "total": len(countries),
    }


@app.get("/api/gnn/message-flow/{country}")
async def get_message_flow(
    country: str,
    variable: str = Query(
        default="gdp_growth_rate",
        description="Variable to track"
    ),
    magnitude: float = Query(
        default=-1.0,
        description="Shock magnitude"
    )
):
    """Get step-by-step message flow for visualization.

    Returns how messages propagate through the network at each step.
    """
    country = country.upper()

    try:
        config = ShockConfig(
            country=country,
            variable=variable,
            magnitude=magnitude,
            shock_type="persistent",
        )

        result = simulator.simulate_shock(config)

        # Extract just the message flow data
        message_flow = []
        for step_data in result["step_impacts"]:
            flow = {
                "step": step_data["step"],
                "active_countries": list(step_data["country_impacts"].keys()),
                "impacts": step_data["country_impacts"],
                "active_edges": step_data["edge_weights"],
            }
            message_flow.append(flow)

        return {
            "origin": country,
            "variable": variable,
            "magnitude": magnitude,
            "steps": message_flow,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/gnn/attention-weights")
async def get_attention_weights(
    origin: str = Query(..., description="Origin country code"),
    step: int = Query(default=4, description="Message passing step (1-8)")
):
    """Get attention weights for edges from origin country.

    Shows which connections are most important for shock propagation.
    """
    origin = origin.upper()

    if origin not in simulator.country_to_idx:
        raise HTTPException(status_code=404, detail=f"Country not found: {origin}")

    if step < 1 or step > 8:
        raise HTTPException(status_code=400, detail="Step must be between 1 and 8")

    origin_idx = simulator.country_to_idx[origin]

    # Get weights from adjacency matrices
    weights = {
        "trade": [],
        "geographic": [],
        "similarity": [],
    }

    for j, target in enumerate(simulator.countries):
        if j != origin_idx:
            trade_w = float(simulator.trade_adj[origin_idx, j])
            geo_w = float(simulator.geo_adj[origin_idx, j])
            sim_w = float(simulator.sim_adj[origin_idx, j])

            if trade_w > 0.05:
                weights["trade"].append({"target": target, "weight": trade_w})
            if geo_w > 0.05:
                weights["geographic"].append({"target": target, "weight": geo_w})
            if sim_w > 0.05:
                weights["similarity"].append({"target": target, "weight": sim_w})

    # Sort by weight
    for edge_type in weights:
        weights[edge_type] = sorted(weights[edge_type], key=lambda x: -x["weight"])

    return {
        "origin": origin,
        "step": step,
        "attention_weights": weights,
    }


# =============================================================================
# Report Generation
# =============================================================================

# Country full names for reports (English and Korean)
COUNTRY_NAMES_EN = {
    "USA": "United States", "CHN": "China", "DEU": "Germany", "JPN": "Japan",
    "GBR": "United Kingdom", "FRA": "France", "IND": "India", "BRA": "Brazil",
    "CAN": "Canada", "KOR": "South Korea", "ITA": "Italy", "ESP": "Spain",
    "MEX": "Mexico", "AUS": "Australia", "IDN": "Indonesia", "NLD": "Netherlands",
    "SAU": "Saudi Arabia", "TUR": "Turkey", "CHE": "Switzerland", "POL": "Poland",
    "SWE": "Sweden", "BEL": "Belgium", "ARG": "Argentina", "NOR": "Norway",
    "AUT": "Austria", "RUS": "Russia",
}

COUNTRY_NAMES_KO = {
    "USA": "미국", "CHN": "중국", "DEU": "독일", "JPN": "일본",
    "GBR": "영국", "FRA": "프랑스", "IND": "인도", "BRA": "브라질",
    "CAN": "캐나다", "KOR": "한국", "ITA": "이탈리아", "ESP": "스페인",
    "MEX": "멕시코", "AUS": "호주", "IDN": "인도네시아", "NLD": "네덜란드",
    "SAU": "사우디아라비아", "TUR": "터키", "CHE": "스위스", "POL": "폴란드",
    "SWE": "스웨덴", "BEL": "벨기에", "ARG": "아르헨티나", "NOR": "노르웨이",
    "AUT": "오스트리아", "RUS": "러시아",
}

def get_country_name(code: str, lang: str = "en") -> str:
    """Get localized country name."""
    if lang == "ko":
        return COUNTRY_NAMES_KO.get(code, code)
    return COUNTRY_NAMES_EN.get(code, code)

VARIABLE_NAMES = {
    "gdp_growth_rate": {"en": "GDP Growth Rate", "ko": "GDP 성장률", "unit": "%p"},
    "inflation_rate": {"en": "Inflation Rate", "ko": "물가상승률", "unit": "%p"},
    "unemployment_rate": {"en": "Unemployment Rate", "ko": "실업률", "unit": "%p"},
    "interest_rate": {"en": "Interest Rate", "ko": "금리", "unit": "bp"},
    "trade_balance": {"en": "Trade Balance", "ko": "무역수지", "unit": "% GDP"},
}


class ReportRequest(BaseModel):
    """Request model for report generation."""
    country: str = Field(..., description="Shock origin country code")
    variable: str = Field(default="gdp_growth_rate", description="Shock variable")
    magnitude: float = Field(default=-1.0, description="Shock magnitude")
    lang: str = Field(default="en", description="Language: en or ko")


@app.post("/api/gnn/generate-report")
async def generate_report(request: ReportRequest):
    """Generate a formatted report for shock simulation.

    Returns structured report data with tables, interpretations, and metadata
    for rendering in web or PDF format.
    """
    try:
        # Run simulation
        config = ShockConfig(
            country=request.country,
            variable=request.variable,
            magnitude=request.magnitude,
            shock_type="persistent",
        )
        result = simulator.simulate_shock(config)

        # Get final impacts
        final_impacts = result["final_impacts"]

        # Sort countries by max absolute impact
        sorted_countries = sorted(
            [(c, v) for c, v in final_impacts.items() if c != request.country],
            key=lambda x: -max(abs(val) for val in x[1].values())
        )

        # Determine if Korean
        is_ko = request.lang == "ko"

        # Build impact table data with localized country names
        impact_table = []
        for rank, (country, vars) in enumerate(sorted_countries[:15], 1):
            row = {
                "rank": rank,
                "code": country,
                "name": get_country_name(country, request.lang),
                "gdp": vars.get("gdp_growth_rate", 0) * 100,
                "inflation": vars.get("inflation_rate", 0) * 100,
                "unemployment": vars.get("unemployment_rate", 0) * 100,
                "interest_rate": vars.get("interest_rate", 0) * 100,
                "trade": vars.get("trade_balance", 0) * 100,
            }
            impact_table.append(row)

        # Get variable info
        var_info = VARIABLE_NAMES.get(request.variable, VARIABLE_NAMES["gdp_growth_rate"])
        origin_name = get_country_name(request.country, request.lang)

        # Format magnitude
        if request.variable == "interest_rate":
            mag_str = f"{request.magnitude:+.0f}bp"
        else:
            mag_str = f"{request.magnitude:+.1f}%p"

        # Generate interpretation (economic analysis)
        if is_ko:
            # Korean interpretation
            shock_direction = "상승" if request.magnitude > 0 else "하락"
            impact_direction = "부정적" if (request.magnitude > 0 and request.variable == "interest_rate") else "긍정적" if request.magnitude > 0 else "부정적"

            interpretation = {
                "title": f"{origin_name} {var_info['ko']} 충격 분석 보고서",
                "scenario": f"{origin_name}의 {var_info['ko']}이(가) {mag_str} {shock_direction}하는 시나리오",
                "summary": f"GNN 8단계 메시지 패싱을 통한 시뮬레이션 결과, {len([r for r in impact_table if abs(r['gdp']) > 0.01])}개국이 유의미한 영향을 받는 것으로 분석됩니다.",
                "key_findings": [],
                "methodology": "본 분석은 GraphEconCast 모델의 비선형 메시지 패싱 알고리즘을 사용합니다. 무역, 지리적 근접성, 구조적 유사성의 3가지 엣지 유형을 통해 충격이 전파됩니다.",
                "disclaimer": "본 보고서는 모델 시뮬레이션 결과이며, 실제 경제 상황과 다를 수 있습니다. 투자 결정의 유일한 근거로 사용해서는 안 됩니다.",
            }

            # Key findings
            if impact_table:
                top = impact_table[0]
                interpretation["key_findings"].append(
                    f"가장 큰 영향을 받는 국가는 {top['name']}으로, GDP {top['gdp']:+.2f}%p, 금리 {top['interest_rate']:+.2f}%p의 변화가 예상됩니다."
                )

                asia_count = len([r for r in impact_table[:10] if r['code'] in ['CHN', 'JPN', 'KOR', 'IND', 'IDN']])
                if asia_count >= 3:
                    interpretation["key_findings"].append(
                        f"아시아 경제권이 특히 큰 영향을 받으며, 상위 10개국 중 {asia_count}개국이 아시아 국가입니다."
                    )

                if request.variable == "interest_rate":
                    interpretation["key_findings"].append(
                        "금리 충격은 무역 및 자본 흐름을 통해 글로벌 금융 긴축/완화 효과를 전파합니다."
                    )
        else:
            # English interpretation
            shock_direction = "increase" if request.magnitude > 0 else "decrease"

            interpretation = {
                "title": f"{origin_name} {var_info['en']} Shock Analysis Report",
                "scenario": f"Scenario: {origin_name} {var_info['en']} {shock_direction}s by {mag_str}",
                "summary": f"GNN 8-step message passing simulation shows {len([r for r in impact_table if abs(r['gdp']) > 0.01])} countries experiencing significant spillover effects.",
                "key_findings": [],
                "methodology": "This analysis uses GraphEconCast's non-linear message passing algorithm. Shocks propagate through three edge types: trade linkages, geographic proximity, and structural similarity.",
                "disclaimer": "This report is based on model simulation results and may differ from actual economic outcomes. It should not be used as the sole basis for investment decisions.",
            }

            # Key findings
            if impact_table:
                top = impact_table[0]
                interpretation["key_findings"].append(
                    f"Most affected country: {top['name']} with GDP impact of {top['gdp']:+.2f}%p and interest rate change of {top['interest_rate']:+.2f}%p."
                )

                asia_count = len([r for r in impact_table[:10] if r['code'] in ['CHN', 'JPN', 'KOR', 'IND', 'IDN']])
                if asia_count >= 3:
                    interpretation["key_findings"].append(
                        f"Asian economies are particularly affected, with {asia_count} out of top 10 impacted countries being in Asia."
                    )

                if request.variable == "interest_rate":
                    interpretation["key_findings"].append(
                        "Interest rate shocks propagate global monetary tightening/easing effects through trade and capital flow channels."
                    )

        return {
            "success": True,
            "report": {
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "model": "GraphEconCast v1.0",
                    "r2_score": MODEL_INFO["r2_score"],
                    "message_passing_steps": 8,
                },
                "scenario": {
                    "origin_country": request.country,
                    "origin_name": origin_name,
                    "variable": request.variable,
                    "variable_name": var_info["ko"] if is_ko else var_info["en"],
                    "magnitude": request.magnitude,
                    "magnitude_str": mag_str,
                    "unit": var_info["unit"],
                },
                "interpretation": interpretation,
                "impact_table": impact_table,
                "statistics": {
                    "total_affected": len([r for r in impact_table if abs(r['gdp']) > 0.01]),
                    "max_gdp_impact": max([abs(r['gdp']) for r in impact_table]) if impact_table else 0,
                    "avg_gdp_impact": sum([r['gdp'] for r in impact_table]) / len(impact_table) if impact_table else 0,
                },
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": True,
        "countries": len(simulator.countries),
    }


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
    )
