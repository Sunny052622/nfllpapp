import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id, name, role').order('name')
    setProfiles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  return { profiles, loading }
}
