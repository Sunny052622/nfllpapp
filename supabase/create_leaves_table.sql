-- ================================================================
-- CREATE LEAVES TABLE
-- Run this in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS leaves (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type  TEXT NOT NULL CHECK (leave_type IN ('SL', 'ML')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INTEGER NOT NULL DEFAULT 1,
  note        TEXT,
  recorded_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS (matches rest of app)
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;

-- Grant access to anon role
GRANT ALL ON public.leaves TO anon;

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Done. The leaves table is ready.
