import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getUser } from '../lib/userStore'

export function useLeaves(month) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeaves = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setError(null)

    const [y, m] = month.split('-').map(Number)
    const startDate = new Date(y, m - 1, 1).toISOString().slice(0, 10)
    const endDate = new Date(y, m, 0).toISOString().slice(0, 10)

    const { data, error: err } = await supabase
      .from('leaves')
      .select('*')
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .order('start_date', { ascending: false })

    if (err) {
      setError(err.message)
      setLeaves([])
    } else {
      setLeaves(data ?? [])
    }
    setLoading(false)
  }, [month])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  const addLeave = useCallback(
    async (leave) => {
      const currentUser = getUser()
      if (!currentUser) return { error: 'No user selected' }

      const { error: err } = await supabase.from('leaves').insert({
        ...leave,
        recorded_by: currentUser,
      })

      if (err) return { error: err.message }
      await fetchLeaves()
      return { error: null }
    },
    [fetchLeaves]
  )

  const deleteLeave = useCallback(
    async (id) => {
      const { error: err } = await supabase.from('leaves').delete().eq('id', id)
      if (err) return { error: err.message }
      await fetchLeaves()
      return { error: null }
    },
    [fetchLeaves]
  )

  return { leaves, loading, error, addLeave, deleteLeave, refetch: fetchLeaves }
}
