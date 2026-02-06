'use client'

import { useState } from 'react'
import { useLanguage } from './LayoutClient'
import { TRANSLATIONS, COUNTRY_NAMES } from './translations'

// Model metrics
const MODEL_METRICS = {
  r2: 99.49,
  valLoss: 0.0117,
  parameters: '4.03M',
  countries: 26,
  indicators: 5,
  dataSource: 'FRED API',
  trainingPeriod: '2000-2025',
}

// Country data with predictions
const COUNTRY_DATA = [
  { code: 'USA', gdp: 2.4, inflation: 3.2, unemployment: 3.8, rate: 5.25, signal: 'stable' },
  { code: 'CHN', gdp: 4.8, inflation: 1.8, unemployment: 5.2, rate: 3.45, signal: 'slowing' },
  { code: 'DEU', gdp: 0.8, inflation: 2.9, unemployment: 5.9, rate: 4.50, signal: 'weak' },
  { code: 'JPN', gdp: 1.2, inflation: 2.4, unemployment: 2.5, rate: 0.10, signal: 'improving' },
  { code: 'GBR', gdp: 1.1, inflation: 4.0, unemployment: 4.2, rate: 5.25, signal: 'stable' },
  { code: 'FRA', gdp: 1.4, inflation: 2.8, unemployment: 7.3, rate: 4.50, signal: 'stable' },
  { code: 'IND', gdp: 6.8, inflation: 5.1, unemployment: 7.8, rate: 6.50, signal: 'strong' },
  { code: 'BRA', gdp: 2.1, inflation: 4.5, unemployment: 7.9, rate: 11.75, signal: 'stable' },
  { code: 'CAN', gdp: 1.5, inflation: 3.1, unemployment: 5.8, rate: 5.00, signal: 'stable' },
  { code: 'KOR', gdp: 2.2, inflation: 2.7, unemployment: 2.8, rate: 3.50, signal: 'stable' },
]

const getSignalColor = (signal: string) => {
  switch (signal) {
    case 'strong': return 'badge-success'
    case 'improving': return 'badge-info'
    case 'stable': return 'badge-primary'
    case 'slowing': return 'badge-warning'
    case 'weak': return 'badge-error'
    default: return 'badge-ghost'
  }
}

const getValueColor = (value: number, type: string) => {
  if (type === 'gdp') return value > 2 ? 'text-success' : value < 1 ? 'text-error' : 'text-warning'
  if (type === 'inflation') return value < 2.5 ? 'text-success' : value > 4 ? 'text-error' : 'text-warning'
  if (type === 'unemployment') return value < 4 ? 'text-success' : value > 7 ? 'text-error' : 'text-warning'
  return ''
}

export default function Dashboard() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].dashboard
  const common = TRANSLATIONS[lang].common
  const countryNames = COUNTRY_NAMES[lang]
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const getSignalText = (signal: string) => {
    const signalMap: Record<string, string> = {
      stable: common.stable,
      strong: common.strong,
      weak: common.weak,
      slowing: common.slowing,
      improving: common.improving,
      volatile: common.volatile,
      crisis: common.crisis,
    }
    return signalMap[signal] || signal
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hero bg-base-100 rounded-xl p-8">
        <div className="hero-content text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              {t.title}
            </h1>
            <p className="text-lg opacity-80 max-w-2xl">
              {t.description}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.modelR2}</div>
          <div className="text-3xl font-bold text-success">{MODEL_METRICS.r2}%</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.valLoss}</div>
          <div className="text-3xl font-bold">{MODEL_METRICS.valLoss}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.parameters}</div>
          <div className="text-3xl font-bold">{MODEL_METRICS.parameters}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.countries}</div>
          <div className="text-3xl font-bold text-primary">{MODEL_METRICS.countries}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.indicators}</div>
          <div className="text-3xl font-bold">{MODEL_METRICS.indicators}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.dataPeriod}</div>
          <div className="text-xl font-bold">{MODEL_METRICS.trainingPeriod}</div>
        </div>
      </div>

      {/* What the Model Predicts */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">{t.economicIndicators}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-lg font-semibold">{t.gdpGrowth}</div>
              <div className="text-sm opacity-70 mt-1">{t.gdpDesc}</div>
              <div className="badge badge-outline mt-2">%</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-lg font-semibold">{t.inflation}</div>
              <div className="text-sm opacity-70 mt-1">{t.inflationDesc}</div>
              <div className="badge badge-outline mt-2">%</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-lg font-semibold">{t.unemployment}</div>
              <div className="text-sm opacity-70 mt-1">{t.unemploymentDesc}</div>
              <div className="badge badge-outline mt-2">%</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-lg font-semibold">{t.interestRate}</div>
              <div className="text-sm opacity-70 mt-1">{t.interestRateDesc}</div>
              <div className="badge badge-outline mt-2">%</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-lg font-semibold">{t.tradeBalance}</div>
              <div className="text-sm opacity-70 mt-1">{t.tradeBalanceDesc}</div>
              <div className="badge badge-outline mt-2">%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Country Scorecard */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            {t.countryScorecard}
            <span className="text-sm font-normal opacity-70 ml-2">{t.predictions}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>{t.country}</th>
                  <th>{t.gdpGrowth}</th>
                  <th>{t.inflation}</th>
                  <th>{t.unemployment}</th>
                  <th>{t.interestRate}</th>
                  <th>{t.signal}</th>
                </tr>
              </thead>
              <tbody>
                {COUNTRY_DATA.map((country) => (
                  <tr
                    key={country.code}
                    className="hover cursor-pointer"
                    onClick={() => setSelectedCountry(country.code)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary">{country.code}</span>
                        <span className="opacity-70">{countryNames[country.code as keyof typeof countryNames]}</span>
                      </div>
                    </td>
                    <td className={getValueColor(country.gdp, 'gdp')}>
                      {country.gdp > 0 ? '+' : ''}{country.gdp}%
                    </td>
                    <td className={getValueColor(country.inflation, 'inflation')}>
                      {country.inflation}%
                    </td>
                    <td className={getValueColor(country.unemployment, 'unemployment')}>
                      {country.unemployment}%
                    </td>
                    <td>{country.rate}%</td>
                    <td>
                      <span className={`badge ${getSignalColor(country.signal)} capitalize`}>
                        {getSignalText(country.signal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* How It Works - Visual */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">{t.howItWorks}</h2>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 py-8">
            {/* Input */}
            <div className="text-center">
              <div className="w-32 h-32 bg-base-200 rounded-xl flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm font-semibold">{t.input}</div>
              </div>
              <div className="text-xs mt-2 opacity-70">{t.inputDesc1}<br/>{t.inputDesc2}</div>
            </div>

            <div className="text-2xl">→</div>

            {/* Encoder */}
            <div className="text-center">
              <div className="w-32 h-32 bg-primary/20 border-2 border-primary rounded-xl flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">🔷</div>
                <div className="text-sm font-semibold">{t.encoder}</div>
              </div>
              <div className="text-xs mt-2 opacity-70">{t.encoderDesc1}<br/>{t.encoderDesc2}</div>
            </div>

            <div className="text-2xl">→</div>

            {/* Processor */}
            <div className="text-center">
              <div className="w-32 h-32 bg-success/20 border-2 border-success rounded-xl flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">🔄</div>
                <div className="text-sm font-semibold">{t.processor}</div>
              </div>
              <div className="text-xs mt-2 opacity-70">{t.processorDesc1}<br/>{t.processorDesc2}</div>
            </div>

            <div className="text-2xl">→</div>

            {/* Decoder */}
            <div className="text-center">
              <div className="w-32 h-32 bg-warning/20 border-2 border-warning rounded-xl flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">🔶</div>
                <div className="text-sm font-semibold">{t.decoder}</div>
              </div>
              <div className="text-xs mt-2 opacity-70">{t.decoderDesc1}<br/>{t.decoderDesc2}</div>
            </div>

            <div className="text-2xl">→</div>

            {/* Output */}
            <div className="text-center">
              <div className="w-32 h-32 bg-base-200 rounded-xl flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-sm font-semibold">{t.output}</div>
              </div>
              <div className="text-xs mt-2 opacity-70">{t.outputDesc1}<br/>{t.outputDesc2}</div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <div className="font-bold">{t.keyInsight}</div>
              <div className="text-sm">{t.keyInsightDesc}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-success/20 to-base-100">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-success">{t.strongestGrowth}</h3>
            <div className="text-3xl font-bold">{countryNames.IND}</div>
            <div className="text-sm opacity-70">GDP +6.8% {t.predicted}</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-warning/20 to-base-100">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-warning">{t.watchList}</h3>
            <div className="text-3xl font-bold">{countryNames.DEU}</div>
            <div className="text-sm opacity-70">GDP +0.8% - {t.belowTrend}</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-info/20 to-base-100">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-info">{t.rateDivergence}</h3>
            <div className="text-3xl font-bold">{countryNames.USA} vs {countryNames.JPN}</div>
            <div className="text-sm opacity-70">5.25% vs 0.10% {t.spread}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
