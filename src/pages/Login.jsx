import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEMO_CREDENTIALS, AUTH_DOMAIN } from '../data/demoCredentials'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/entry'

  const toEmail = (u) => (u.includes('@') ? u : `${u.toLowerCase()}${AUTH_DOMAIN}`)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = toEmail(username)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    // Ensure session is applied before profile query (avoids "Database error querying schema" from unauthenticated request)
    if (data.session) {
      await supabase.auth.setSession(data.session)
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    // If profile fetch fails (e.g. schema not applied or PostgREST cache), default to user role so login can succeed
    const role = profileError ? 'user' : (profileData?.role ?? 'user')
    if (profileError) {
      setError(`Logged in. Profile fetch failed: ${profileError.message}. Continuing as user.`)
      setLoading(false)
      setTimeout(() => setError(''), 3000)
    }

    if (role === 'admin') {
      navigate('/admin', { replace: true })
    } else {
      navigate(from || '/entry', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Expense Tracker
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="keshu, raja, admin..."
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showCredentials ? '▼ Hide' : '▶ Show'} demo credentials
          </button>
          {showCredentials && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-gray-600 font-medium">6 users (password: 123456)</p>
              {DEMO_CREDENTIALS.map((c) => (
                <button
                  key={c.username}
                  type="button"
                  onClick={() => {
                    setUsername(c.username)
                    setPassword(c.password)
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <span className="font-medium">{c.label}</span>: {c.username}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3">
            <Link to="/setup" className="text-indigo-600 hover:underline text-sm">
              Can&apos;t log in? Set up demo users →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
