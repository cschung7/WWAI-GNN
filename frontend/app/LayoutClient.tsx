'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Language type
export type Language = 'en' | 'ko'

// Navigation translations
const NAV_TRANSLATIONS = {
  en: {
    navigation: 'Navigation',
    dashboard: 'Dashboard',
    countryExplorer: 'Country Explorer',
    predictions: 'Predictions',
    spilloverAnalysis: 'Spillover Analysis',
    understandingModel: 'Understanding the Model',
    howItWorks: 'How It Works',
    useCases: 'Use Cases',
    faq: 'FAQ',
    reports: 'Reports',
    generateReport: 'Generate Report',
    countries: '26 Countries',
    indicators: '5 Indicators',
  },
  ko: {
    navigation: '메뉴',
    dashboard: '대시보드',
    countryExplorer: '국가별',
    predictions: '예측',
    spilloverAnalysis: '충격반응 분석',
    understandingModel: '모델 이해하기',
    howItWorks: '작동원리',
    useCases: '사용 예',
    faq: 'FAQ',
    reports: '보고서',
    generateReport: '보고서 작성',
    countries: '26개국',
    indicators: '5개 지표',
  },
} as const

// Language context
interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

// Layout client component
export function LayoutClient({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('grapheconcast-lang') as Language
    if (savedLang && (savedLang === 'en' || savedLang === 'ko')) {
      setLang(savedLang)
    }
    setMounted(true)
  }, [])

  // Save language to localStorage when changed
  const handleSetLang = (newLang: Language) => {
    setLang(newLang)
    localStorage.setItem('grapheconcast-lang', newLang)
  }

  const t = NAV_TRANSLATIONS[lang]

  // Prevent hydration mismatch - but still wrap in provider
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ lang: 'en', setLang: () => {} }}>
        <div className="drawer lg:drawer-open">
          <input id="sidebar" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content">
            <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30">
              <div className="flex-1 px-2">
                <span className="text-xl font-bold text-primary">GraphEconCast</span>
                <span className="ml-2 badge badge-success badge-sm">R² 99.49%</span>
              </div>
            </div>
            <main className="p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>
      <div className="drawer lg:drawer-open">
        <input id="sidebar" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          {/* Navbar */}
          <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30">
            <div className="flex-none lg:hidden">
              <label htmlFor="sidebar" className="btn btn-square btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </label>
            </div>
            <div className="flex-1 px-2">
              <span className="text-xl font-bold text-primary">GraphEconCast</span>
              <span className="ml-2 badge badge-success badge-sm">R² 99.49%</span>
            </div>
            <div className="flex-none flex items-center gap-4">
              {/* Language Toggle */}
              <div className="join">
                <button
                  className={`join-item btn btn-xs ${lang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleSetLang('en')}
                >
                  ENG
                </button>
                <button
                  className={`join-item btn btn-xs ${lang === 'ko' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleSetLang('ko')}
                >
                  한국어
                </button>
              </div>
              <span className="text-sm opacity-70 hidden md:inline">
                {t.countries} | {t.indicators}
              </span>
            </div>
          </div>
          {/* Main Content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
        {/* Sidebar */}
        <div className="drawer-side z-40">
          <label htmlFor="sidebar" className="drawer-overlay"></label>
          <aside className="w-64 min-h-screen bg-base-200">
            <div className="p-4 border-b border-base-300">
              <h2 className="text-lg font-bold">{t.navigation}</h2>
            </div>
            <ul className="menu p-4 gap-1">
              <li><a href="/">{t.dashboard}</a></li>
              <li><a href="/countries">{t.countryExplorer}</a></li>
              <li><a href="/predictions">{t.predictions}</a></li>
              <li><a href="/spillovers">{t.spilloverAnalysis}</a></li>
              <li className="menu-title mt-4">{t.understandingModel}</li>
              <li><a href="/how-it-works">{t.howItWorks}</a></li>
              <li><a href="/use-cases">{t.useCases}</a></li>
              <li><a href="/faq">{t.faq}</a></li>
              <li className="menu-title mt-4">{t.reports}</li>
              <li><a href="/reports">{t.generateReport}</a></li>
            </ul>
          </aside>
        </div>
      </div>
    </LanguageContext.Provider>
  )
}
