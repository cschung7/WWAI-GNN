'use client'

import { useLanguage } from '../LayoutClient'
import { TRANSLATIONS } from '../translations'

export default function HowItWorksPage() {
  const { lang } = useLanguage()
  const t = TRANSLATIONS[lang].howItWorks

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg opacity-70">
          {t.description}
        </p>
      </div>

      {/* Step 1: The Problem */}
      <section className="card bg-base-100">
        <div className="card-body">
          <div className="badge badge-primary mb-2">{t.step} 1</div>
          <h2 className="card-title text-2xl">{t.problemTitle}</h2>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="p-4 bg-error/10 rounded-lg border border-error/30">
              <h3 className="font-semibold text-error mb-2">{t.traditional}</h3>
              <ul className="space-y-2 text-sm">
                {t.traditionalPoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-success/10 rounded-lg border border-success/30">
              <h3 className="font-semibold text-success mb-2">{t.gnn}</h3>
              <ul className="space-y-2 text-sm">
                {t.gnnPoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: The Graph Structure */}
      <section className="card bg-base-100">
        <div className="card-body">
          <div className="badge badge-primary mb-2">{t.step} 2</div>
          <h2 className="card-title text-2xl">{t.graphTitle}</h2>
          <p className="opacity-70 mb-4">
            {t.graphDesc}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-base-200 rounded-lg">
              <div className="text-4xl mb-2">🏛️</div>
              <h3 className="font-semibold">26 {t.nodes}</h3>
              <p className="text-sm opacity-70">{t.nodesDesc}</p>
            </div>
            <div className="text-center p-4 bg-base-200 rounded-lg">
              <div className="text-4xl mb-2">🔗</div>
              <h3 className="font-semibold">3 {t.edgeTypes}</h3>
              <p className="text-sm opacity-70">{t.edgeTypesDesc}</p>
            </div>
            <div className="text-center p-4 bg-base-200 rounded-lg">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-semibold">5 {t.features}</h3>
              <p className="text-sm opacity-70">{t.featuresDesc}</p>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{t.graphInfo}</span>
          </div>
        </div>
      </section>

      {/* Step 3: The Architecture */}
      <section className="card bg-base-100">
        <div className="card-body">
          <div className="badge badge-primary mb-2">{t.step} 3</div>
          <h2 className="card-title text-2xl">{t.architectureTitle}</h2>

          <div className="overflow-x-auto py-8">
            <div className="flex items-center justify-center gap-2 min-w-[700px]">
              {/* Input */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-base-200 rounded-xl flex flex-col items-center justify-center border-2 border-base-300">
                  <span className="text-2xl">📥</span>
                  <span className="text-xs font-semibold mt-1">{TRANSLATIONS[lang].dashboard.input}</span>
                </div>
                <div className="text-xs mt-2 text-center opacity-70">
                  {TRANSLATIONS[lang].dashboard.inputDesc1}<br/>27 {t.features}
                </div>
              </div>

              <div className="text-xl">→</div>

              {/* Encoder */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-primary/20 rounded-xl flex flex-col items-center justify-center border-2 border-primary">
                  <span className="text-2xl">🔷</span>
                  <span className="text-xs font-semibold mt-1">{TRANSLATIONS[lang].dashboard.encoder}</span>
                </div>
                <div className="text-xs mt-2 text-center opacity-70">
                  1 GNN {t.step}<br/>→ 128-dim
                </div>
              </div>

              <div className="text-xl">→</div>

              {/* Processor */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-24 bg-success/20 rounded-xl flex flex-col items-center justify-center border-2 border-success">
                  <span className="text-2xl">🔄</span>
                  <span className="text-xs font-semibold mt-1">{TRANSLATIONS[lang].dashboard.processor}</span>
                </div>
                <div className="text-xs mt-2 text-center opacity-70">
                  8 {lang === 'ko' ? '메시지' : 'message'}<br/>{lang === 'ko' ? '전달 단계' : 'passing steps'}
                </div>
              </div>

              <div className="text-xl">→</div>

              {/* Decoder */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-warning/20 rounded-xl flex flex-col items-center justify-center border-2 border-warning">
                  <span className="text-2xl">🔶</span>
                  <span className="text-xs font-semibold mt-1">{TRANSLATIONS[lang].dashboard.decoder}</span>
                </div>
                <div className="text-xs mt-2 text-center opacity-70">
                  1 GNN {t.step}<br/>→ {lang === 'ko' ? '출력' : 'outputs'}
                </div>
              </div>

              <div className="text-xl">→</div>

              {/* Output */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-base-200 rounded-xl flex flex-col items-center justify-center border-2 border-base-300">
                  <span className="text-2xl">📤</span>
                  <span className="text-xs font-semibold mt-1">{TRANSLATIONS[lang].dashboard.output}</span>
                </div>
                <div className="text-xs mt-2 text-center opacity-70">
                  5 {lang === 'ko' ? '지표' : 'indicators'}<br/>× 26 {lang === 'ko' ? '국가' : 'countries'}
                </div>
              </div>
            </div>
          </div>

          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">{TRANSLATIONS[lang].dashboard.parameters}</div>
              <div className="stat-value text-primary">4.03M</div>
            </div>
            <div className="stat">
              <div className="stat-title">{lang === 'ko' ? '잠재 차원' : 'Latent Dimension'}</div>
              <div className="stat-value">128</div>
            </div>
            <div className="stat">
              <div className="stat-title">{lang === 'ko' ? '메시지 전달' : 'Message Passing'}</div>
              <div className="stat-value">8 {lang === 'ko' ? '단계' : 'steps'}</div>
            </div>
            <div className="stat">
              <div className="stat-title">{lang === 'ko' ? '검증 R²' : 'Validation R²'}</div>
              <div className="stat-value text-success">99.49%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Message Passing */}
      <section className="card bg-base-100">
        <div className="card-body">
          <div className="badge badge-primary mb-2">{t.step} 4</div>
          <h2 className="card-title text-2xl">{t.messagePassingTitle}</h2>
          <p className="opacity-70 mb-4">
            {t.messagePassingDesc}
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
              <div className="badge badge-lg badge-primary">1</div>
              <div>
                <h3 className="font-semibold">{t.step1}</h3>
                <p className="text-sm opacity-70">{t.step1Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
              <div className="badge badge-lg badge-primary">2</div>
              <div>
                <h3 className="font-semibold">{t.step2}</h3>
                <p className="text-sm opacity-70">{t.step2Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
              <div className="badge badge-lg badge-primary">3</div>
              <div>
                <h3 className="font-semibold">{t.step3}</h3>
                <p className="text-sm opacity-70">{t.step3Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
              <div className="badge badge-lg badge-primary">4</div>
              <div>
                <h3 className="font-semibold">{t.step4}</h3>
                <p className="text-sm opacity-70">{t.step4Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 5: Training */}
      <section className="card bg-base-100">
        <div className="card-body">
          <div className="badge badge-primary mb-2">{t.step} 5</div>
          <h2 className="card-title text-2xl">{t.trainingTitle}</h2>

          <div className="overflow-x-auto">
            <table className="table">
              <tbody>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '데이터 소스' : 'Data Source'}</td>
                  <td>FRED API (Federal Reserve Economic Data)</td>
                </tr>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '학습 기간' : 'Training Period'}</td>
                  <td>2000-2025 ({lang === 'ko' ? '분기별 데이터' : 'quarterly data'})</td>
                </tr>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '샘플' : 'Samples'}</td>
                  <td>80 {lang === 'ko' ? '학습' : 'training'}, 21 {lang === 'ko' ? '검증' : 'validation'}</td>
                </tr>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '옵티마이저' : 'Optimizer'}</td>
                  <td>AdamW with cosine decay schedule</td>
                </tr>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '손실 함수' : 'Loss Function'}</td>
                  <td>Mean Squared Error (MSE)</td>
                </tr>
                <tr>
                  <td className="font-semibold">{lang === 'ko' ? '에폭' : 'Epochs'}</td>
                  <td>50</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-success/10 rounded-lg border border-success/30">
            <h3 className="font-semibold text-success">{t.trainingResults}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <div className="text-sm opacity-70">{lang === 'ko' ? '에폭' : 'Epoch'} 10</div>
                <div className="font-mono">R² 99.28%</div>
              </div>
              <div>
                <div className="text-sm opacity-70">{lang === 'ko' ? '에폭' : 'Epoch'} 20</div>
                <div className="font-mono">R² 99.47%</div>
              </div>
              <div>
                <div className="text-sm opacity-70">{lang === 'ko' ? '에폭' : 'Epoch'} 40</div>
                <div className="font-mono">R² 99.51%</div>
              </div>
              <div>
                <div className="text-sm opacity-70">{lang === 'ko' ? '최종' : 'Final'}</div>
                <div className="font-mono text-success">R² 99.49%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="card bg-gradient-to-br from-primary/20 to-base-100">
        <div className="card-body text-center">
          <h2 className="text-2xl font-bold mb-4">{t.keyTakeaway}</h2>
          <p className="text-lg max-w-2xl mx-auto">
            {t.keyTakeawayDesc}
          </p>
        </div>
      </section>
    </div>
  )
}
