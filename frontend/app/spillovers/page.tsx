'use client'

import { Suspense } from 'react'
import SpilloversContent from './SpilloversContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400">Loading spillover analysis...</p>
      </div>
    </div>
  )
}

export default function SpilloversPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SpilloversContent />
    </Suspense>
  )
}
