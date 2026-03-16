import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_PIN } from '../data/users'
import { isAdminUnlocked, setAdminUnlocked } from '../lib/userStore'

export function AdminGate({ children }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked())
  const navigate = useNavigate()

  if (unlocked) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setAdminUnlocked()
      setUnlocked(true)
    } else {
      setError('Wrong PIN')
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 text-center mb-6">Enter PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError('') }}
            placeholder="4-digit PIN"
            className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 min-h-[48px]"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={() => navigate('/entry')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Entry
          </button>
        </form>
      </div>
    </div>
  )
}
