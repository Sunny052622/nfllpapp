-- ================================================================
-- DISABLE AUTH: Remove RLS and change entered_by to text
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Disable RLS on all tables
ALTER TABLE entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all RLS policies
DROP POLICY IF EXISTS "Users insert own entries" ON entries;
DROP POLICY IF EXISTS "All users read entries" ON entries;
DROP POLICY IF EXISTS "Admin full access entries" ON entries;
DROP POLICY IF EXISTS "All users read profiles" ON profiles;
DROP POLICY IF EXISTS "All authenticated users read employees" ON employees;

-- 3. Change entered_by from UUID to TEXT
-- First drop the foreign key constraint
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_entered_by_fkey;

-- Change column type
ALTER TABLE entries ALTER COLUMN entered_by TYPE TEXT USING entered_by::TEXT;

-- 4. Grant full access to anon (no auth needed)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.entries TO anon;
GRANT ALL ON public.employees TO anon;
GRANT ALL ON public.profiles TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 5. Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Done. App no longer needs authentication.
