'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500))

    if (login(password)) {
      router.push('/')
    } else {
      setError('Incorrect password')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 via-base-200 to-base-300 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-2xl w-full max-w-md">
        <div className="card-body">
          {/* Logo/Title */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🌐</div>
            <h1 className="text-2xl font-bold">GraphEconCast</h1>
            <p className="text-sm opacity-70 mt-1">GNN-based Macroeconomic Forecasting</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="Enter password"
                className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <label className="label">
                  <span className="label-text-alt text-error">{error}</span>
                </label>
              )}
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || !password}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Verifying...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="divider my-4"></div>
          <div className="text-center text-xs opacity-50">
            <p>26 Countries • 5 Indicators • R² 99.49%</p>
            <p className="mt-1">WWAI Research</p>
          </div>
        </div>
      </div>
    </div>
  )
}
