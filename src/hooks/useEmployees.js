import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('employees')
      .select('*')
      .eq('active', true)
      .order('name')

    if (err) {
      setError(err.message)
      setEmployees([])
    } else {
      setEmployees(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return { employees, loading, error, refetch: fetchEmployees }
}
