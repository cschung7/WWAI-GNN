/**
 * Graph algorithms for InfraNodus-style network visualization.
 * Pure functions: Louvain community detection, betweenness centrality,
 * symmetric adjacency builder, and weighted edge list builder.
 */

export interface GraphEdge {
  source: number
  target: number
  sourceCode: string
  targetCode: string
  weight: number       // raw spillover weight
  normalizedWeight: number  // [0,1] normalized
}

// ---------------------------------------------------------------------------
// 1. Build symmetric adjacency matrix from asymmetric spillover matrix
// ---------------------------------------------------------------------------
export function buildSymmetricAdjacency(
  matrix: Record<string, Record<string, number>>,
  countries: string[]
): number[][] {
  const n = countries.length
  const adj: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const idx = new Map(countries.map((c, i) => [c, i]))

  for (let i = 0; i < n; i++) {
    const ci = countries[i]
    const row = matrix[ci]
    if (!row) continue
    for (let j = i + 1; j < n; j++) {
      const cj = countries[j]
      const forward = row[cj] ?? 0
      const backward = matrix[cj]?.[ci] ?? 0
      const sym = Math.max(forward, backward)
      adj[i][j] = sym
      adj[j][i] = sym
    }
  }

  return adj
}

// ---------------------------------------------------------------------------
// 2. Louvain community detection (single-pass modularity optimization)
// ---------------------------------------------------------------------------
export function louvainCommunities(adj: number[][], n: number): number[] {
  // Compute total edge weight
  let totalWeight = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalWeight += adj[i][j]
    }
  }
  if (totalWeight === 0) {
    // No edges: each node in its own community
    return Array.from({ length: n }, (_, i) => i % 4)
  }
  const m2 = totalWeight * 2

  // Node degrees (weighted)
  const degree = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      degree[i] += adj[i][j]
    }
  }

  // Initialize: each node in its own community
  const community = Array.from({ length: n }, (_, i) => i)

  // Sum of weights inside each community
  const sigmaIn = new Array(n).fill(0)
  // Sum of all weights incident to community
  const sigmaTot = degree.slice()

  const MAX_ITERATIONS = 15
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let moved = false

    for (let i = 0; i < n; i++) {
      const currentComm = community[i]

      // Compute weights to neighboring communities
      const neighborComms = new Map<number, number>()
      for (let j = 0; j < n; j++) {
        if (adj[i][j] > 0 && i !== j) {
          const c = community[j]
          neighborComms.set(c, (neighborComms.get(c) ?? 0) + adj[i][j])
        }
      }

      // Remove i from current community
      const ki = degree[i]
      const kiIn = neighborComms.get(currentComm) ?? 0
      sigmaTot[currentComm] -= ki
      sigmaIn[currentComm] -= 2 * kiIn

      // Find best community
      let bestComm = currentComm
      let bestDelta = 0

      for (const [c, wic] of neighborComms) {
        // Modularity gain of moving i to community c
        const delta = (wic - sigmaTot[c] * ki / m2)
        if (delta > bestDelta) {
          bestDelta = delta
          bestComm = c
        }
      }

      // Also consider staying (delta = 0 means no improvement)
      // Move to best community
      community[i] = bestComm
      const kiBest = neighborComms.get(bestComm) ?? 0
      sigmaTot[bestComm] += ki
      sigmaIn[bestComm] += 2 * kiBest

      if (bestComm !== currentComm) moved = true
    }

    if (!moved) break
  }

  // Renumber communities to 0..k-1
  const uniqueComms = [...new Set(community)]
  const remap = new Map(uniqueComms.map((c, i) => [c, i]))
  return community.map(c => remap.get(c)!)
}

// ---------------------------------------------------------------------------
// 3. Betweenness centrality (Brandes' algorithm)
// ---------------------------------------------------------------------------
export function betweennessCentrality(
  adj: number[][],
  n: number,
  threshold: number = 0.005
): number[] {
  const bc = new Array(n).fill(0)

  for (let s = 0; s < n; s++) {
    // BFS / Dijkstra-like shortest paths
    const stack: number[] = []
    const predecessors: number[][] = Array.from({ length: n }, () => [])
    const sigma = new Array(n).fill(0) // # shortest paths
    const dist = new Array(n).fill(-1)
    const delta = new Array(n).fill(0)

    sigma[s] = 1
    dist[s] = 0
    const queue: number[] = [s]

    // BFS on unweighted graph (edges above threshold)
    while (queue.length > 0) {
      const v = queue.shift()!
      stack.push(v)

      for (let w = 0; w < n; w++) {
        if (adj[v][w] < threshold || v === w) continue

        // w found for the first time?
        if (dist[w] < 0) {
          queue.push(w)
          dist[w] = dist[v] + 1
        }

        // shortest path to w via v?
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v]
          predecessors[w].push(v)
        }
      }
    }

    // Back-propagation
    while (stack.length > 0) {
      const w = stack.pop()!
      for (const v of predecessors[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
      }
      if (w !== s) {
        bc[w] += delta[w]
      }
    }
  }

  // Normalize to [0,1]
  const maxBC = Math.max(...bc, 1e-10)
  return bc.map(v => v / maxBC)
}

// ---------------------------------------------------------------------------
// 4. Build weighted edge list from spillover matrix
// ---------------------------------------------------------------------------
export function buildEdgeList(
  matrix: Record<string, Record<string, number>>,
  countries: string[],
  minWeight: number = 0.005
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const n = countries.length
  let maxWeight = 0

  // First pass: collect and find max
  const rawEdges: { i: number; j: number; w: number }[] = []
  for (let i = 0; i < n; i++) {
    const ci = countries[i]
    const row = matrix[ci]
    if (!row) continue
    for (let j = i + 1; j < n; j++) {
      const cj = countries[j]
      const forward = row[cj] ?? 0
      const backward = matrix[cj]?.[ci] ?? 0
      const w = Math.max(forward, backward)
      if (w >= minWeight) {
        rawEdges.push({ i, j, w })
        maxWeight = Math.max(maxWeight, w)
      }
    }
  }

  // Second pass: normalize and build
  for (const { i, j, w } of rawEdges) {
    edges.push({
      source: i,
      target: j,
      sourceCode: countries[i],
      targetCode: countries[j],
      weight: w,
      normalizedWeight: maxWeight > 0 ? w / maxWeight : 0,
    })
  }

  return edges
}
