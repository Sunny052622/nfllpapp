-- =============================================================
-- FIX: "Database error querying schema" on login
-- Run this in Supabase SQL Editor if the full schema.sql was
-- already applied but login still fails.
-- =============================================================

-- 1. Ensure PostgREST can reach the public schema and all tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries   TO anon, authenticated;
GRANT SELECT ON public.employees TO anon, authenticated;

-- 2. Ensure the profiles trigger function exists and is correct
--    (re-creates it safely with CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.email, 'User')),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;   -- prevents duplicate-key errors on re-runs
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Back-fill profiles for auth users that were created BEFORE the trigger existed.
--    This is the most common cause of "profile not found" errors at login.
INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.email, 'User'),
  'user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 5. Make admin@narprafoods.com an admin (safe to re-run)
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@narprafoods.com')
  AND role != 'admin';

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Done. Try logging in again.
