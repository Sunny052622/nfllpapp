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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Expense Tracker
        </h1>
        <p className="text-gray-500 text-center mb-8">Who is entering today?</p>
        <div className="space-y-3">
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => handlePick(name)}
              className="w-full py-4 px-6 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[56px]"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
