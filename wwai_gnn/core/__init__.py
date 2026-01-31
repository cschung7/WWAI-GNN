# Core GNN components adapted from DeepMind's GraphCast

"""Core GNN components for WWAI-GNN."""

from wwai_gnn.core.typed_graph import (
    TypedGraph,
    NodeSet,
    EdgeSet,
    EdgesIndices,
    EdgeSetKey,
    Context,
)
from wwai_gnn.core.typed_graph_net import (
    GraphNetwork,
    InteractionNetwork,
    GraphMapFeatures,
)
from wwai_gnn.core.deep_typed_graph_net import DeepTypedGraphNet
from wwai_gnn.core.mlp import LinearNormConditioning

__all__ = [
    "TypedGraph",
    "NodeSet",
    "EdgeSet",
    "EdgesIndices",
    "EdgeSetKey",
    "Context",
    "GraphNetwork",
    "InteractionNetwork",
    "GraphMapFeatures",
    "DeepTypedGraphNet",
    "LinearNormConditioning",
]
