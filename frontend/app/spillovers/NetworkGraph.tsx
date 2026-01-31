'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ImpactData {
  country: string
  gdp_growth_rate: number
  inflation_rate: number
  unemployment_rate: number
  interest_rate: number
  trade_balance: number
}

interface SimulationResult {
  impacts: ImpactData[]
  metadata: {
    shock_country: string
    shock_variable: string
    shock_magnitude: number
    message_passing_steps: number
    model_r2: number
  }
}

interface Node {
  code: string
  x: number
  y: number
  vx: number
  vy: number
  region: string
  fx?: number | null
  fy?: number | null
}

export interface NetworkGraphProps {
  simulationResult: SimulationResult | null
  impactVariable: string
  shockCountry: string
  lang: 'en' | 'ko'
}

// Region colors for clustering
const REGION_COLORS: Record<string, string> = {
  Americas: '#3b82f6',
  Europe: '#8b5cf6',
  Asia: '#10b981',
  MiddleEast: '#f59e0b',
  Oceania: '#06b6d4',
  Africa: '#ec4899',
}

// Initial positions with geographic spacing
const INITIAL_POSITIONS: Record<string, { x: number; y: number; region: string }> = {
  // Americas (left side)
  USA: { x: 180, y: 220, region: 'Americas' },
  CAN: { x: 200, y: 140, region: 'Americas' },
  MEX: { x: 150, y: 300, region: 'Americas' },
  BRA: { x: 280, y: 420, region: 'Americas' },
  ARG: { x: 240, y: 500, region: 'Americas' },
  // Europe (center-left)
  GBR: { x: 420, y: 160, region: 'Europe' },
  DEU: { x: 480, y: 200, region: 'Europe' },
  FRA: { x: 440, y: 240, region: 'Europe' },
  ITA: { x: 500, y: 280, region: 'Europe' },
  ESP: { x: 400, y: 300, region: 'Europe' },
  NLD: { x: 460, y: 150, region: 'Europe' },
  BEL: { x: 445, y: 190, region: 'Europe' },
  CHE: { x: 475, y: 250, region: 'Europe' },
  POL: { x: 540, y: 180, region: 'Europe' },
  SWE: { x: 510, y: 100, region: 'Europe' },
  TUR: { x: 580, y: 320, region: 'Europe' },
  RUS: { x: 620, y: 120, region: 'Europe' },
  // Asia (right side)
  CHN: { x: 740, y: 260, region: 'Asia' },
  JPN: { x: 850, y: 220, region: 'Asia' },
  KOR: { x: 810, y: 250, region: 'Asia' },
  IND: { x: 680, y: 350, region: 'Asia' },
  IDN: { x: 780, y: 430, region: 'Asia' },
  THA: { x: 750, y: 380, region: 'Asia' },
  // Middle East & Others
  SAU: { x: 600, y: 380, region: 'MiddleEast' },
  AUS: { x: 850, y: 500, region: 'Oceania' },
  ZAF: { x: 520, y: 480, region: 'Africa' },
}

// Country names
const COUNTRY_NAMES: Record<string, { en: string; ko: string }> = {
  USA: { en: 'United States', ko: '미국' },
  CAN: { en: 'Canada', ko: '캐나다' },
  MEX: { en: 'Mexico', ko: '멕시코' },
  BRA: { en: 'Brazil', ko: '브라질' },
  ARG: { en: 'Argentina', ko: '아르헨티나' },
  GBR: { en: 'United Kingdom', ko: '영국' },
  DEU: { en: 'Germany', ko: '독일' },
  FRA: { en: 'France', ko: '프랑스' },
  ITA: { en: 'Italy', ko: '이탈리아' },
  ESP: { en: 'Spain', ko: '스페인' },
  NLD: { en: 'Netherlands', ko: '네덜란드' },
  BEL: { en: 'Belgium', ko: '벨기에' },
  CHE: { en: 'Switzerland', ko: '스위스' },
  POL: { en: 'Poland', ko: '폴란드' },
  SWE: { en: 'Sweden', ko: '스웨덴' },
  TUR: { en: 'Turkey', ko: '터키' },
  RUS: { en: 'Russia', ko: '러시아' },
  CHN: { en: 'China', ko: '중국' },
  JPN: { en: 'Japan', ko: '일본' },
  KOR: { en: 'South Korea', ko: '한국' },
  IND: { en: 'India', ko: '인도' },
  IDN: { en: 'Indonesia', ko: '인도네시아' },
  THA: { en: 'Thailand', ko: '태국' },
  SAU: { en: 'Saudi Arabia', ko: '사우디아라비아' },
  AUS: { en: 'Australia', ko: '호주' },
  ZAF: { en: 'South Africa', ko: '남아프리카' },
}

export default function NetworkGraph({
  simulationResult,
  impactVariable,
  shockCountry,
  lang,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [animationStep, setAnimationStep] = useState(0)

  // UI strings
  const ui = {
    shockOrigin: lang === 'ko' ? '충격 발생국' : 'Shock Origin',
    negativeImpact: lang === 'ko' ? '부정적 영향' : 'Negative Impact',
    positiveImpact: lang === 'ko' ? '긍정적 영향' : 'Positive Impact',
    unaffected: lang === 'ko' ? '영향 없음' : 'Unaffected',
    dragTip: lang === 'ko' ? '드래그: 이동 • 스크롤: 확대/축소' : 'Drag to pan • Scroll to zoom',
  }

  // Get country name
  const getCountryName = (code: string) => {
    return COUNTRY_NAMES[code]?.[lang] || code
  }

  // Convert simulation results to impact map
  const getImpacts = useCallback(() => {
    if (!simulationResult) return {}
    const impacts: Record<string, { value: number; raw: number }> = {}
    simulationResult.impacts.forEach(impact => {
      const value = impact[impactVariable as keyof ImpactData] as number
      if (typeof value === 'number') {
        impacts[impact.country] = { value, raw: value }
      }
    })
    return impacts
  }, [simulationResult, impactVariable])

  const impacts = getImpacts()

  // Initialize nodes
  useEffect(() => {
    const initialNodes: Node[] = Object.entries(INITIAL_POSITIONS).map(([code, pos]) => ({
      code,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      region: pos.region,
    }))
    setNodes(initialNodes)
  }, [])

  // Animation loop for shock waves
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 100)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Simple force simulation for node spacing
  useEffect(() => {
    if (nodes.length === 0) return

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }))

        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x
            const dy = newNodes[j].y - newNodes[i].y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const minDist = 70

            if (dist < minDist && dist > 0) {
              const force = (minDist - dist) / dist * 0.5
              const fx = dx * force
              const fy = dy * force

              if (!newNodes[i].fx) {
                newNodes[i].x -= fx
                newNodes[i].y -= fy
              }
              if (!newNodes[j].fx) {
                newNodes[j].x += fx
                newNodes[j].y += fy
              }
            }
          }
        }

        newNodes.forEach(node => {
          node.x = Math.max(50, Math.min(950, node.x))
          node.y = Math.max(50, Math.min(550, node.y))
        })

        return newNodes
      })
    }

    let iterations = 0
    const interval = setInterval(() => {
      simulate()
      iterations++
      if (iterations > 50) clearInterval(interval)
    }, 50)

    return () => clearInterval(interval)
  }, [nodes.length])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    }
  }, [transform])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggedNode) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }))
    } else if (draggedNode) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const x = (e.clientX - rect.left - transform.x) / transform.scale
      const y = (e.clientY - rect.top - transform.y) / transform.scale

      setNodes(prev => prev.map(node =>
        node.code === draggedNode ? { ...node, x, y, fx: x, fy: y } : node
      ))
    }
  }, [isDragging, draggedNode, dragStart, transform])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (draggedNode) {
      setNodes(prev => prev.map(node =>
        node.code === draggedNode ? { ...node, fx: null, fy: null } : node
      ))
      setDraggedNode(null)
    }
  }, [draggedNode])

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(transform.scale * delta, 0.5), 3)

    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setTransform(prev => ({
      scale: newScale,
      x: mouseX - (mouseX - prev.x) * (newScale / prev.scale),
      y: mouseY - (mouseY - prev.y) * (newScale / prev.scale),
    }))
  }, [transform])

  // Reset view
  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  // Get node by code
  const getNode = (code: string) => nodes.find(n => n.code === code)
  const shockNode = getNode(shockCountry)

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }))}
          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-lg flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }))}
          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-lg flex items-center justify-center"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="px-3 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm"
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 right-4 z-20 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
        {Math.round(transform.scale * 100)}%
      </div>

      {/* Hover tooltip */}
      {hoveredCountry && (
        <div className="absolute top-4 left-4 bg-slate-800 rounded-lg shadow-xl p-3 z-20 border border-slate-600 min-w-48">
          {(() => {
            const node = getNode(hoveredCountry)
            const impact = impacts[hoveredCountry]
            const isOrigin = hoveredCountry === shockCountry
            return (
              <>
                <div className="font-bold text-lg text-white">{getCountryName(hoveredCountry)}</div>
                <div className="text-xs text-slate-400">{hoveredCountry} • {node?.region}</div>
                {isOrigin && (
                  <div className="mt-2 text-red-400 font-semibold">⚡ {ui.shockOrigin}</div>
                )}
                {impact && !isOrigin && (
                  <div className="mt-2">
                    <span className={`font-mono text-lg ${impact.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {impact.value >= 0 ? '+' : ''}{impact.value.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{impactVariable.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Main SVG */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 600"
        className="w-full h-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl cursor-grab active:cursor-grabbing"
        style={{ minHeight: '400px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <radialGradient id="shockGradient">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Background grid */}
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeOpacity="0.05" />
          </pattern>
          <rect width="1000" height="600" fill="url(#grid)" />

          {/* Region labels */}
          <text x="180" y="50" className="fill-slate-600 text-lg font-bold" textAnchor="middle">Americas</text>
          <text x="480" y="50" className="fill-slate-600 text-lg font-bold" textAnchor="middle">Europe</text>
          <text x="780" y="50" className="fill-slate-600 text-lg font-bold" textAnchor="middle">Asia-Pacific</text>

          {/* Shock waves from origin */}
          {shockNode && (
            <>
              {[0, 1, 2].map(i => {
                const delay = i * 33
                const waveRadius = ((animationStep + delay) % 100) * 5
                return (
                  <circle
                    key={i}
                    cx={shockNode.x}
                    cy={shockNode.y}
                    r={waveRadius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2}
                    opacity={Math.max(0, 1 - waveRadius / 500)}
                  />
                )
              })}
            </>
          )}

          {/* Connection lines from shock country */}
          {shockNode && nodes.map(node => {
            if (node.code === shockCountry) return null
            const impact = impacts[node.code]
            if (!impact) return null

            return (
              <line
                key={`line-${node.code}`}
                x1={shockNode.x}
                y1={shockNode.y}
                x2={node.x}
                y2={node.y}
                stroke={impact.value < 0 ? '#ef4444' : '#22c55e'}
                strokeWidth={Math.min(3, Math.abs(impact.value) * 2)}
                strokeOpacity={0.3}
                strokeDasharray="4,4"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isShockOrigin = node.code === shockCountry
            const impact = impacts[node.code]
            const isHovered = node.code === hoveredCountry

            const baseRadius = 18
            const radius = isShockOrigin ? 26 : isHovered ? 24 : impact ? 22 : baseRadius

            let fillColor = REGION_COLORS[node.region] || '#475569'
            if (isShockOrigin) fillColor = '#dc2626'
            else if (impact && impact.value < 0) fillColor = '#f97316'
            else if (impact && impact.value > 0) fillColor = '#22c55e'

            return (
              <g
                key={node.code}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredCountry(node.code)}
                onMouseLeave={() => setHoveredCountry(null)}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setDraggedNode(node.code)
                }}
              >
                {/* Outer glow for shock origin */}
                {isShockOrigin && (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 20}
                      fill="url(#shockGradient)"
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 10}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      opacity={0.6}
                    >
                      <animate
                        attributeName="r"
                        values={`${radius + 8};${radius + 15};${radius + 8}`}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.2;0.6"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                {/* Impact ring */}
                {impact && !isShockOrigin && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 6}
                    fill="none"
                    stroke={impact.value < 0 ? '#f97316' : '#22c55e'}
                    strokeWidth={2}
                    opacity={0.6}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.6;0.3;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Main node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={fillColor}
                  stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered || isShockOrigin ? 'url(#glow)' : 'url(#shadow)'}
                  className="transition-all duration-200"
                />

                {/* Country code */}
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isShockOrigin ? 12 : 11}
                  fontWeight="bold"
                  fill="white"
                  className="pointer-events-none select-none"
                >
                  {node.code}
                </text>

                {/* Impact value badge */}
                {impact && !isShockOrigin && (
                  <g>
                    <rect
                      x={node.x + radius - 5}
                      y={node.y - radius - 5}
                      width={36}
                      height={16}
                      rx={8}
                      fill={impact.value < 0 ? '#dc2626' : '#16a34a'}
                    />
                    <text
                      x={node.x + radius + 13}
                      y={node.y - radius + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="bold"
                      fill="white"
                      className="pointer-events-none"
                    >
                      {impact.value >= 0 ? '+' : ''}{impact.value.toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-600 ring-2 ring-red-400/50"></div>
            <span className="text-slate-300">{ui.shockOrigin}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-500 ring-2 ring-orange-400/50"></div>
            <span className="text-slate-300">{ui.negativeImpact}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500 ring-2 ring-green-400/50"></div>
            <span className="text-slate-300">{ui.positiveImpact}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-500"></div>
            <span className="text-slate-300">{ui.unaffected}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {ui.dragTip}
        </div>
      </div>
    </div>
  )
}
