import './globals.css'
import type { Metadata } from 'next'
import { LayoutClient } from './LayoutClient'

export const metadata: Metadata = {
  title: 'GraphEconCast | Economic Forecasting',
  description: 'GNN-based macroeconomic forecasting for 26 global economies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-base-300">
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  )
}
