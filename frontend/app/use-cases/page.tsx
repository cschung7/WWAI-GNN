'use client'

import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS } from '../translations'

const USE_CASES_EN = [
  {
    title: 'Macro Hedge Funds',
    icon: '📈',
    description: 'Global macro strategy and relative value trading',
    applications: [
      'Country ranking by expected GDP growth',
      'Identify growth divergences for long/short trades',
      'Regime change detection for tactical allocation',
      'Cross-country correlation breakdown analysis',
    ],
    example: {
      scenario: 'Model expects Germany to underperform France by 1.2% GDP growth',
      action: 'Consider long CAC40 vs DAX, or long EUR/GBP',
    },
  },
  {
    title: 'Fixed Income / Rates',
    icon: '🏦',
    description: 'Interest rate and central bank policy analysis',
    applications: [
      'Fed vs ECB vs BOJ rate path comparison',
      'Inflation surprise indicator',
      'Yield curve implications from growth/inflation mix',
      'Policy divergence spread trades',
    ],
    example: {
      scenario: 'Model sees US inflation sticky at 3.2% vs 2.8% consensus',
      action: 'Position for Fed higher-for-longer, short duration',
    },
  },
  {
    title: 'EM Specialists',
    icon: '🌍',
    description: 'Emerging market risk and opportunity assessment',
    applications: [
      'EM vulnerability index construction',
      'Contagion risk mapping (which EMs affected by China slowdown?)',
      'Twin deficit alerts',
      'Growth-inflation tradeoff analysis',
    ],
    example: {
      scenario: 'If Brazil enters recession, model estimates 80% probability Argentina follows',
      action: 'Hedge LATAM exposure, reduce Argentina weight',
    },
  },
  {
    title: 'Asset Allocators',
    icon: '🎯',
    description: 'Strategic and tactical asset allocation',
    applications: [
      'Regional growth differential forecasts',
      'Developed vs Emerging allocation signals',
      'Sector rotation based on macro regime',
      'Risk-off trigger identification',
    ],
    example: {
      scenario: 'Asia growth momentum accelerating vs Europe decelerating',
      action: 'Overweight Asia-Pacific equities, underweight Eurozone',
    },
  },
  {
    title: 'Corporate Treasury',
    icon: '🏢',
    description: 'FX exposure and business planning',
    applications: [
      'Regional demand forecasts for sales planning',
      'FX hedging based on growth differentials',
      'Supply chain risk from country slowdowns',
      'CapEx timing based on macro outlook',
    ],
    example: {
      scenario: 'China slowdown predicted to impact Korea supply chain',
      action: 'Diversify Asian suppliers, hedge KRW exposure',
    },
  },
  {
    title: 'Risk Management',
    icon: '🛡️',
    description: 'Portfolio risk and stress testing',
    applications: [
      'Spillover-adjusted VaR calculations',
      'Scenario stress testing with contagion',
      'Correlation regime monitoring',
      'Tail risk from EM crises',
    ],
    example: {
      scenario: 'Model flags elevated contagion risk if Turkey destabilizes',
      action: 'Increase hedges on EM exposure, reduce position sizes',
    },
  },
]

const USE_CASES_KO = [
  {
    title: '매크로 헤지펀드',
    icon: '📈',
    description: '글로벌 매크로 전략 및 상대가치 거래',
    applications: [
      '예상 GDP 성장률 기반 국가 순위',
      '롱/숏 거래를 위한 성장 격차 파악',
      '전술적 배분을 위한 체제 변화 감지',
      '국가간 상관관계 분석',
    ],
    example: {
      scenario: '모델이 독일이 프랑스 대비 1.2% GDP 성장률 저조 예상',
      action: 'CAC40 롱 vs DAX 숏, 또는 EUR/GBP 롱 고려',
    },
  },
  {
    title: '채권 / 금리',
    icon: '🏦',
    description: '금리 및 중앙은행 정책 분석',
    applications: [
      '연준 vs ECB vs BOJ 금리 경로 비교',
      '인플레이션 서프라이즈 지표',
      '성장/인플레이션 조합에 따른 수익률 곡선 시사점',
      '정책 격차 스프레드 거래',
    ],
    example: {
      scenario: '모델이 미국 인플레이션 3.2% 고착 예상 vs 컨센서스 2.8%',
      action: '연준 고금리 장기화 포지션, 듀레이션 축소',
    },
  },
  {
    title: '신흥시장 전문가',
    icon: '🌍',
    description: '신흥시장 리스크 및 기회 평가',
    applications: [
      'EM 취약성 지수 구축',
      '전염 리스크 매핑 (중국 둔화 시 어떤 EM이 영향받나?)',
      '쌍둥이 적자 경보',
      '성장-인플레이션 상충관계 분석',
    ],
    example: {
      scenario: '브라질 경기침체 진입 시, 아르헨티나 연쇄 확률 80% 추정',
      action: 'LATAM 익스포저 헤지, 아르헨티나 비중 축소',
    },
  },
  {
    title: '자산배분',
    icon: '🎯',
    description: '전략적 및 전술적 자산배분',
    applications: [
      '지역별 성장 격차 예측',
      '선진국 vs 신흥국 배분 신호',
      '매크로 체제 기반 섹터 로테이션',
      '리스크오프 트리거 식별',
    ],
    example: {
      scenario: '아시아 성장 모멘텀 가속 vs 유럽 감속',
      action: '아시아태평양 주식 비중 확대, 유로존 비중 축소',
    },
  },
  {
    title: '기업 재무',
    icon: '🏢',
    description: 'FX 익스포저 및 사업 계획',
    applications: [
      '영업 계획을 위한 지역별 수요 예측',
      '성장 격차 기반 FX 헤징',
      '국가 경기 둔화로 인한 공급망 리스크',
      '매크로 전망 기반 CapEx 타이밍',
    ],
    example: {
      scenario: '중국 둔화가 한국 공급망에 영향 예상',
      action: '아시아 공급업체 다변화, 원화 익스포저 헤지',
    },
  },
  {
    title: '리스크 관리',
    icon: '🛡️',
    description: '포트폴리오 리스크 및 스트레스 테스트',
    applications: [
      '파급효과 조정 VaR 계산',
      '전염을 고려한 시나리오 스트레스 테스트',
      '상관관계 체제 모니터링',
      'EM 위기로 인한 테일 리스크',
    ],
    example: {
      scenario: '터키 불안정화 시 전염 리스크 상승 경고',
      action: 'EM 익스포저 헤지 확대, 포지션 규모 축소',
    },
  },
]

export default function UseCasesPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].useCases
  const useCases = lang === 'ko' ? USE_CASES_KO : USE_CASES_EN

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="opacity-70 mt-1">
          {t.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {useCases.map((useCase, idx) => (
          <div key={idx} className="card bg-base-100">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{useCase.icon}</div>
                <div className="flex-1">
                  <h2 className="card-title">{useCase.title}</h2>
                  <p className="text-sm opacity-70">{useCase.description}</p>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div>
                <h3 className="font-semibold text-sm mb-2">{t.applications}</h3>
                <ul className="space-y-1">
                  {useCase.applications.map((app, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="opacity-80">{app}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 p-3 bg-base-200 rounded-lg">
                <div className="text-xs font-semibold text-primary mb-1">{t.example}</div>
                <div className="text-sm">
                  <span className="opacity-70">{t.scenario}: </span>
                  {useCase.example.scenario}
                </div>
                <div className="text-sm mt-1">
                  <span className="opacity-70">{t.action}: </span>
                  <span className="text-success">{useCase.example.action}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h2 className="card-title">{t.workflowTitle}</h2>
          <div className="steps steps-vertical lg:steps-horizontal w-full mt-4">
            <div className="step step-primary">
              <div className="mt-2">
                <div className="font-semibold">{t.step1}</div>
                <div className="text-xs opacity-70">{t.step1Desc}</div>
              </div>
            </div>
            <div className="step step-primary">
              <div className="mt-2">
                <div className="font-semibold">{t.step2}</div>
                <div className="text-xs opacity-70">{t.step2Desc}</div>
              </div>
            </div>
            <div className="step step-primary">
              <div className="mt-2">
                <div className="font-semibold">{t.step3}</div>
                <div className="text-xs opacity-70">{t.step3Desc}</div>
              </div>
            </div>
            <div className="step step-primary">
              <div className="mt-2">
                <div className="font-semibold">{t.step4}</div>
                <div className="text-xs opacity-70">{t.step4Desc}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insight */}
      <div className="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div>
          <div className="font-bold">{t.keyAdvantage}</div>
          <div className="text-sm">{t.keyAdvantageDesc}</div>
        </div>
      </div>
    </div>
  )
}
