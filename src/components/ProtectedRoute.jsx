import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Protects routes that require authentication.
 * Redirects to /login if not authenticated.
 * For admin-only routes, pass adminOnly={true} and it will redirect non-admins to /entry.
 */
export function ProtectedRoute({ children, adminOnly = false }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single()
          setProfile(profileData)
        }
      } catch (err) {
        console.error('ProtectedRoute init error:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data))
          .catch(() => setProfile(null))
      } else {
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/entry" replace />
  }

  return children
}
