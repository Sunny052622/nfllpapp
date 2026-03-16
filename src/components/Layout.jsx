import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Layout({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (!error) setIsAdmin(data?.role === 'admin')
        }
      } catch (err) {
        console.error('Layout init error:', err)
      }
    }
    init()
  }, [])
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/entry', label: 'Entry' },
    { to: '/salary', label: 'Salary Sheet' },
    ...(isAdmin ? [{ to: '/admin', label: 'Dashboard' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Expense Tracker</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign Out
        </button>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 py-4 text-center text-sm font-medium min-h-[48px] flex items-center justify-center ${
                  isActive
                    ? 'text-indigo-600 border-t-2 border-indigo-600 -mt-px'
                    : 'text-gray-500 border-t-2 border-transparent'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
