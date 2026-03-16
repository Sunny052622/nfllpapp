import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserPicker } from './pages/UserPicker'
import { EntryForm } from './pages/EntryForm'
import { SalarySheet } from './pages/SalarySheet'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminGate } from './components/AdminGate'
import { getUser } from './lib/userStore'

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-4">Please refresh the page or try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function RequireUser({ children }) {
  const user = getUser()
  if (!user) return <Navigate to="/pick-user" replace />
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/pick-user" element={<UserPicker />} />
          <Route path="/entry" element={<RequireUser><EntryForm /></RequireUser>} />
          <Route path="/salary" element={<RequireUser><SalarySheet /></RequireUser>} />
          <Route path="/admin" element={<RequireUser><AdminGate><AdminDashboard /></AdminGate></RequireUser>} />
          <Route path="/" element={<Navigate to="/entry" replace />} />
          <Route path="*" element={<Navigate to="/entry" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
