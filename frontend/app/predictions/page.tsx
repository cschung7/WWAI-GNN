'use client'

import { useState } from 'react'
import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS } from '../translations'

const INDICATORS = ['gdp', 'inflation', 'unemployment', 'rate'] as const
type Indicator = typeof INDICATORS[number]

const PREDICTIONS = [
  { code: 'USA', gdp: 2.4, inflation: 3.2, unemployment: 3.8, rate: 5.25 },
  { code: 'CHN', gdp: 4.8, inflation: 1.8, unemployment: 5.2, rate: 3.45 },
  { code: 'JPN', gdp: 1.2, inflation: 2.4, unemployment: 2.5, rate: 0.10 },
  { code: 'DEU', gdp: 0.8, inflation: 2.9, unemployment: 5.9, rate: 4.50 },
  { code: 'IND', gdp: 6.8, inflation: 5.1, unemployment: 7.8, rate: 6.50 },
  { code: 'GBR', gdp: 1.1, inflation: 4.0, unemployment: 4.2, rate: 5.25 },
  { code: 'FRA', gdp: 1.4, inflation: 2.8, unemployment: 7.3, rate: 4.50 },
  { code: 'ITA', gdp: 0.9, inflation: 2.5, unemployment: 7.8, rate: 4.50 },
  { code: 'BRA', gdp: 2.1, inflation: 4.5, unemployment: 7.9, rate: 11.75 },
  { code: 'CAN', gdp: 1.5, inflation: 3.1, unemployment: 5.8, rate: 5.00 },
  { code: 'KOR', gdp: 2.2, inflation: 2.7, unemployment: 2.8, rate: 3.50 },
  { code: 'ESP', gdp: 2.0, inflation: 3.2, unemployment: 11.8, rate: 4.50 },
  { code: 'AUS', gdp: 1.8, inflation: 3.5, unemployment: 4.1, rate: 4.35 },
  { code: 'RUS', gdp: 1.5, inflation: 7.2, unemployment: 2.9, rate: 16.00 },
  { code: 'MEX', gdp: 2.5, inflation: 4.8, unemployment: 2.8, rate: 11.00 },
  { code: 'IDN', gdp: 5.1, inflation: 3.2, unemployment: 5.3, rate: 6.00 },
]

export default function PredictionsPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].predictions
  const dashboard = TRANSLATIONS[lang].dashboard

  const [selectedIndicator, setSelectedIndicator] = useState<Indicator>('gdp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const getIndicatorInfo = (ind: Indicator) => {
    const info = {
      gdp: { name: dashboard.gdpGrowth, unit: '%', goodDirection: 'up' as const },
      inflation: { name: dashboard.inflation, unit: '%', goodDirection: 'down' as const },
      unemployment: { name: dashboard.unemployment, unit: '%', goodDirection: 'down' as const },
      rate: { name: dashboard.interestRate, unit: '%', goodDirection: 'neutral' as const },
    }
    return info[ind]
  }

  const sortedData = [...PREDICTIONS].sort((a, b) => {
    const diff = a[selectedIndicator] - b[selectedIndicator]
    return sortOrder === 'desc' ? -diff : diff
  })

  const info = getIndicatorInfo(selectedIndicator)
  const values = PREDICTIONS.map(p => p[selectedIndicator])
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const max = Math.max(...values)
  const min = Math.min(...values)

  const getInterpretation = (type: 'strong' | 'watch') => {
    const interpretations = lang === 'ko' ? {
      gdp: {
        strong: 'GDP 성장률이 3%를 초과하는 국가는 강한 경제적 모멘텀을 보이고 있습니다. 비중 확대를 고려해 볼 수 있습니다.',
        watch: 'GDP 성장률이 1% 미만인 국가는 경기 침체에 근접할 수 있습니다. 추가 악화 여부를 모니터링하세요.',
      },
      inflation: {
        strong: '인플레이션이 2.5% 미만인 국가는 물가가 안정적입니다. 중앙은행이 금리 인하 여력이 있을 수 있습니다.',
        watch: '인플레이션이 5%를 초과하는 국가는 정책적 과제에 직면해 있습니다. 중앙은행이 긴축 정책을 유지할 가능성이 높습니다.',
      },
      unemployment: {
        strong: '실업률이 4% 미만인 국가는 노동시장이 타이트합니다. 임금 상승 압력을 주시하세요.',
        watch: '실업률이 8%를 초과하는 국가는 상당한 노동시장 이완이 있습니다. 성장이 잠재력 이하일 수 있습니다.',
      },
      rate: {
        strong: '높은 금리는 긴축적 정책을 나타냅니다. 금리 차이에서 상대가치를 고려해 보세요.',
        watch: '매우 높은 금리(>10%)는 종종 스트레스를 나타냅니다. 매우 낮은 금리는 정책 유연성을 제한할 수 있습니다.',
      },
    } : {
      gdp: {
        strong: 'Countries with GDP growth above 3% are showing strong economic momentum. Consider overweight positions.',
        watch: 'Countries with GDP growth below 1% may be approaching recession. Monitor for further deterioration.',
      },
      inflation: {
        strong: 'Countries with inflation below 2.5% have well-anchored prices. Central banks may have room to cut rates.',
        watch: 'Countries with inflation above 5% face policy challenges. Central banks likely to maintain tight policy.',
      },
      unemployment: {
        strong: 'Countries with unemployment below 4% have tight labor markets. Watch for wage pressures.',
        watch: 'Countries with unemployment above 8% have significant labor market slack. Growth may be below potential.',
      },
      rate: {
        strong: 'Higher rates indicate tighter policy. Consider relative value in rate differentials.',
        watch: 'Very high rates (>10%) often indicate stress. Very low rates may limit policy flexibility.',
      },
    }
    return interpretations[selectedIndicator]?.[type] || ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="opacity-70 mt-1">{t.description}</p>
      </div>

      {/* Indicator Selection */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title mb-4">{t.selectIndicator}</h2>
          <div className="flex flex-wrap gap-2">
            {INDICATORS.map(ind => (
              <button
                key={ind}
                className={`btn ${selectedIndicator === ind ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedIndicator(ind)}
              >
                {getIndicatorInfo(ind).name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.average}</div>
          <div className="text-2xl font-bold">{avg.toFixed(1)}{info.unit}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.highest}</div>
          <div className="text-2xl font-bold text-success">{max.toFixed(1)}{info.unit}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.lowest}</div>
          <div className="text-2xl font-bold text-error">{min.toFixed(1)}{info.unit}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm opacity-70">{t.spread}</div>
          <div className="text-2xl font-bold">{(max - min).toFixed(1)}{info.unit}</div>
        </div>
      </div>

      {/* Rankings */}
      <div className="card bg-base-100">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">{info.name} {t.rankings}</h2>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? t.highestFirst : t.lowestFirst}
            </button>
          </div>

          <div className="space-y-2">
            {sortedData.map((country, idx) => {
              const value = country[selectedIndicator]
              const pct = ((value - min) / (max - min)) * 100

              return (
                <div key={country.code} className="flex items-center gap-4">
                  <div className="w-8 text-center font-mono text-sm opacity-50">
                    {idx + 1}
                  </div>
                  <div className="w-16 font-mono font-bold text-primary">
                    {country.code}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-base-200 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full transition-all ${
                          info.goodDirection === 'up'
                            ? 'bg-gradient-to-r from-error via-warning to-success'
                            : info.goodDirection === 'down'
                            ? 'bg-gradient-to-r from-success via-warning to-error'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-3">
                        <span className="font-mono text-sm font-bold">
                          {value.toFixed(1)}{info.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Interpretation Guide */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title">{t.interpretationGuide}</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-base-200 rounded-lg">
              <h3 className="font-semibold text-success mb-2">{t.strongPerformers}</h3>
              <p className="text-sm opacity-70">{getInterpretation('strong')}</p>
            </div>
            <div className="p-4 bg-base-200 rounded-lg">
              <h3 className="font-semibold text-warning mb-2">{t.watchList}</h3>
              <p className="text-sm opacity-70">{getInterpretation('watch')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
