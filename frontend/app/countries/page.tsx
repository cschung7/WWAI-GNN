'use client'

import { useState } from 'react'
import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS, COUNTRY_NAMES } from '../translations'

const COUNTRIES = [
  { code: 'USA', region: 'Americas', group: 'G7', gdp: 26.95, dev: 'Developed' },
  { code: 'CHN', region: 'Asia', group: 'BRICS', gdp: 17.70, dev: 'Emerging' },
  { code: 'JPN', region: 'Asia', group: 'G7', gdp: 4.23, dev: 'Developed' },
  { code: 'DEU', region: 'Europe', group: 'G7', gdp: 4.43, dev: 'Developed' },
  { code: 'IND', region: 'Asia', group: 'BRICS', gdp: 3.73, dev: 'Emerging' },
  { code: 'GBR', region: 'Europe', group: 'G7', gdp: 3.33, dev: 'Developed' },
  { code: 'FRA', region: 'Europe', group: 'G7', gdp: 3.05, dev: 'Developed' },
  { code: 'ITA', region: 'Europe', group: 'G7', gdp: 2.19, dev: 'Developed' },
  { code: 'BRA', region: 'Americas', group: 'BRICS', gdp: 2.13, dev: 'Emerging' },
  { code: 'CAN', region: 'Americas', group: 'G7', gdp: 2.12, dev: 'Developed' },
  { code: 'KOR', region: 'Asia', group: 'OECD', gdp: 1.71, dev: 'Developed' },
  { code: 'ESP', region: 'Europe', group: 'EU', gdp: 1.58, dev: 'Developed' },
  { code: 'AUS', region: 'Oceania', group: 'OECD', gdp: 1.69, dev: 'Developed' },
  { code: 'RUS', region: 'Europe', group: 'BRICS', gdp: 1.86, dev: 'Emerging' },
  { code: 'MEX', region: 'Americas', group: 'USMCA', gdp: 1.81, dev: 'Emerging' },
  { code: 'IDN', region: 'Asia', group: 'G20', gdp: 1.42, dev: 'Emerging' },
  { code: 'NLD', region: 'Europe', group: 'EU', gdp: 1.09, dev: 'Developed' },
  { code: 'SAU', region: 'Middle East', group: 'G20', gdp: 1.07, dev: 'Emerging' },
  { code: 'TUR', region: 'Europe', group: 'G20', gdp: 1.15, dev: 'Emerging' },
  { code: 'CHE', region: 'Europe', group: 'OECD', gdp: 0.91, dev: 'Developed' },
  { code: 'POL', region: 'Europe', group: 'EU', gdp: 0.84, dev: 'Developed' },
  { code: 'SWE', region: 'Europe', group: 'EU', gdp: 0.59, dev: 'Developed' },
  { code: 'BEL', region: 'Europe', group: 'EU', gdp: 0.63, dev: 'Developed' },
  { code: 'ARG', region: 'Americas', group: 'G20', gdp: 0.64, dev: 'Emerging' },
  { code: 'NOR', region: 'Europe', group: 'OECD', gdp: 0.49, dev: 'Developed' },
  { code: 'AUT', region: 'Europe', group: 'EU', gdp: 0.52, dev: 'Developed' },
]

const PREDICTIONS: Record<string, { gdp: number; inflation: number; unemployment: number; rate: number; trend: string }> = {
  'USA': { gdp: 2.4, inflation: 3.2, unemployment: 3.8, rate: 5.25, trend: 'stable' },
  'CHN': { gdp: 4.8, inflation: 1.8, unemployment: 5.2, rate: 3.45, trend: 'slowing' },
  'JPN': { gdp: 1.2, inflation: 2.4, unemployment: 2.5, rate: 0.10, trend: 'improving' },
  'DEU': { gdp: 0.8, inflation: 2.9, unemployment: 5.9, rate: 4.50, trend: 'weak' },
  'IND': { gdp: 6.8, inflation: 5.1, unemployment: 7.8, rate: 6.50, trend: 'strong' },
  'GBR': { gdp: 1.1, inflation: 4.0, unemployment: 4.2, rate: 5.25, trend: 'stable' },
  'FRA': { gdp: 1.4, inflation: 2.8, unemployment: 7.3, rate: 4.50, trend: 'stable' },
  'ITA': { gdp: 0.9, inflation: 2.5, unemployment: 7.8, rate: 4.50, trend: 'stable' },
  'BRA': { gdp: 2.1, inflation: 4.5, unemployment: 7.9, rate: 11.75, trend: 'stable' },
  'CAN': { gdp: 1.5, inflation: 3.1, unemployment: 5.8, rate: 5.00, trend: 'stable' },
  'KOR': { gdp: 2.2, inflation: 2.7, unemployment: 2.8, rate: 3.50, trend: 'stable' },
  'ESP': { gdp: 2.0, inflation: 3.2, unemployment: 11.8, rate: 4.50, trend: 'improving' },
  'AUS': { gdp: 1.8, inflation: 3.5, unemployment: 4.1, rate: 4.35, trend: 'stable' },
  'RUS': { gdp: 1.5, inflation: 7.2, unemployment: 2.9, rate: 16.00, trend: 'volatile' },
  'MEX': { gdp: 2.5, inflation: 4.8, unemployment: 2.8, rate: 11.00, trend: 'stable' },
  'IDN': { gdp: 5.1, inflation: 3.2, unemployment: 5.3, rate: 6.00, trend: 'strong' },
  'NLD': { gdp: 0.9, inflation: 2.4, unemployment: 3.6, rate: 4.50, trend: 'stable' },
  'SAU': { gdp: 2.8, inflation: 2.1, unemployment: 4.8, rate: 6.00, trend: 'stable' },
  'TUR': { gdp: 3.2, inflation: 58.0, unemployment: 9.4, rate: 45.00, trend: 'volatile' },
  'CHE': { gdp: 1.3, inflation: 1.4, unemployment: 2.1, rate: 1.75, trend: 'stable' },
  'POL': { gdp: 2.8, inflation: 4.2, unemployment: 5.0, rate: 5.75, trend: 'stable' },
  'SWE': { gdp: 0.6, inflation: 2.9, unemployment: 8.2, rate: 4.00, trend: 'weak' },
  'BEL': { gdp: 1.2, inflation: 2.7, unemployment: 5.6, rate: 4.50, trend: 'stable' },
  'ARG': { gdp: -2.5, inflation: 140.0, unemployment: 6.2, rate: 100.00, trend: 'crisis' },
  'NOR': { gdp: 1.1, inflation: 3.8, unemployment: 3.5, rate: 4.50, trend: 'stable' },
  'AUT': { gdp: 0.7, inflation: 3.1, unemployment: 5.1, rate: 4.50, trend: 'weak' },
}

export default function CountriesPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].countries
  const common = TRANSLATIONS[lang].common
  const countryNames = COUNTRY_NAMES[lang]

  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const regions = ['all', ...new Set(COUNTRIES.map(c => c.region))]
  const filteredCountries = selectedRegion === 'all'
    ? COUNTRIES
    : COUNTRIES.filter(c => c.region === selectedRegion)

  const selected = selectedCountry ? COUNTRIES.find(c => c.code === selectedCountry) : null
  const prediction = selectedCountry ? PREDICTIONS[selectedCountry] : null

  const getRegionLabel = (region: string) => {
    if (region === 'all') return t.allRegions
    if (region === 'Americas') return t.americas
    if (region === 'Europe') return t.europe
    if (region === 'Asia') return t.asia
    return region
  }

  const getTrendText = (trend: string) => {
    const trendMap: Record<string, string> = {
      stable: common.stable,
      strong: common.strong,
      weak: common.weak,
      slowing: common.slowing,
      improving: common.improving,
      volatile: common.volatile,
      crisis: common.crisis,
    }
    return trendMap[trend] || trend
  }

  const getTrendInterpretation = (trend: string) => {
    const interpretations = lang === 'ko' ? {
      strong: '강한 경제적 모멘텀과 추세 상회 성장을 보이고 있습니다. 현지 자산에 대한 비중 확대를 고려해 볼 수 있습니다.',
      stable: '예상에 부합하는 경제 성과를 보이고 있습니다. 중립적 포지션을 권장합니다.',
      improving: '긍정적인 모멘텀이 형성되고 있습니다. 익스포저 확대 전 확인이 필요합니다.',
      slowing: '성장 모멘텀이 둔화되고 있습니다. 익스포저 축소 또는 헤지 포지션을 고려하세요.',
      weak: '추세 하회 성장이 주의를 요합니다. 위험 자산에 대한 비중 축소를 권장합니다.',
      volatile: '높은 불확실성 환경입니다. 신중한 포지션 규모 설정이 필요합니다.',
      crisis: '심각한 경제적 스트레스 상황입니다. 안정화될 때까지 익스포저를 피하거나 최소화하세요.',
    } : {
      strong: 'Strong economic momentum with above-trend growth. Consider overweight positions in local assets.',
      stable: 'Economy performing in line with expectations. Neutral positioning recommended.',
      improving: 'Positive momentum building. Watch for confirmation before increasing exposure.',
      slowing: 'Growth momentum decelerating. Consider reducing exposure or hedging positions.',
      weak: 'Below-trend growth signals caution. Underweight recommendation for risk assets.',
      volatile: 'High uncertainty environment. Elevated risk requires careful position sizing.',
      crisis: 'Severe economic stress. Avoid or minimize exposure until stabilization.',
    }
    return interpretations[trend as keyof typeof interpretations] || ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="opacity-70">{t.description}</p>
        </div>
        <div className="flex gap-2">
          {regions.map(r => (
            <button
              key={r}
              className={`btn btn-sm ${selectedRegion === r ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedRegion(r)}
            >
              {getRegionLabel(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country List */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100">
            <div className="card-body p-4">
              <h2 className="font-semibold mb-2">{t.selectCountry}</h2>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {filteredCountries.map(country => (
                  <button
                    key={country.code}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCountry === country.code
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-200'
                    }`}
                    onClick={() => setSelectedCountry(country.code)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{country.code}</span>
                        <span className="ml-2 opacity-80">{countryNames[country.code as keyof typeof countryNames]}</span>
                      </div>
                      <span className="badge badge-sm badge-ghost">{country.group}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Country Details */}
        <div className="lg:col-span-2">
          {selected && prediction ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="card bg-base-100">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold">{countryNames[selected.code as keyof typeof countryNames]}</h2>
                      <div className="flex gap-2 mt-2">
                        <span className="badge badge-primary">{selected.code}</span>
                        <span className="badge badge-outline">{getRegionLabel(selected.region)}</span>
                        <span className="badge badge-outline">{selected.group}</span>
                        <span className="badge badge-outline">{selected.dev}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-70">GDP (2023)</div>
                      <div className="text-2xl font-bold">${selected.gdp}T</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictions */}
              <div className="card bg-base-100">
                <div className="card-body">
                  <h3 className="text-xl font-semibold mb-4">{t.economicPredictions}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="stat-card text-center">
                      <div className="text-sm opacity-70">{TRANSLATIONS[lang].dashboard.gdpGrowth}</div>
                      <div className={`text-3xl font-bold ${prediction.gdp > 2 ? 'text-success' : prediction.gdp < 1 ? 'text-error' : 'text-warning'}`}>
                        {prediction.gdp > 0 ? '+' : ''}{prediction.gdp}%
                      </div>
                    </div>
                    <div className="stat-card text-center">
                      <div className="text-sm opacity-70">{TRANSLATIONS[lang].dashboard.inflation}</div>
                      <div className={`text-3xl font-bold ${prediction.inflation < 3 ? 'text-success' : prediction.inflation > 5 ? 'text-error' : 'text-warning'}`}>
                        {prediction.inflation}%
                      </div>
                    </div>
                    <div className="stat-card text-center">
                      <div className="text-sm opacity-70">{TRANSLATIONS[lang].dashboard.unemployment}</div>
                      <div className={`text-3xl font-bold ${prediction.unemployment < 5 ? 'text-success' : prediction.unemployment > 8 ? 'text-error' : 'text-warning'}`}>
                        {prediction.unemployment}%
                      </div>
                    </div>
                    <div className="stat-card text-center">
                      <div className="text-sm opacity-70">{TRANSLATIONS[lang].dashboard.interestRate}</div>
                      <div className="text-3xl font-bold">
                        {prediction.rate}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-sm opacity-70">{lang === 'ko' ? '모델 신호: ' : 'Model Signal: '}</span>
                    <span className={`badge ${
                      prediction.trend === 'strong' ? 'badge-success' :
                      prediction.trend === 'improving' ? 'badge-info' :
                      prediction.trend === 'stable' ? 'badge-primary' :
                      prediction.trend === 'weak' ? 'badge-warning' :
                      prediction.trend === 'slowing' ? 'badge-warning' :
                      'badge-error'
                    } capitalize`}>
                      {getTrendText(prediction.trend)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interpretation */}
              <div className="card bg-base-100">
                <div className="card-body">
                  <h3 className="text-xl font-semibold mb-2">{t.tradingImplications}</h3>
                  <div className="prose prose-sm max-w-none opacity-80">
                    <p>{getTrendInterpretation(prediction.trend)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 h-full">
              <div className="card-body flex items-center justify-center text-center">
                <div className="text-6xl mb-4">🌍</div>
                <h3 className="text-xl font-semibold">{t.selectCountry}</h3>
                <p className="opacity-70">{t.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
