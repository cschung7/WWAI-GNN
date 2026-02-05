'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS, COUNTRY_NAMES, REGION_NAMES } from '../translations'
import NetworkGraph from './NetworkGraph'

// API base URL - Production Railway URL (Updated 2026-02-05)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-5908c.up.railway.app'

// Impact variable options for toggle pills
const IMPACT_VARIABLES = [
  { id: 'gdp_growth_rate', label: 'GDP', labelKo: 'GDP' },
  { id: 'inflation_rate', label: 'Inflation', labelKo: '인플레이션' },
  { id: 'unemployment_rate', label: 'Unemployment', labelKo: '실업률' },
  { id: 'interest_rate', label: 'Interest Rate', labelKo: '금리' },
]

// Feature options with units and magnitude info
const FEATURES = [
  {
    id: 'gdp_growth_rate',
    label: 'GDP Growth',
    labelKo: 'GDP 성장률',
    unit: '%p',
    unitKo: '%p',
    magnitudeLabel: 'GDP Shock',
    magnitudeLabelKo: 'GDP 충격규모',
    min: -5,
    max: 5,
    step: 0.5,
    defaultValue: -2,
  },
  {
    id: 'inflation_rate',
    label: 'Inflation',
    labelKo: '물가상승률',
    unit: '%p',
    unitKo: '%p',
    magnitudeLabel: 'Inflation Shock',
    magnitudeLabelKo: '물가 충격규모',
    min: -5,
    max: 10,
    step: 0.5,
    defaultValue: 2,
  },
  {
    id: 'unemployment_rate',
    label: 'Unemployment',
    labelKo: '실업률',
    unit: '%p',
    unitKo: '%p',
    magnitudeLabel: 'Unemployment Shock',
    magnitudeLabelKo: '실업률 충격규모',
    min: -3,
    max: 5,
    step: 0.5,
    defaultValue: 1,
  },
  {
    id: 'interest_rate',
    label: 'Interest Rate',
    labelKo: '금리',
    unit: 'bp',
    unitKo: 'bp',
    magnitudeLabel: 'Interest Rate Shock',
    magnitudeLabelKo: '금리 충격규모',
    min: -200,
    max: 200,
    step: 25,
    defaultValue: 50,
  },
  {
    id: 'trade_balance',
    label: 'Trade Balance',
    labelKo: '무역수지',
    unit: '%p',
    unitKo: '%p',
    magnitudeLabel: 'Trade Shock',
    magnitudeLabelKo: '무역 충격규모',
    min: -10,
    max: 10,
    step: 1,
    defaultValue: -5,
  },
]

// Countries for dropdown
const COUNTRIES = [
  { code: 'USA', name: 'United States', nameKo: '미국', region: 'americas' },
  { code: 'CHN', name: 'China', nameKo: '중국', region: 'asia' },
  { code: 'JPN', name: 'Japan', nameKo: '일본', region: 'asia' },
  { code: 'DEU', name: 'Germany', nameKo: '독일', region: 'europe' },
  { code: 'GBR', name: 'United Kingdom', nameKo: '영국', region: 'europe' },
  { code: 'FRA', name: 'France', nameKo: '프랑스', region: 'europe' },
  { code: 'IND', name: 'India', nameKo: '인도', region: 'asia' },
  { code: 'ITA', name: 'Italy', nameKo: '이탈리아', region: 'europe' },
  { code: 'BRA', name: 'Brazil', nameKo: '브라질', region: 'americas' },
  { code: 'CAN', name: 'Canada', nameKo: '캐나다', region: 'americas' },
  { code: 'KOR', name: 'South Korea', nameKo: '한국', region: 'asia' },
  { code: 'RUS', name: 'Russia', nameKo: '러시아', region: 'europe' },
  { code: 'AUS', name: 'Australia', nameKo: '호주', region: 'oceania' },
  { code: 'ESP', name: 'Spain', nameKo: '스페인', region: 'europe' },
  { code: 'MEX', name: 'Mexico', nameKo: '멕시코', region: 'americas' },
  { code: 'IDN', name: 'Indonesia', nameKo: '인도네시아', region: 'asia' },
  { code: 'NLD', name: 'Netherlands', nameKo: '네덜란드', region: 'europe' },
  { code: 'SAU', name: 'Saudi Arabia', nameKo: '사우디아라비아', region: 'middle_east' },
  { code: 'TUR', name: 'Turkey', nameKo: '터키', region: 'middle_east' },
  { code: 'CHE', name: 'Switzerland', nameKo: '스위스', region: 'europe' },
  { code: 'POL', name: 'Poland', nameKo: '폴란드', region: 'europe' },
  { code: 'SWE', name: 'Sweden', nameKo: '스웨덴', region: 'europe' },
  { code: 'BEL', name: 'Belgium', nameKo: '벨기에', region: 'europe' },
  { code: 'ARG', name: 'Argentina', nameKo: '아르헨티나', region: 'americas' },
  { code: 'THA', name: 'Thailand', nameKo: '태국', region: 'asia' },
  { code: 'ZAF', name: 'South Africa', nameKo: '남아프리카', region: 'africa' },
]

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

export default function SpilloversContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].spillovers

  // Local UI strings for this component
  const ui = {
    shockCountry: lang === 'ko' ? '충격 발생국' : 'Shock Origin',
    shockVariable: lang === 'ko' ? '충격 변수' : 'Shock Variable',
    simulate: lang === 'ko' ? '시뮬레이션' : 'Simulate',
    impact: lang === 'ko' ? '영향' : 'Impact',
    networkTitle: lang === 'ko' ? '네트워크 구조' : 'Network Structure',
    impactTableTitle: lang === 'ko' ? '국가별 영향' : 'Country Impacts',
    country: lang === 'ko' ? '국가' : 'Country',
    loading: lang === 'ko' ? '로딩 중...' : 'Loading...',
    noData: lang === 'ko' ? '데이터 없음' : 'No data',
    model: lang === 'ko' ? '모델' : 'Model',
    steps: lang === 'ko' ? '전파 단계' : 'Propagation Steps',
  }

  // State
  const [shockCountry, setShockCountry] = useState(searchParams.get('country') || 'USA')
  const [shockVariable, setShockVariable] = useState(searchParams.get('variable') || 'interest_rate')
  const [shockMagnitude, setShockMagnitude] = useState(
    Number(searchParams.get('magnitude')) || FEATURES.find(f => f.id === 'interest_rate')?.defaultValue || 50
  )
  const [impactVariable, setImpactVariable] = useState('gdp_growth_rate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Get current feature config
  const currentFeature = FEATURES.find(f => f.id === shockVariable) || FEATURES[3]

  // Update URL when params change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('country', shockCountry)
    params.set('variable', shockVariable)
    params.set('magnitude', String(shockMagnitude))
    params.set('lang', lang)
    router.replace(`/spillovers?${params.toString()}`, { scroll: false })
  }, [shockCountry, shockVariable, shockMagnitude, lang, router])

  // Run simulation
  const runSimulation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/gnn/simulate-shock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: shockCountry,
          variable: shockVariable,
          magnitude: shockMagnitude,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Transform API response to match frontend expected format
      if (data.success && data.simulation) {
        const sim = data.simulation
        const finalImpacts = sim.final_impacts || {}

        // Convert final_impacts object to array format
        const impacts: ImpactData[] = Object.entries(finalImpacts).map(([country, values]: [string, any]) => ({
          country,
          gdp_growth_rate: (values.gdp_growth_rate || 0) * 100,
          inflation_rate: (values.inflation_rate || 0) * 100,
          unemployment_rate: (values.unemployment_rate || 0) * 100,
          interest_rate: (values.interest_rate || 0) * 100,
          trade_balance: (values.trade_balance || 0) * 100,
        }))

        const transformed: SimulationResult = {
          impacts,
          metadata: {
            shock_country: sim.origin_country,
            shock_variable: sim.shock_variable,
            shock_magnitude: sim.shock_magnitude,
            message_passing_steps: sim.num_steps,
            model_r2: 0.9949,
          }
        }
        setSimulationResult(transformed)
      } else {
        throw new Error('Invalid API response')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run simulation')
    } finally {
      setLoading(false)
    }
  }, [shockCountry, shockVariable, shockMagnitude])

  // Run simulation on mount and when params change
  useEffect(() => {
    runSimulation()
  }, [runSimulation])

  // Generate report
  const generateReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gnn/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: shockCountry,
          variable: shockVariable,
          magnitude: shockMagnitude,
          lang: lang,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setReportData(data.report)
        setShowReportModal(true)
      }
    } catch (err) {
      console.error('Report generation failed:', err)
    } finally {
      setReportLoading(false)
    }
  }, [shockCountry, shockVariable, shockMagnitude, lang])

  // Print report as PDF
  const printReport = () => {
    if (!reportData) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportData.interpretation?.title || 'Economic Report'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; }
    h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    .negative { color: #dc2626; }
    .positive { color: #16a34a; }
    .disclaimer { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 30px; font-size: 14px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${reportData.interpretation?.title || 'Economic Shock Analysis Report'}</h1>
  <p><strong>${lang === 'ko' ? '시나리오' : 'Scenario'}:</strong> ${reportData.interpretation?.scenario}</p>
  <h2>${lang === 'ko' ? '요약' : 'Summary'}</h2>
  <p>${reportData.interpretation?.summary}</p>
  <h2>${lang === 'ko' ? '주요 발견' : 'Key Findings'}</h2>
  <ul>${reportData.interpretation?.key_findings?.map((f: string) => `<li>${f}</li>`).join('') || ''}</ul>
  <h2>${lang === 'ko' ? '국가별 영향' : 'Country Impacts'}</h2>
  <table>
    <thead><tr><th>#</th><th>${lang === 'ko' ? '국가' : 'Country'}</th><th>GDP</th><th>${lang === 'ko' ? '인플레이션' : 'Inflation'}</th><th>${lang === 'ko' ? '실업률' : 'Unemployment'}</th><th>${lang === 'ko' ? '금리' : 'Interest Rate'}</th></tr></thead>
    <tbody>${reportData.impact_table?.map((row: any) => `
      <tr>
        <td>${row.rank}</td>
        <td>${row.name}</td>
        <td class="${row.gdp < 0 ? 'negative' : 'positive'}">${row.gdp > 0 ? '+' : ''}${row.gdp.toFixed(2)}%</td>
        <td class="${row.inflation < 0 ? 'negative' : 'positive'}">${row.inflation > 0 ? '+' : ''}${row.inflation.toFixed(2)}%</td>
        <td class="${row.unemployment > 0 ? 'negative' : 'positive'}">${row.unemployment > 0 ? '+' : ''}${row.unemployment.toFixed(2)}%</td>
        <td class="${row.interest_rate > 0 ? 'negative' : 'positive'}">${row.interest_rate > 0 ? '+' : ''}${row.interest_rate.toFixed(2)}%</td>
      </tr>
    `).join('') || ''}</tbody>
  </table>
  <div class="disclaimer">${reportData.interpretation?.disclaimer}</div>
  <p style="text-align:center;color:#64748b;margin-top:40px;">Generated: ${reportData.metadata?.generated_at} | Model: ${reportData.metadata?.model}</p>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  // Get country name based on language
  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code)
    return lang === 'ko' ? country?.nameKo : country?.name
  }

  // Get impact color
  const getImpactColor = (value: number, variable: string) => {
    const absValue = Math.abs(value)
    if (variable === 'unemployment_rate') {
      // Higher unemployment is bad (red)
      if (value > 0.5) return 'text-red-400'
      if (value > 0.1) return 'text-orange-400'
      if (value < -0.1) return 'text-green-400'
      return 'text-slate-400'
    }
    // For GDP, lower is bad (red)
    if (value < -1) return 'text-red-400'
    if (value < -0.3) return 'text-orange-400'
    if (value > 0.3) return 'text-green-400'
    return 'text-slate-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t.pageTitle}</h1>
          <p className="text-slate-400">{t.pageDescription}</p>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Shock Country */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">{ui.shockCountry}</label>
              <select
                value={shockCountry}
                onChange={(e) => setShockCountry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {lang === 'ko' ? c.nameKo : c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shock Variable */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">{ui.shockVariable}</label>
              <select
                value={shockVariable}
                onChange={(e) => {
                  const newVar = e.target.value
                  setShockVariable(newVar)
                  const feature = FEATURES.find(f => f.id === newVar)
                  if (feature) setShockMagnitude(feature.defaultValue)
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                {FEATURES.map(f => (
                  <option key={f.id} value={f.id}>
                    {lang === 'ko' ? f.labelKo : f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Shock Magnitude */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {lang === 'ko' ? currentFeature.magnitudeLabelKo : currentFeature.magnitudeLabel} ({lang === 'ko' ? currentFeature.unitKo : currentFeature.unit})
              </label>
              <input
                type="number"
                value={shockMagnitude}
                onChange={(e) => setShockMagnitude(Number(e.target.value))}
                min={currentFeature.min}
                max={currentFeature.max}
                step={currentFeature.step}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={runSimulation}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '...' : ui.simulate}
              </button>
              <button
                onClick={generateReport}
                disabled={reportLoading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                title={lang === 'ko' ? '보고서 생성' : 'Generate Report'}
              >
                {reportLoading ? '...' : '📄'}
              </button>
            </div>
          </div>

          {/* Scenario Description */}
          <div className="mt-4 text-sm text-slate-400">
            {lang === 'ko'
              ? `시나리오: ${getCountryName(shockCountry)}의 ${currentFeature.labelKo}이(가) ${shockMagnitude >= 0 ? '+' : ''}${shockMagnitude}${currentFeature.unitKo} 변동`
              : `Scenario: ${getCountryName(shockCountry)} ${currentFeature.label} shock of ${shockMagnitude >= 0 ? '+' : ''}${shockMagnitude}${currentFeature.unit}`}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Impact Variable Toggle */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {IMPACT_VARIABLES.map(v => (
              <button
                key={v.id}
                onClick={() => setImpactVariable(v.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${impactVariable === v.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {lang === 'ko' ? v.labelKo : v.label} {ui.impact}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Network Graph */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">{ui.networkTitle}</h2>
            <NetworkGraph
              simulationResult={simulationResult}
              impactVariable={impactVariable}
              shockCountry={shockCountry}
              lang={lang}
            />
          </div>

          {/* Impact Table */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">{ui.impactTableTitle}</h2>
            {simulationResult ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">#</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">{ui.country}</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">GDP</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">{lang === 'ko' ? '물가' : 'CPI'}</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">{lang === 'ko' ? '실업' : 'Unemp'}</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">{lang === 'ko' ? '금리' : 'Rate'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResult.impacts
                      .filter(i => i.country !== shockCountry)
                      .sort((a, b) => Math.abs(b.gdp_growth_rate) - Math.abs(a.gdp_growth_rate))
                      .slice(0, 15)
                      .map((impact, idx) => (
                        <tr key={impact.country} className="border-b border-slate-800 hover:bg-slate-700/30">
                          <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 text-white">{getCountryName(impact.country)}</td>
                          <td className={`py-2 px-3 text-right font-mono ${getImpactColor(impact.gdp_growth_rate, 'gdp')}`}>
                            {impact.gdp_growth_rate > 0 ? '+' : ''}{impact.gdp_growth_rate.toFixed(2)}%
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${getImpactColor(impact.inflation_rate, 'inflation')}`}>
                            {impact.inflation_rate > 0 ? '+' : ''}{impact.inflation_rate.toFixed(2)}%
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${getImpactColor(impact.unemployment_rate, 'unemployment_rate')}`}>
                            {impact.unemployment_rate > 0 ? '+' : ''}{impact.unemployment_rate.toFixed(2)}%
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${getImpactColor(impact.interest_rate, 'interest_rate')}`}>
                            {impact.interest_rate > 0 ? '+' : ''}{impact.interest_rate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                {loading ? ui.loading : ui.noData}
              </div>
            )}
          </div>
        </div>

        {/* Model Info */}
        {simulationResult && (
          <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-400">{ui.model}:</span>
                <span className="text-white ml-2">GraphEconCast v1.0</span>
              </div>
              <div>
                <span className="text-slate-400">R²:</span>
                <span className="text-cyan-400 ml-2">{(simulationResult.metadata.model_r2 * 100).toFixed(2)}%</span>
              </div>
              <div>
                <span className="text-slate-400">{ui.steps}:</span>
                <span className="text-white ml-2">{simulationResult.metadata.message_passing_steps}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{reportData.interpretation?.title}</h2>
              <div className="flex gap-2">
                <button
                  onClick={printReport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  {lang === 'ko' ? 'PDF 출력' : 'Print PDF'}
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                >
                  {lang === 'ko' ? '닫기' : 'Close'}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-slate-300 mb-4">{reportData.interpretation?.scenario}</p>
              <h3 className="text-lg font-semibold text-white mb-2">{lang === 'ko' ? '요약' : 'Summary'}</h3>
              <p className="text-slate-300 mb-4">{reportData.interpretation?.summary}</p>
              <h3 className="text-lg font-semibold text-white mb-2">{lang === 'ko' ? '주요 발견' : 'Key Findings'}</h3>
              <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1">
                {reportData.interpretation?.key_findings?.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <h3 className="text-lg font-semibold text-white mb-2">{lang === 'ko' ? '국가별 영향 (상위 15개국)' : 'Country Impacts (Top 15)'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-2 text-slate-400">#</th>
                      <th className="text-left py-2 px-2 text-slate-400">{lang === 'ko' ? '국가' : 'Country'}</th>
                      <th className="text-right py-2 px-2 text-slate-400">GDP</th>
                      <th className="text-right py-2 px-2 text-slate-400">{lang === 'ko' ? '물가' : 'CPI'}</th>
                      <th className="text-right py-2 px-2 text-slate-400">{lang === 'ko' ? '실업' : 'Unemp'}</th>
                      <th className="text-right py-2 px-2 text-slate-400">{lang === 'ko' ? '금리' : 'Rate'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.impact_table?.map((row: any) => (
                      <tr key={row.rank} className="border-b border-slate-800">
                        <td className="py-2 px-2 text-slate-500">{row.rank}</td>
                        <td className="py-2 px-2 text-white">{row.name}</td>
                        <td className={`py-2 px-2 text-right font-mono ${row.gdp < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {row.gdp > 0 ? '+' : ''}{row.gdp.toFixed(2)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${row.inflation < 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                          {row.inflation > 0 ? '+' : ''}{row.inflation.toFixed(2)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${row.unemployment > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {row.unemployment > 0 ? '+' : ''}{row.unemployment.toFixed(2)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${row.interest_rate > 0 ? 'text-orange-400' : 'text-cyan-400'}`}>
                          {row.interest_rate > 0 ? '+' : ''}{row.interest_rate.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-sm">
                {reportData.interpretation?.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
