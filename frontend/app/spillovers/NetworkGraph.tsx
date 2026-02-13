'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  buildSymmetricAdjacency,
  louvainCommunities,
  betweennessCentrality,
  buildEdgeList,
  type GraphEdge,
} from './graph-algorithms'
import { createFA2Nodes, fa2Iterate, type FA2Node, type FA2Edge } from './force-atlas2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

export interface NetworkGraphProps {
  simulationResult: SimulationResult | null
  impactVariable: string
  shockCountry: string
  lang: 'en' | 'ko'
  spilloverMatrix?: Record<string, Record<string, number>> | null
  graphStructure?: {
    nodes: { id: string; name: string }[]
    edges: Record<string, { source: string; target: string; weight: number }[]>
  } | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COMMUNITY_COLORS = [
  '#4ecdc4',  // Teal
  '#ffe66d',  // Golden Yellow
  '#ff6b6b',  // Coral Red
  '#a29bfe',  // Lavender
  '#fd79a8',  // Pink
]

const COMMUNITY_NAMES_EN = [
  'Cluster A', 'Cluster B', 'Cluster C', 'Cluster D', 'Cluster E',
]
const COMMUNITY_NAMES_KO = [
  '클러스터 A', '클러스터 B', '클러스터 C', '클러스터 D', '클러스터 E',
]

const INITIAL_POSITIONS: Record<string, { x: number; y: number; region: string }> = {
  USA: { x: 180, y: 250, region: 'Americas' },
  CAN: { x: 150, y: 160, region: 'Americas' },
  MEX: { x: 120, y: 350, region: 'Americas' },
  BRA: { x: 250, y: 440, region: 'Americas' },
  ARG: { x: 200, y: 510, region: 'Americas' },
  GBR: { x: 400, y: 140, region: 'Europe' },
  DEU: { x: 490, y: 180, region: 'Europe' },
  FRA: { x: 430, y: 250, region: 'Europe' },
  ITA: { x: 510, y: 310, region: 'Europe' },
  ESP: { x: 380, y: 330, region: 'Europe' },
  NLD: { x: 460, y: 110, region: 'Europe' },
  BEL: { x: 420, y: 190, region: 'Europe' },
  CHE: { x: 480, y: 260, region: 'Europe' },
  POL: { x: 560, y: 160, region: 'Europe' },
  SWE: { x: 520, y: 80, region: 'Europe' },
  TUR: { x: 600, y: 350, region: 'Europe' },
  RUS: { x: 640, y: 110, region: 'Europe' },
  CHN: { x: 760, y: 270, region: 'Asia' },
  JPN: { x: 880, y: 200, region: 'Asia' },
  KOR: { x: 840, y: 280, region: 'Asia' },
  IND: { x: 700, y: 380, region: 'Asia' },
  IDN: { x: 800, y: 440, region: 'Asia' },
  THA: { x: 760, y: 400, region: 'Asia' },
  SAU: { x: 620, y: 420, region: 'MiddleEast' },
  AUS: { x: 880, y: 500, region: 'Oceania' },
  ZAF: { x: 500, y: 490, region: 'Africa' },
}

const COUNTRY_NAMES: Record<string, { en: string; ko: string }> = {
  USA: { en: 'United States', ko: '미국' },
  CAN: { en: 'Canada', ko: '캐나다' },
  MEX: { en: 'Mexico', ko: '멕시코' },
  BRA: { en: 'Brazil', ko: '브라질' },
  ARG: { en: 'Argentina', ko: '아르헨티나' },
  GBR: { en: 'UK', ko: '영국' },
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
  SAU: { en: 'Saudi Arabia', ko: '사우디' },
  AUS: { en: 'Australia', ko: '호주' },
  ZAF: { en: 'South Africa', ko: '남아공' },
}

const TOTAL_FRAMES = 300
const FLUSH_INTERVAL = 3

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NetworkGraph({
  simulationResult,
  impactVariable,
  shockCountry,
  lang,
  spilloverMatrix,
  graphStructure,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Interaction state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [legendExpanded, setLegendExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Layout state
  const [nodePositions, setNodePositions] = useState<{ x: number; y: number }[]>([])

  // Computed graph data
  const [communities, setCommunities] = useState<number[]>([])
  const [centralities, setCentralities] = useState<number[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [layoutReady, setLayoutReady] = useState(false)

  // Animation ref
  const animRef = useRef<{
    nodes: FA2Node[]
    frameId: number | null
    frame: number
  }>({ nodes: [], frameId: null, frame: 0 })

  // ---------------------------------------------------------------------------
  // Compute graph when spillover matrix arrives
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!spilloverMatrix) return

    const countryList = Object.keys(spilloverMatrix).filter(c => INITIAL_POSITIONS[c])
    if (countryList.length === 0) return

    setCountries(countryList)

    const adj = buildSymmetricAdjacency(spilloverMatrix, countryList)
    const comms = louvainCommunities(adj, countryList.length)
    const bc = betweennessCentrality(adj, countryList.length)
    const edgeList = buildEdgeList(spilloverMatrix, countryList)

    setCommunities(comms)
    setCentralities(bc)
    setEdges(edgeList)

    const initPositions = countryList.map(c => {
      const pos = INITIAL_POSITIONS[c]
      return { x: pos?.x ?? 500, y: pos?.y ?? 300 }
    })

    const degrees = new Array(countryList.length).fill(0)
    for (const edge of edgeList) {
      degrees[edge.source]++
      degrees[edge.target]++
    }

    const fa2Nodes = createFA2Nodes(initPositions, degrees)
    animRef.current.nodes = fa2Nodes
    animRef.current.frame = 0
    setLayoutReady(false)
    setNodePositions(initPositions)

    const fa2Edges: FA2Edge[] = edgeList.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.normalizedWeight,
    }))

    const animate = () => {
      const ref = animRef.current
      if (ref.frame >= TOTAL_FRAMES) {
        setLayoutReady(true)
        return
      }

      fa2Iterate(ref.nodes, fa2Edges, {
        scalingRatio: 50,
        gravity: 2.5,
        linLogMode: true,
        jitterTolerance: 1.0,
        slowingRatio: 1.5,
      }, ref.frame, TOTAL_FRAMES)

      ref.frame++

      if (ref.frame % FLUSH_INTERVAL === 0 || ref.frame >= TOTAL_FRAMES) {
        setNodePositions(ref.nodes.map(n => ({ x: n.x, y: n.y })))
      }

      if (ref.frame >= TOTAL_FRAMES) {
        setLayoutReady(true)
      } else {
        ref.frameId = requestAnimationFrame(animate)
      }
    }

    if (animRef.current.frameId) cancelAnimationFrame(animRef.current.frameId)
    animRef.current.frameId = requestAnimationFrame(animate)

    return () => {
      if (animRef.current.frameId) cancelAnimationFrame(animRef.current.frameId)
    }
  }, [spilloverMatrix])

  // Fallback: no matrix
  useEffect(() => {
    if (spilloverMatrix) return
    const countryList = Object.keys(INITIAL_POSITIONS)
    setCountries(countryList)
    setNodePositions(countryList.map(c => ({
      x: INITIAL_POSITIONS[c].x, y: INITIAL_POSITIONS[c].y,
    })))
    setCommunities(countryList.map(() => 0))
    setCentralities(countryList.map(() => 0.5))
    setEdges([])
    setLayoutReady(true)
  }, [spilloverMatrix])

  // ---------------------------------------------------------------------------
  // Impacts
  // ---------------------------------------------------------------------------
  const impacts = useMemo(() => {
    if (!simulationResult) return {} as Record<string, number>
    const map: Record<string, number> = {}
    simulationResult.impacts.forEach(impact => {
      const value = impact[impactVariable as keyof ImpactData] as number
      if (typeof value === 'number') map[impact.country] = value
    })
    return map
  }, [simulationResult, impactVariable])

  const getImpactColor = useCallback((value: number): string => {
    if (impactVariable === 'unemployment_rate') {
      if (value > 0.5) return '#f87171'
      if (value > 0.1) return '#fb923c'
      if (value < -0.1) return '#4ade80'
      return '#94a3b8'
    }
    if (value < -1) return '#f87171'
    if (value < -0.3) return '#fb923c'
    if (value > 0.3) return '#4ade80'
    return '#94a3b8'
  }, [impactVariable])

  // ---------------------------------------------------------------------------
  // InfraNodus-style sizing: small dots (3-8px), large labels (11-28px)
  // ---------------------------------------------------------------------------
  const getDotRadius = useCallback((idx: number): number => {
    const bc = centralities[idx] ?? 0
    return 3 + 6 * Math.pow(bc, 0.5)
  }, [centralities])

  const getLabelFontSize = useCallback((idx: number): number => {
    const bc = centralities[idx] ?? 0
    return 11 + 17 * Math.pow(bc, 0.6)
  }, [centralities])

  // All nodes get labels — this is the InfraNodus way
  // Opacity scales with centrality: hubs are bright, peripheral are dim
  const getLabelOpacity = useCallback((idx: number): number => {
    const bc = centralities[idx] ?? 0
    return 0.35 + 0.65 * Math.pow(bc, 0.4)
  }, [centralities])

  // ---------------------------------------------------------------------------
  // Unique communities
  // ---------------------------------------------------------------------------
  const uniqueCommunities = useMemo(() => [...new Set(communities)].sort(), [communities])

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------
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

      const idx = countries.indexOf(draggedNode)
      if (idx >= 0 && animRef.current.nodes[idx]) {
        animRef.current.nodes[idx].x = x
        animRef.current.nodes[idx].y = y
        setNodePositions(prev => {
          const next = [...prev]
          next[idx] = { x, y }
          return next
        })
      }
    }
  }, [isDragging, draggedNode, dragStart, transform, countries])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedNode(null)
  }, [])

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

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 })

  const getCountryName = (code: string) => COUNTRY_NAMES[code]?.[lang] || code

  // ---------------------------------------------------------------------------
  // UI strings
  // ---------------------------------------------------------------------------
  const ui = {
    shockOrigin: lang === 'ko' ? '충격 발생국' : 'Shock Origin',
    centrality: lang === 'ko' ? '중심성' : 'Centrality',
    connections: lang === 'ko' ? '연결' : 'Connections',
    textSize: lang === 'ko' ? '글자 크기 = 매개 중심성' : 'Text size = Betweenness Centrality',
    edgeColor: lang === 'ko' ? '선 색상 = 클러스터' : 'Edge color = Cluster',
    dragTip: lang === 'ko' ? '드래그: 이동 | 스크롤: 확대/축소 | 텍스트 드래그: 위치 변경' : 'Drag: pan | Scroll: zoom | Drag label: reposition',
    reset: lang === 'ko' ? '초기화' : 'Reset',
    strongNeg: lang === 'ko' ? '강한 부정적' : 'Strong Negative',
    negative: lang === 'ko' ? '부정적' : 'Negative',
    positive: lang === 'ko' ? '긍정적' : 'Positive',
    expand: lang === 'ko' ? '전체화면' : 'Expand',
    collapse: lang === 'ko' ? '닫기' : 'Close',
  }

  const shockIdx = countries.indexOf(shockCountry)

  // Close fullscreen on Escape
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // ---------------------------------------------------------------------------
  // Shared SVG inner content
  // ---------------------------------------------------------------------------
  const svgInner = (
    <>
      <defs>
        {COMMUNITY_COLORS.map((color, i) => (
          <filter key={`dg-${i}`} id={`dotglow-${i}`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={color} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
        <filter id="shockDotGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor="#ef4444" floodOpacity="0.7" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="1000" height="600" fill="#0a0a12" rx="12" />
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`} style={{ willChange: 'transform' }}>
        {/* Edges */}
        {edges.map((edge, i) => {
          const sp = nodePositions[edge.source], tp = nodePositions[edge.target]
          if (!sp || !tp) return null
          const commS = communities[edge.source], commT = communities[edge.target]
          const isIntra = commS === commT
          const color = isIntra ? COMMUNITY_COLORS[commS] ?? '#1a1a2e' : '#1e1e30'
          const opacity = isIntra ? 0.06 + edge.normalizedWeight * 0.22 : 0.03 + edge.normalizedWeight * 0.10
          return <line key={`e-${i}`} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y} stroke={color} strokeWidth={0.3 + edge.normalizedWeight * 1.5} strokeOpacity={opacity} />
        })}
        {/* Shock edges */}
        {simulationResult && shockIdx >= 0 && nodePositions[shockIdx] && (() => {
          const ranked = countries.map((code, idx) => ({ code, idx, abs: Math.abs(impacts[code] ?? 0) }))
            .filter(d => d.code !== shockCountry && d.abs >= 0.15).sort((a, b) => b.abs - a.abs).slice(0, 8)
          return ranked.map(({ code, idx, abs }) => {
            const val = impacts[code]!, sp = nodePositions[shockIdx], tp = nodePositions[idx]
            if (!sp || !tp) return null
            return <line key={`se-${code}`} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y} stroke={getImpactColor(val)}
              strokeWidth={Math.min(2.5, 0.8 + abs * 1.2)} strokeOpacity={Math.min(0.5, 0.12 + abs * 0.2)} strokeDasharray="6,6" />
          })
        })()}
        {/* Shock pulse */}
        {simulationResult && shockIdx >= 0 && nodePositions[shockIdx] && (
          <circle cx={nodePositions[shockIdx].x} cy={nodePositions[shockIdx].y} r={16} fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.5}>
            <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        {/* Dots */}
        {countries.map((code, idx) => {
          const pos = nodePositions[idx]
          if (!pos) return null
          const comm = communities[idx] ?? 0
          const r = code === 'KOR' ? Math.max(getDotRadius(idx), 6) : getDotRadius(idx)
          const isShock = code === shockCountry && !!simulationResult
          return <circle key={`dot-${code}`} cx={pos.x} cy={pos.y} r={r} fill={isShock ? '#ef4444' : COMMUNITY_COLORS[comm] ?? '#666'}
            filter={isShock ? 'url(#shockDotGlow)' : `url(#dotglow-${comm})`} />
        })}
        {/* Labels */}
        {countries.map((code, idx) => {
          const pos = nodePositions[idx]
          if (!pos) return null
          const comm = communities[idx] ?? 0, fontSize = getLabelFontSize(idx), opacity = getLabelOpacity(idx)
          const isShock = code === shockCountry && !!simulationResult, isHov = code === hoveredCountry
          const impactVal = impacts[code]
          let color = COMMUNITY_COLORS[comm] ?? '#666'
          if (isShock) color = '#ef4444'
          else if (simulationResult && impactVal !== undefined && Math.abs(impactVal) > 0.3) color = getImpactColor(impactVal)
          const fOp = isHov ? 1.0 : opacity, fSz = isHov ? fontSize * 1.15 : fontSize
          const name = getCountryName(code), dotR = getDotRadius(idx)
          const isKorea = code === 'KOR'
          const labelY = pos.y + dotR + fontSize * 0.4 + 4
          return (
            <g key={`label-${code}`} className="cursor-pointer"
              onMouseEnter={() => setHoveredCountry(code)} onMouseLeave={() => setHoveredCountry(null)}
              onMouseDown={(e) => { e.stopPropagation(); setDraggedNode(code) }}>
              <rect x={pos.x - 40} y={pos.y - fontSize * 0.6} width={80} height={fontSize * 1.2} fill="transparent" />
              {/* Korea highlight box */}
              {isKorea && (
                <rect
                  x={pos.x - fSz * 1.8} y={labelY - fSz * 0.55}
                  width={fSz * 3.6} height={fSz * 1.1}
                  rx={4} fill={color} fillOpacity={0.08}
                  stroke={color} strokeOpacity={0.5} strokeWidth={1.2}
                  className="pointer-events-none"
                />
              )}
              <text x={pos.x} y={labelY} textAnchor="middle" dominantBaseline="middle"
                fontSize={isKorea ? Math.max(fSz, 18) : fSz} fontWeight={isKorea ? '700' : (fontSize > 18 ? '700' : '500')} fontFamily="system-ui, -apple-system, sans-serif"
                fill={color} opacity={isKorea ? 1.0 : fOp} className="pointer-events-none select-none"
                style={{ textShadow: isKorea ? `0 0 12px ${color}60, 0 0 30px ${color}30` : `0 0 8px ${color}40, 0 0 20px ${color}20` }}>{name}</text>
              {simulationResult && impactVal !== undefined && !isShock && Math.abs(impactVal) >= 0.2 && (
                <text x={pos.x} y={pos.y + dotR + fontSize * 0.4 + 4 + fSz * 0.8} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.max(9, fSz * 0.45)} fontWeight="600" fontFamily="ui-monospace, monospace"
                  fill={getImpactColor(impactVal)} opacity={0.9} className="pointer-events-none select-none">
                  {impactVal >= 0 ? '+' : ''}{impactVal.toFixed(2)}%
                </text>
              )}
            </g>
          )
        })}
      </g>
      {/* In-SVG Legend */}
      <g className="cursor-pointer" onClick={() => setLegendExpanded(true)}>
        <rect x={850} y={10} width={140} height={simulationResult ? 126 : 78} rx={6} fill="#0a0a12" fillOpacity={0.88} stroke="#ffffff" strokeOpacity={0.08} strokeWidth={0.5} />
        {uniqueCommunities.slice(0, 3).map((comm, i) => (
          <g key={`leg-c-${comm}`}>
            <circle cx={861} cy={24 + i * 14} r={3} fill={COMMUNITY_COLORS[comm]} />
            <text x={869} y={24 + i * 14} fontSize={8.5} fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif"
              fill={COMMUNITY_COLORS[comm]} dominantBaseline="central" opacity={0.85}>
              {lang === 'ko' ? COMMUNITY_NAMES_KO[comm] : COMMUNITY_NAMES_EN[comm]}
            </text>
          </g>
        ))}
        {simulationResult && (() => {
          const baseY = 24 + Math.min(uniqueCommunities.length, 3) * 14 + 4
          return [
            { color: '#ef4444', label: ui.shockOrigin },
            { color: '#f87171', label: ui.strongNeg },
            { color: '#fb923c', label: ui.negative },
            { color: '#4ade80', label: ui.positive },
          ].map((item, i) => (
            <g key={`leg-i-${i}`}>
              <circle cx={861} cy={baseY + i * 12} r={2.5} fill={item.color} />
              <text x={869} y={baseY + i * 12} fontSize={7.5} fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif"
                fill={item.color} dominantBaseline="central" opacity={0.8}>{item.label}</text>
            </g>
          ))
        })()}
        <text x={985} y={simulationResult ? 130 : 82} textAnchor="end" fontSize={7} fill="#64748b"
          fontFamily="system-ui, -apple-system, sans-serif" opacity={0.5}>
          {lang === 'ko' ? '클릭하여 확대' : 'click to expand'}
        </text>
      </g>
    </>
  )

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------
  const tooltipEl = hoveredCountry ? (() => {
    const idx = countries.indexOf(hoveredCountry)
    const comm = communities[idx], bc = centralities[idx]
    const impactVal = impacts[hoveredCountry], isOrigin = hoveredCountry === shockCountry
    const connCount = edges.filter(e => e.sourceCode === hoveredCountry || e.targetCode === hoveredCountry).length
    return (
      <div className="absolute top-3 left-3 bg-black/90 rounded-lg shadow-2xl p-3 z-20 border border-white/10 min-w-48 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS[comm] ?? '#666' }} />
          <span className="font-bold text-white">{getCountryName(hoveredCountry)}</span>
          <span className="text-xs text-white/40">{hoveredCountry}</span>
        </div>
        <div className="text-xs text-white/40 mb-2">{lang === 'ko' ? COMMUNITY_NAMES_KO[comm] : COMMUNITY_NAMES_EN[comm]}</div>
        {isOrigin && <div className="mb-1.5 text-red-400 font-semibold text-xs flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{ui.shockOrigin}</div>}
        <div className="mb-1.5">
          <div className="flex justify-between text-xs mb-0.5"><span className="text-white/40">{ui.centrality}</span><span className="text-white font-mono text-[10px]">{(bc * 100).toFixed(0)}%</span></div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${bc * 100}%`, backgroundColor: COMMUNITY_COLORS[comm] ?? '#666' }} /></div>
        </div>
        <div className="text-xs text-white/40">{ui.connections}: <span className="text-white font-mono">{connCount}</span></div>
        {impactVal !== undefined && !isOrigin && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <span className={`font-mono text-base ${impactVal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{impactVal >= 0 ? '+' : ''}{impactVal.toFixed(2)}%</span>
            <span className="text-[10px] text-white/30 ml-1">{impactVariable.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>
    )
  })() : null

  // ---------------------------------------------------------------------------
  // Expanded legend overlay
  // ---------------------------------------------------------------------------
  const legendEl = legendExpanded ? (
    <div className="absolute top-2 right-2 z-30 rounded-xl border border-white/10 p-4 backdrop-blur-md shadow-2xl" style={{ background: 'rgba(10,10,18,0.95)', minWidth: '200px' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white/70 tracking-wide uppercase">{lang === 'ko' ? '범례' : 'Legend'}</span>
        <button onClick={() => setLegendExpanded(false)} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 text-xs flex items-center justify-center">✕</button>
      </div>
      <div className="space-y-1.5 mb-3">
        {uniqueCommunities.map(comm => (
          <div key={`exp-c-${comm}`} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[comm] }} />
            <span className="text-[13px]" style={{ color: COMMUNITY_COLORS[comm] }}>{lang === 'ko' ? COMMUNITY_NAMES_KO[comm] : COMMUNITY_NAMES_EN[comm]}</span>
          </div>
        ))}
      </div>
      {simulationResult && (
        <><div className="border-t border-white/8 my-2" />
        <div className="space-y-1.5 mb-3">
          {[{ color: '#ef4444', label: ui.shockOrigin }, { color: '#f87171', label: ui.strongNeg }, { color: '#fb923c', label: ui.negative }, { color: '#4ade80', label: ui.positive }].map((item, i) => (
            <div key={`exp-i-${i}`} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[13px]" style={{ color: item.color }}>{item.label}</span>
            </div>
          ))}
        </div></>
      )}
      <div className="border-t border-white/8 my-2" />
      <div className="space-y-1 text-[11px] text-slate-500"><div>{ui.textSize}</div><div>{ui.edgeColor}</div></div>
    </div>
  ) : null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Inline view */}
      <div className="relative">
        {/* Fullscreen button */}
        <button onClick={() => { setFullscreen(true); setLegendExpanded(false) }}
          className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs flex items-center justify-center"
          title={ui.expand}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" /></svg>
        </button>
        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
          <button onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }))} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm flex items-center justify-center">+</button>
          <button onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }))} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm flex items-center justify-center">−</button>
          <button onClick={resetView} className="px-2.5 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs">{ui.reset}</button>
        </div>
        {tooltipEl}
        <svg ref={svgRef} viewBox="0 0 1000 600" className="w-full h-auto rounded-xl cursor-grab active:cursor-grabbing"
          style={{ minHeight: '420px', willChange: 'transform', background: '#0a0a12' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
          {svgInner}
        </svg>
        {legendEl}
        <div className="mt-1.5 text-right text-[10px] text-slate-600 pr-1">{ui.dragTip}</div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a12' }}>
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'rgba(10,10,18,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-sm text-white/50 font-medium">{lang === 'ko' ? '경제 충격 전파 네트워크' : 'Economic Spillover Network'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }))} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm flex items-center justify-center">+</button>
              <button onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }))} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm flex items-center justify-center">−</button>
              <button onClick={resetView} className="px-2.5 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs">{ui.reset}</button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button onClick={() => setFullscreen(false)} className="px-3 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" /></svg>
                {ui.collapse}
              </button>
            </div>
          </div>
          <div className="relative flex-1 min-h-0">
            {tooltipEl}
            <svg viewBox="0 0 1000 600" className="w-full h-full cursor-grab active:cursor-grabbing" style={{ willChange: 'transform', background: '#0a0a12' }}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
              {svgInner}
            </svg>
            {legendEl}
            <div className="absolute bottom-3 left-3 text-[10px] text-slate-600">ESC {lang === 'ko' ? '또는 닫기 버튼으로 복귀' : 'or close button to exit'}</div>
          </div>
        </div>
      )}
    </>
  )
}
