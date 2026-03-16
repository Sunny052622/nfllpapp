import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getUser } from '../lib/userStore'

export function useEntries(filters = {}) {
  const { date, header, location, enteredBy, startDate, endDate } = filters
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase.from('entries').select('*').order('entry_date', { ascending: false })

    if (date) {
      query = query.eq('entry_date', date)
    }
    if (startDate) {
      query = query.gte('entry_date', startDate)
    }
    if (endDate) {
      query = query.lte('entry_date', endDate)
    }
    if (header) {
      query = query.eq('header', header)
    }
    if (location) {
      query = query.eq('location', location)
    }
    if (enteredBy) {
      query = query.eq('entered_by', enteredBy)
    }

    const { data, error: err } = await query
    if (err) {
      setError(err.message)
      setEntries([])
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [date, header, location, enteredBy, startDate, endDate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addEntry = useCallback(
    async (entry) => {
      const currentUser = getUser()
      if (!currentUser) return { error: 'No user selected' }

      const { error: err } = await supabase.from('entries').insert({
        ...entry,
        entered_by: currentUser,
        location: entry.location || '',
      })

      if (err) return { error: err.message }
      await fetchEntries()
      return { error: null }
    },
    [fetchEntries]
  )

  const deleteEntry = useCallback(
    async (id) => {
      const { error: err } = await supabase.from('entries').delete().eq('id', id)
      if (err) return { error: err.message }
      await fetchEntries()
      return { error: null }
    },
    [fetchEntries]
  )

  return { entries, loading, error, addEntry, deleteEntry, refetch: fetchEntries }
}
