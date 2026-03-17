import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://qleahyzjntobmvwmdsvq.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZWFoeXpqbnRvYm12d21kc3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzU4MjAsImV4cCI6MjA4OTI1MTgyMH0.edxmBBDpHEndUlufe6zPAnU6ueidgWsMlSyHcJm1zRg'

export const supabase = createClient(url, anonKey)
