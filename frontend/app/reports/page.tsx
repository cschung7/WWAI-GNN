'use client'

import { useState } from 'react'
import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS } from '../translations'

const REPORT_TYPES_EN = [
  {
    id: 'weekly',
    name: 'Weekly Scorecard',
    description: 'Country rankings, divergence alerts, and top calls',
    sections: ['Executive Summary', 'Country Scorecard', 'Divergence Alerts', 'Risk Radar'],
  },
  {
    id: 'country',
    name: 'Country Deep Dive',
    description: 'Detailed analysis for a specific country',
    sections: ['Economic Overview', 'Predictions', 'Historical Comparison', 'Trading Implications'],
  },
  {
    id: 'spillover',
    name: 'Spillover Report',
    description: 'Impact analysis for a shock scenario',
    sections: ['Scenario Definition', 'First-Order Effects', 'Second-Order Effects', 'Portfolio Implications'],
  },
  {
    id: 'quarterly',
    name: 'Quarterly Review',
    description: 'Model performance and outlook update',
    sections: ['Model Performance', 'Prediction Accuracy', 'Key Themes', 'Outlook'],
  },
]

const REPORT_TYPES_KO = [
  {
    id: 'weekly',
    name: '주간 스코어카드',
    description: '국가 순위, 괴리 경보, 주요 콜',
    sections: ['요약', '국가 스코어카드', '괴리 경보', '리스크 레이더'],
  },
  {
    id: 'country',
    name: '국가 심층 분석',
    description: '특정 국가에 대한 상세 분석',
    sections: ['경제 개요', '예측', '역사적 비교', '트레이딩 시사점'],
  },
  {
    id: 'spillover',
    name: '파급효과 보고서',
    description: '충격 시나리오에 대한 영향 분석',
    sections: ['시나리오 정의', '1차 효과', '2차 효과', '포트폴리오 시사점'],
  },
  {
    id: 'quarterly',
    name: '분기별 리뷰',
    description: '모델 성과 및 전망 업데이트',
    sections: ['모델 성과', '예측 정확도', '주요 테마', '전망'],
  },
]

const SAMPLE_REPORT_EN = `
# GraphEconCast Weekly Scorecard
## Q1 2026 Week 4

### Executive Summary

**Top 3 Calls This Week:**
1. **India outperformance** - GDP +6.8% leads major economies
2. **Germany weakness** - GDP +0.8% signals continued underperformance
3. **US-Japan rate divergence** - 5.15% spread creates opportunities

### Country Scorecard

| Country | GDP | Inflation | Unemployment | Signal |
|---------|-----|-----------|--------------|--------|
| IND | +6.8% | 5.1% | 7.8% | Strong |
| CHN | +4.8% | 1.8% | 5.2% | Slowing |
| USA | +2.4% | 3.2% | 3.8% | Stable |
| DEU | +0.8% | 2.9% | 5.9% | Weak |

### Divergence Alerts

⚠️ **Germany Q1 GDP**: Model +0.8% vs Consensus +1.2%
- Implication: Market may be too optimistic on German recovery
- Trade: Consider underweight DAX

### Risk Radar

🔴 **Elevated**: Turkey inflation regime (58%)
🟡 **Watch**: China growth deceleration
🟢 **Stable**: US labor market
`

const SAMPLE_REPORT_KO = `
# GraphEconCast 주간 스코어카드
## 2026년 1분기 4주차

### 요약

**금주 Top 3 콜:**
1. **인도 아웃퍼폼** - GDP +6.8%로 주요 경제권 선도
2. **독일 약세** - GDP +0.8%로 지속적인 저조 신호
3. **미일 금리 격차** - 5.15% 스프레드로 기회 창출

### 국가 스코어카드

| 국가 | GDP | 인플레이션 | 실업률 | 신호 |
|------|-----|-----------|--------|------|
| IND | +6.8% | 5.1% | 7.8% | 강세 |
| CHN | +4.8% | 1.8% | 5.2% | 둔화 |
| USA | +2.4% | 3.2% | 3.8% | 안정 |
| DEU | +0.8% | 2.9% | 5.9% | 약세 |

### 괴리 경보

⚠️ **독일 Q1 GDP**: 모델 +0.8% vs 컨센서스 +1.2%
- 시사점: 시장이 독일 회복에 대해 지나치게 낙관적일 수 있음
- 매매: DAX 비중 축소 고려

### 리스크 레이더

🔴 **상승**: 터키 인플레이션 체제 (58%)
🟡 **관찰**: 중국 성장 둔화
🟢 **안정**: 미국 노동시장
`

export default function ReportsPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].reports

  const reportTypes = lang === 'ko' ? REPORT_TYPES_KO : REPORT_TYPES_EN
  const sampleReport = lang === 'ko' ? SAMPLE_REPORT_KO : SAMPLE_REPORT_EN

  const [selectedType, setSelectedType] = useState('weekly')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<string | null>(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)
      setGeneratedReport(sampleReport)
    }, 1500)
  }

  const selectedReport = reportTypes.find(r => r.id === selectedType)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="opacity-70 mt-1">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Type Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-100">
            <div className="card-body">
              <h2 className="card-title mb-4">{t.reportType}</h2>
              <div className="space-y-2">
                {reportTypes.map(type => (
                  <button
                    key={type.id}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedType === type.id
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                    onClick={() => {
                      setSelectedType(type.id)
                      setGeneratedReport(null)
                    }}
                  >
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-sm opacity-70">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedReport && (
            <div className="card bg-base-100">
              <div className="card-body">
                <h3 className="font-semibold mb-2">{t.sectionsIncluded}</h3>
                <ul className="space-y-1">
                  {selectedReport.sections.map((section, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-success">✓</span>
                      {section}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            className={`btn btn-primary w-full ${isGenerating ? 'loading' : ''}`}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? t.generating : t.generateReport}
          </button>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 h-full">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">{t.reportPreview}</h2>
                {generatedReport && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline">
                      {t.copy}
                    </button>
                    <button className="btn btn-sm btn-outline">
                      {t.downloadPdf}
                    </button>
                  </div>
                )}
              </div>

              {generatedReport ? (
                <div className="bg-base-200 rounded-lg p-6 overflow-auto max-h-[600px]">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {generatedReport}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-base-200 rounded-lg min-h-[400px]">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-xl font-semibold">{t.noReport}</h3>
                    <p className="opacity-70 mt-2">
                      {t.noReportDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Usage Guide */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title">{t.usageGuide}</h2>
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold">{t.weekly}</h3>
              <p className="text-sm opacity-70">{t.weeklyDesc}</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-semibold">{t.country}</h3>
              <p className="text-sm opacity-70">{t.countryDesc}</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🌐</div>
              <h3 className="font-semibold">{t.spillover}</h3>
              <p className="text-sm opacity-70">{t.spilloverDesc}</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold">{t.quarterly}</h3>
              <p className="text-sm opacity-70">{t.quarterlyDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
