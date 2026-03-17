import { useNavigate } from 'react-router-dom'
import { USERS } from '../data/users'
import { setUser } from '../lib/userStore'

export function UserPicker() {
  const navigate = useNavigate()

  const handlePick = (name) => {
    setUser(name)
    navigate('/entry', { replace: true })
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-600 to-indigo-800 px-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💼</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">NFLLP</h1>
          <p className="text-indigo-200 text-sm">Expense Tracker</p>
        </div>
        <p className="text-indigo-200 text-xs text-center mb-4">Who is entering today?</p>
        <div className="space-y-3">
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => handlePick(name)}
              className="w-full py-4 px-6 bg-white text-indigo-700 text-lg font-semibold rounded-2xl active:scale-[0.98] transition-transform shadow-lg"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
