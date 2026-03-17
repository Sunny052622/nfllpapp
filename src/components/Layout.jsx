import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../lib/userStore'

export function Layout({ children }) {
  const navigate = useNavigate()
  const currentUser = getUser()

  const handleSwitchUser = () => {
    clearUser()
    navigate('/pick-user')
  }

  const navItems = [
    { to: '/entry', label: 'Entry', icon: '📝' },
    { to: '/salary', label: 'Salary', icon: '💰' },
    { to: '/leaves', label: 'Leaves', icon: '📅' },
    { to: '/admin', label: 'Admin', icon: '⚙️' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Compact header */}
      <header className="shrink-0 bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold">NFLLP</h1>
          {currentUser && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{currentUser}</span>
          )}
        </div>
        <button
          onClick={handleSwitchUser}
          className="text-xs text-white/80 hover:text-white px-2 py-1"
        >
          Switch
        </button>
      </header>

      {/* Main content - fills remaining space and scrolls */}
      <main className="flex-1 overflow-auto scroll-hide">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="shrink-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-[10px] font-medium ${
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-400'
                }`
              }
            >
              <span className="text-lg leading-none mb-0.5">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
