/**
 * ForceAtlas2 layout engine with LinLog mode for InfraNodus-style visualization.
 * Adapted for 26-node economic network: repulsion, attraction, gravity, adaptive speed.
 */

export interface FA2Node {
  x: number
  y: number
  dx: number  // displacement accumulator
  dy: number
  oldDx: number
  oldDy: number
  mass: number  // degree + 1
  convergence: number  // per-node adaptive speed
}

export interface FA2Edge {
  source: number
  target: number
  weight: number
}

export interface FA2Config {
  scalingRatio: number
  gravity: number
  edgeWeightInfluence: number
  linLogMode: boolean
  strongGravity: boolean
  outboundAttractionDistribution: boolean
  slowingRatio: number
  jitterTolerance: number
}

const DEFAULT_CONFIG: FA2Config = {
  scalingRatio: 10,
  gravity: 1.0,
  edgeWeightInfluence: 1.0,
  linLogMode: true,
  strongGravity: false,
  outboundAttractionDistribution: false,
  slowingRatio: 2.0,
  jitterTolerance: 1.0,
}

export function createFA2Nodes(
  positions: { x: number; y: number }[],
  degrees: number[]
): FA2Node[] {
  return positions.map((pos, i) => ({
    x: pos.x,
    y: pos.y,
    dx: 0,
    dy: 0,
    oldDx: 0,
    oldDy: 0,
    mass: (degrees[i] || 0) + 1,
    convergence: 1,
  }))
}

/**
 * Run one iteration of ForceAtlas2.
 * Mutates nodes in place for performance.
 */
export function fa2Iterate(
  nodes: FA2Node[],
  edges: FA2Edge[],
  config: Partial<FA2Config> = {},
  frame: number = 0,
  totalFrames: number = 300
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const n = nodes.length

  // Phase-based parameters
  // Phase 1 (0-20%): Fast separation - high repulsion
  // Phase 2 (20-67%): Normal settling
  // Phase 3 (67-100%): Fine-tuning - low forces
  const progress = frame / totalFrames
  let phaseMultiplier: number
  if (progress < 0.2) {
    phaseMultiplier = 2.0
  } else if (progress < 0.67) {
    phaseMultiplier = 1.0
  } else {
    phaseMultiplier = 0.3 + 0.7 * (1 - (progress - 0.67) / 0.33)
  }

  // Reset displacements
  for (let i = 0; i < n; i++) {
    nodes[i].oldDx = nodes[i].dx
    nodes[i].oldDy = nodes[i].dy
    nodes[i].dx = 0
    nodes[i].dy = 0
  }

  // --- Repulsion (all pairs) ---
  const scalingRatio = cfg.scalingRatio * phaseMultiplier
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01

      // LinLog repulsion: force = scalingRatio * mass_i * mass_j / dist
      const force = scalingRatio * nodes[i].mass * nodes[j].mass / dist
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      nodes[i].dx -= fx
      nodes[i].dy -= fy
      nodes[j].dx += fx
      nodes[j].dy += fy
    }
  }

  // --- Attraction (edges) ---
  for (const edge of edges) {
    const s = nodes[edge.source]
    const t = nodes[edge.target]
    const dx = t.x - s.x
    const dy = t.y - s.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01

    let force: number
    if (cfg.linLogMode) {
      // LinLog attraction: log(1 + dist) * weight
      force = Math.log(1 + dist) * Math.pow(edge.weight, cfg.edgeWeightInfluence)
    } else {
      force = dist * Math.pow(edge.weight, cfg.edgeWeightInfluence)
    }

    // Outbound attraction distribution: normalize by source mass
    if (cfg.outboundAttractionDistribution) {
      force /= s.mass
    }

    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    s.dx += fx
    s.dy += fy
    t.dx -= fx
    t.dy -= fy
  }

  // --- Gravity ---
  const cx = 500  // center of viewBox
  const cy = 300
  for (let i = 0; i < n; i++) {
    const dx = nodes[i].x - cx
    const dy = nodes[i].y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01

    let gravForce: number
    if (cfg.strongGravity) {
      gravForce = cfg.gravity * nodes[i].mass
    } else {
      gravForce = cfg.gravity * nodes[i].mass / dist
    }

    nodes[i].dx -= (dx / dist) * gravForce * phaseMultiplier
    nodes[i].dy -= (dy / dist) * gravForce * phaseMultiplier
  }

  // --- Adaptive speed per node ---
  let totalSwing = 0
  let totalEffectiveTraction = 0

  for (let i = 0; i < n; i++) {
    const swinging = Math.sqrt(
      (nodes[i].dx - nodes[i].oldDx) ** 2 +
      (nodes[i].dy - nodes[i].oldDy) ** 2
    )
    const effectiveTraction = Math.sqrt(
      (nodes[i].dx + nodes[i].oldDx) ** 2 +
      (nodes[i].dy + nodes[i].oldDy) ** 2
    ) / 2

    totalSwing += nodes[i].mass * swinging
    totalEffectiveTraction += nodes[i].mass * effectiveTraction

    // Per-node convergence: slow if oscillating, fast if converging
    nodes[i].convergence = Math.min(
      1,
      cfg.jitterTolerance * cfg.jitterTolerance * effectiveTraction / (swinging + 0.01)
    )
  }

  // Global speed
  const globalSpeed = cfg.jitterTolerance * cfg.jitterTolerance *
    totalEffectiveTraction / (totalSwing + 0.01)
  const clampedSpeed = Math.min(globalSpeed, 10)

  // Apply displacements with adaptive speed
  for (let i = 0; i < n; i++) {
    const displacement = Math.sqrt(nodes[i].dx ** 2 + nodes[i].dy ** 2)
    if (displacement <= 0) continue

    // Speed = global speed * node convergence / slowing ratio
    const nodeSpeed = clampedSpeed * nodes[i].convergence / cfg.slowingRatio

    // Limit displacement per node
    const maxDisplacement = nodeSpeed * displacement
    const limitedSpeed = Math.min(maxDisplacement, 10) / displacement

    nodes[i].x += nodes[i].dx * limitedSpeed
    nodes[i].y += nodes[i].dy * limitedSpeed
  }

  // --- Minimum distance enforcement (overlap prevention) ---
  const minSeparation = 65
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minSeparation && dist > 0.01) {
        const push = (minSeparation - dist) * 0.5
        const ux = (dx / dist) * push
        const uy = (dy / dist) * push
        nodes[i].x -= ux
        nodes[i].y -= uy
        nodes[j].x += ux
        nodes[j].y += uy
      }
    }
  }

  // --- Soft bounds: push back toward viewBox ---
  const margin = 60
  const maxX = 940
  const maxY = 540
  const boundsForce = 0.6

  for (let i = 0; i < n; i++) {
    if (nodes[i].x < margin) nodes[i].x += (margin - nodes[i].x) * boundsForce
    if (nodes[i].x > maxX) nodes[i].x -= (nodes[i].x - maxX) * boundsForce
    if (nodes[i].y < margin) nodes[i].y += (margin - nodes[i].y) * boundsForce
    if (nodes[i].y > maxY) nodes[i].y -= (nodes[i].y - maxY) * boundsForce
  }
}
