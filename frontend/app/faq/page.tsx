'use client'

import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS } from '../translations'

const FAQ_ITEMS_EN = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is GraphEconCast?',
        a: 'GraphEconCast is a Graph Neural Network (GNN) model that forecasts macroeconomic indicators (GDP growth, inflation, unemployment, interest rates, trade balance) across 26 major economies. Unlike traditional models, it explicitly models the network of economic relationships between countries.',
      },
      {
        q: 'What makes it different from traditional econometric models?',
        a: 'Traditional VAR models treat countries independently with linear assumptions. GraphEconCast captures: (1) Network effects through trade/geographic/similarity edges, (2) Non-linear dynamics, (3) Learned adaptive weights, and (4) Multi-step spillover propagation.',
      },
      {
        q: 'How accurate is the model?',
        a: 'The model achieves 99.49% R² on validation data from 2000-2025. However, this is in-sample performance. We recommend out-of-sample backtesting and comparison against consensus forecasts before live deployment.',
      },
    ],
  },
  {
    category: 'Data & Methodology',
    questions: [
      {
        q: 'What data sources does the model use?',
        a: 'Primary data comes from FRED (Federal Reserve Economic Data), which aggregates OECD, IMF, BIS, and national statistical agency data. The model uses quarterly data from 2000 to present.',
      },
      {
        q: 'Which countries are covered?',
        a: '26 major economies: USA, CHN, JPN, DEU, IND, GBR, FRA, ITA, BRA, CAN, KOR, ESP, AUS, RUS, MEX, IDN, NLD, SAU, TUR, CHE, POL, SWE, BEL, ARG, NOR, AUT. This covers approximately 85% of global GDP.',
      },
      {
        q: 'What economic indicators are predicted?',
        a: 'Five core indicators: (1) GDP Growth Rate - real quarterly growth, (2) Inflation - CPI year-over-year, (3) Unemployment Rate, (4) Interest Rate - central bank policy rate, (5) Trade Balance.',
      },
      {
        q: 'How often are predictions updated?',
        a: 'The model can be updated quarterly as new GDP data is released, or monthly using higher-frequency inflation and unemployment data. Full re-training is recommended quarterly.',
      },
    ],
  },
  {
    category: 'Model Architecture',
    questions: [
      {
        q: 'What is a Graph Neural Network?',
        a: 'A GNN is a neural network that operates on graph-structured data. Nodes (countries) exchange information with their neighbors (connected economies) through message passing, allowing the model to learn complex relationships in the economic network.',
      },
      {
        q: 'What are the three types of edges?',
        a: 'Trade edges (bilateral import/export relationships), Geographic edges (physical proximity between countries), and Similarity edges (development level and structural economic similarity).',
      },
      {
        q: 'How many parameters does the model have?',
        a: 'The model has approximately 4.03 million parameters with a 128-dimensional latent space and 8 message passing steps.',
      },
      {
        q: 'What is message passing?',
        a: 'Message passing is how information flows through the graph. Each country aggregates data from its neighbors, transforms it using learned weights, and updates its own state. This repeats 8 times, allowing effects to propagate across the entire network.',
      },
    ],
  },
  {
    category: 'Interpretation',
    questions: [
      {
        q: 'How do I interpret the spillover analysis?',
        a: 'The spillover matrix shows estimated GDP impact when a shock occurs in one country. For example, if China GDP falls 2%, the model estimates Korea GDP falls by approximately 1.1% due to trade linkages.',
      },
      {
        q: 'What do the country signals mean?',
        a: 'Signals summarize the macro outlook: Strong (above-trend growth), Improving (positive momentum), Stable (in-line with expectations), Slowing (decelerating growth), Weak (below-trend), Volatile (high uncertainty), Crisis (severe stress).',
      },
      {
        q: 'How should I use divergence alerts?',
        a: 'Divergence alerts flag when the model prediction differs significantly from consensus. These may indicate opportunities where the market has not fully priced in network effects or spillovers.',
      },
    ],
  },
  {
    category: 'Limitations',
    questions: [
      {
        q: 'What are the model limitations?',
        a: 'Key limitations: (1) Quarterly frequency - not for short-term trading, (2) 2-3 month data lag, (3) In-sample validation only, (4) Cannot predict unprecedented events (COVID, wars), (5) Assumes historical relationships persist.',
      },
      {
        q: 'Is this a trading signal generator?',
        a: 'No. GraphEconCast outputs economic forecasts, not asset prices or trading signals. It should be used as one input to investment decisions, combined with other analysis and judgment.',
      },
      {
        q: 'How does the model handle regime changes?',
        a: 'The model learns from historical data, so it may lag during rapid regime changes. Human judgment is needed for unprecedented situations. The spillover analysis helps anticipate how changes might propagate.',
      },
    ],
  },
  {
    category: 'Technical',
    questions: [
      {
        q: 'What framework is the model built on?',
        a: 'The model uses JAX for computation, Haiku for neural network layers, and is adapted from DeepMind\'s GraphCast weather forecasting architecture.',
      },
      {
        q: 'Can I access the raw predictions via API?',
        a: 'API access is available for integration with trading systems. Contact the development team for API documentation and access credentials.',
      },
      {
        q: 'How can I validate the model myself?',
        a: 'Recommended validation: (1) Out-of-sample backtest on held-out periods, (2) Compare against IMF/Bloomberg consensus, (3) Measure directional accuracy, (4) Portfolio simulation for alpha generation.',
      },
    ],
  },
]

const FAQ_ITEMS_KO = [
  {
    category: '일반',
    questions: [
      {
        q: 'GraphEconCast란 무엇인가요?',
        a: 'GraphEconCast는 26개 주요 경제권의 거시경제 지표(GDP 성장률, 인플레이션, 실업률, 금리, 무역수지)를 예측하는 그래프 신경망(GNN) 모델입니다. 기존 모델과 달리 국가 간 경제적 관계 네트워크를 명시적으로 모델링합니다.',
      },
      {
        q: '기존 계량경제학 모델과 어떤 점이 다른가요?',
        a: '기존 VAR 모델은 국가를 독립적으로 처리하고 선형 관계를 가정합니다. GraphEconCast는 (1) 무역/지리적/유사성 엣지를 통한 네트워크 효과, (2) 비선형 역학, (3) 학습된 적응형 가중치, (4) 다단계 파급효과 전파를 포착합니다.',
      },
      {
        q: '모델의 정확도는 어떤가요?',
        a: '모델은 2000-2025년 검증 데이터에서 99.49%의 R²를 달성합니다. 그러나 이는 표본 내 성과입니다. 실제 운영 전 표본 외 백테스트와 컨센서스 예측 비교를 권장합니다.',
      },
    ],
  },
  {
    category: '데이터 및 방법론',
    questions: [
      {
        q: '모델은 어떤 데이터 소스를 사용하나요?',
        a: '주요 데이터는 OECD, IMF, BIS 및 각국 통계청 데이터를 집계하는 FRED(Federal Reserve Economic Data)에서 제공됩니다. 모델은 2000년부터 현재까지의 분기별 데이터를 사용합니다.',
      },
      {
        q: '어떤 국가들이 포함되나요?',
        a: '26개 주요 경제권: 미국, 중국, 일본, 독일, 인도, 영국, 프랑스, 이탈리아, 브라질, 캐나다, 한국, 스페인, 호주, 러시아, 멕시코, 인도네시아, 네덜란드, 사우디, 터키, 스위스, 폴란드, 스웨덴, 벨기에, 아르헨티나, 노르웨이, 오스트리아. 이는 전 세계 GDP의 약 85%를 커버합니다.',
      },
      {
        q: '어떤 경제 지표를 예측하나요?',
        a: '5개 핵심 지표: (1) GDP 성장률 - 실질 분기 성장, (2) 인플레이션 - CPI 전년 대비, (3) 실업률, (4) 금리 - 중앙은행 정책금리, (5) 무역수지.',
      },
      {
        q: '예측은 얼마나 자주 업데이트되나요?',
        a: '모델은 새로운 GDP 데이터 발표 시 분기별로, 또는 높은 빈도의 인플레이션 및 실업 데이터를 사용하여 월별로 업데이트할 수 있습니다. 분기별 전체 재학습을 권장합니다.',
      },
    ],
  },
  {
    category: '모델 아키텍처',
    questions: [
      {
        q: '그래프 신경망(GNN)이란 무엇인가요?',
        a: 'GNN은 그래프 구조 데이터에서 작동하는 신경망입니다. 노드(국가)는 메시지 전달을 통해 이웃(연결된 경제)과 정보를 교환하여 모델이 경제 네트워크의 복잡한 관계를 학습할 수 있게 합니다.',
      },
      {
        q: '세 가지 유형의 엣지는 무엇인가요?',
        a: '무역 엣지(양자간 수출입 관계), 지리적 엣지(국가 간 물리적 근접성), 유사성 엣지(발전 수준 및 경제 구조 유사성).',
      },
      {
        q: '모델의 파라미터 수는 얼마나 되나요?',
        a: '모델은 128차원 잠재 공간과 8단계 메시지 전달로 약 403만 개의 파라미터를 가집니다.',
      },
      {
        q: '메시지 전달이란 무엇인가요?',
        a: '메시지 전달은 그래프를 통해 정보가 흐르는 방식입니다. 각 국가는 이웃의 데이터를 수집하고, 학습된 가중치를 사용하여 변환하고, 자신의 상태를 업데이트합니다. 이 과정이 8회 반복되어 효과가 전체 네트워크에 전파됩니다.',
      },
    ],
  },
  {
    category: '해석',
    questions: [
      {
        q: '파급효과 분석을 어떻게 해석해야 하나요?',
        a: '파급효과 행렬은 한 국가에 충격이 발생했을 때 예상되는 GDP 영향을 보여줍니다. 예를 들어, 중국 GDP가 2% 하락하면 모델은 무역 연계로 인해 한국 GDP가 약 1.1% 하락할 것으로 추정합니다.',
      },
      {
        q: '국가 신호는 무엇을 의미하나요?',
        a: '신호는 매크로 전망을 요약합니다: 강세(추세 상회 성장), 개선(긍정적 모멘텀), 안정(예상 부합), 둔화(성장 감속), 약세(추세 하회), 변동성(높은 불확실성), 위기(심각한 스트레스).',
      },
      {
        q: '괴리 경보를 어떻게 활용해야 하나요?',
        a: '괴리 경보는 모델 예측이 컨센서스와 크게 다를 때 발생합니다. 이는 시장이 네트워크 효과나 파급효과를 완전히 반영하지 않은 기회를 나타낼 수 있습니다.',
      },
    ],
  },
  {
    category: '한계점',
    questions: [
      {
        q: '모델의 한계점은 무엇인가요?',
        a: '주요 한계점: (1) 분기별 빈도 - 단기 트레이딩에는 부적합, (2) 2-3개월 데이터 지연, (3) 표본 내 검증만 수행, (4) 전례 없는 이벤트(코로나, 전쟁) 예측 불가, (5) 과거 관계 지속 가정.',
      },
      {
        q: '이것은 트레이딩 신호 생성기인가요?',
        a: '아닙니다. GraphEconCast는 자산 가격이나 트레이딩 신호가 아닌 경제 예측을 출력합니다. 다른 분석 및 판단과 결합하여 투자 결정의 하나의 입력으로 사용해야 합니다.',
      },
      {
        q: '모델은 체제 변화를 어떻게 처리하나요?',
        a: '모델은 과거 데이터에서 학습하므로 급격한 체제 변화 시 지연될 수 있습니다. 전례 없는 상황에는 인간의 판단이 필요합니다. 파급효과 분석은 변화가 어떻게 전파될 수 있는지 예측하는 데 도움이 됩니다.',
      },
    ],
  },
  {
    category: '기술',
    questions: [
      {
        q: '모델은 어떤 프레임워크로 구축되었나요?',
        a: '모델은 JAX를 계산에, Haiku를 신경망 레이어에 사용하며, DeepMind의 GraphCast 기상 예측 아키텍처를 기반으로 합니다.',
      },
      {
        q: 'API를 통해 원시 예측에 접근할 수 있나요?',
        a: '트레이딩 시스템 연동을 위한 API 접근이 가능합니다. API 문서 및 접근 자격 증명은 개발팀에 문의하세요.',
      },
      {
        q: '모델을 직접 검증하려면 어떻게 해야 하나요?',
        a: '권장 검증: (1) 보류된 기간에 대한 표본 외 백테스트, (2) IMF/Bloomberg 컨센서스와 비교, (3) 방향성 정확도 측정, (4) 알파 생성을 위한 포트폴리오 시뮬레이션.',
      },
    ],
  },
]

export default function FAQPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].faq
  const faqItems = lang === 'ko' ? FAQ_ITEMS_KO : FAQ_ITEMS_EN

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="opacity-70 mt-1">
          {t.description}
        </p>
      </div>

      {faqItems.map((section, idx) => (
        <div key={idx} className="card bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-xl text-primary">{section.category}</h2>
            <div className="space-y-2 mt-2">
              {section.questions.map((item, qIdx) => (
                <div key={qIdx} className="collapse collapse-arrow bg-base-200">
                  <input type="radio" name={`accordion-${idx}`} defaultChecked={qIdx === 0} />
                  <div className="collapse-title font-medium">
                    {item.q}
                  </div>
                  <div className="collapse-content">
                    <p className="text-sm opacity-80 pt-2">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Contact */}
      <div className="card bg-gradient-to-r from-primary/20 to-base-100">
        <div className="card-body text-center">
          <h3 className="text-xl font-semibold">{t.stillQuestions}</h3>
          <p className="opacity-70">
            {t.contactTeam}
          </p>
        </div>
      </div>
    </div>
  )
}
