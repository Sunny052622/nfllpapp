-- ================================================================
-- NFLLP Expense Tracker — COMPLETE FRESH SETUP
-- Run this ONCE in a brand-new Supabase project SQL Editor.
-- Creates tables, users, profiles, and all permissions.
-- ================================================================

-- ============================================================
-- 0. ENABLE pgcrypto (needed for password hashing)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. AUTO-ENABLE RLS ON ALL NEW PUBLIC TABLES (event trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_enable_rls()
RETURNS event_trigger LANGUAGE plpgsql AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS auto_rls_on_create;
CREATE EVENT TRIGGER auto_rls_on_create
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE PROCEDURE public.auto_enable_rls();

-- ============================================================
-- 2. CLEAN UP (safe to run on empty project)
-- ============================================================
-- DROP TABLE CASCADE also removes all policies on those tables
DROP TABLE IF EXISTS entries   CASCADE;
DROP TABLE IF EXISTS profiles  CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- 2. TABLES
-- ============================================================

CREATE TABLE profiles (
  id         UUID REFERENCES auth.users PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  location        TEXT NOT NULL,
  monthly_salary  NUMERIC NOT NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  entered_by  UUID REFERENCES profiles(id),
  header      TEXT NOT NULL,
  location    TEXT NOT NULL,
  h1          TEXT,
  amount      NUMERIC NOT NULL,
  note        TEXT,
  employee_id INTEGER REFERENCES employees(id)
);

-- ============================================================
-- 3. ROW LEVEL SECURITY (all tables protected)
-- ============================================================
ALTER TABLE entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Profiles: any signed-in user can read all profiles
CREATE POLICY "All users read profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Employees: any signed-in user can read
CREATE POLICY "All authenticated users read employees" ON employees
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Entries: any user can read; only insert their own; admin has full access
CREATE POLICY "All users read entries" ON entries
  FOR SELECT USING (true);

CREATE POLICY "Users insert own entries" ON entries
  FOR INSERT WITH CHECK (entered_by = auth.uid());

CREATE POLICY "Admin full access entries" ON entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. API PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT                        ON public.profiles  TO anon, authenticated;
GRANT SELECT                        ON public.employees TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries  TO anon, authenticated;

-- ============================================================
-- 5. AUTO-CREATE PROFILE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 6. CREATE AUTH USERS (email + hashed password)
--    All users: password = 123456
-- ============================================================
DO $$
DECLARE
  uid_keshu   UUID := gen_random_uuid();
  uid_raja    UUID := gen_random_uuid();
  uid_tamasa  UUID := gen_random_uuid();
  uid_atish   UUID := gen_random_uuid();
  uid_lipsa   UUID := gen_random_uuid();
  uid_admin   UUID := gen_random_uuid();
  now_ts      TIMESTAMPTZ := NOW();
  pass_hash   TEXT := crypt('123456', gen_salt('bf'));
BEGIN

  -- Insert into auth.users
  INSERT INTO auth.users
    (id, instance_id, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data,
     aud, role, created_at, updated_at, confirmation_token, recovery_token)
  VALUES
    (uid_keshu,  '00000000-0000-0000-0000-000000000000', 'keshu@narprafoods.com',  pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Keshu"}'::jsonb,  'authenticated', 'authenticated', now_ts, now_ts, '', ''),
    (uid_raja,   '00000000-0000-0000-0000-000000000000', 'raja@narprafoods.com',   pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Raja"}'::jsonb,   'authenticated', 'authenticated', now_ts, now_ts, '', ''),
    (uid_tamasa, '00000000-0000-0000-0000-000000000000', 'tamasa@narprafoods.com', pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Tamasa"}'::jsonb, 'authenticated', 'authenticated', now_ts, now_ts, '', ''),
    (uid_atish,  '00000000-0000-0000-0000-000000000000', 'atish@narprafoods.com',  pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Atish"}'::jsonb,  'authenticated', 'authenticated', now_ts, now_ts, '', ''),
    (uid_lipsa,  '00000000-0000-0000-0000-000000000000', 'lipsa@narprafoods.com',  pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Lipsa"}'::jsonb,  'authenticated', 'authenticated', now_ts, now_ts, '', ''),
    (uid_admin,  '00000000-0000-0000-0000-000000000000', 'admin@narprafoods.com',  pass_hash, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Admin"}'::jsonb,  'authenticated', 'authenticated', now_ts, now_ts, '', '');

  -- Insert identities (required for email/password sign-in)
  INSERT INTO auth.identities
    (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  VALUES
    (uid_keshu,  uid_keshu,  jsonb_build_object('sub', uid_keshu::text,  'email', 'keshu@narprafoods.com'),  'email', 'keshu@narprafoods.com',  now_ts, now_ts, now_ts),
    (uid_raja,   uid_raja,   jsonb_build_object('sub', uid_raja::text,   'email', 'raja@narprafoods.com'),   'email', 'raja@narprafoods.com',   now_ts, now_ts, now_ts),
    (uid_tamasa, uid_tamasa, jsonb_build_object('sub', uid_tamasa::text, 'email', 'tamasa@narprafoods.com'), 'email', 'tamasa@narprafoods.com', now_ts, now_ts, now_ts),
    (uid_atish,  uid_atish,  jsonb_build_object('sub', uid_atish::text,  'email', 'atish@narprafoods.com'),  'email', 'atish@narprafoods.com',  now_ts, now_ts, now_ts),
    (uid_lipsa,  uid_lipsa,  jsonb_build_object('sub', uid_lipsa::text,  'email', 'lipsa@narprafoods.com'),  'email', 'lipsa@narprafoods.com',  now_ts, now_ts, now_ts),
    (uid_admin,  uid_admin,  jsonb_build_object('sub', uid_admin::text,  'email', 'admin@narprafoods.com'),  'email', 'admin@narprafoods.com',  now_ts, now_ts, now_ts);

END $$;

-- ============================================================
-- 7. PROFILES (trigger fires on INSERT above, but back-fill just in case)
-- ============================================================
INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
  'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  AND u.email LIKE '%@narprafoods.com';

-- Set admin role
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@narprafoods.com');

-- ============================================================
-- 8. EMPLOYEE SEED DATA
-- ============================================================
INSERT INTO employees (name, location, monthly_salary) VALUES
  ('Abhishek',  'Patia',   16000),
  ('Anju',      'BGU',     19000),
  ('Bhola',     'BGU',     14000),
  ('Kaman',     'KV',      18750),
  ('Keshu',     'KV',      16500),
  ('Lama',      'BGU',     25000),
  ('Milan',     'BGU',     11000),
  ('Milon',     'KV',      10000),
  ('Mili',      'BGU',     13000),
  ('Pikai',     'KV',      15000),
  ('Rajesh',    'KV',      13000),
  ('Sagar',     'BGU',     16500),
  ('Santosh',   'KV',      10000),
  ('Shardha',   'BGU',     17000),
  ('Sohanlal',  'Patia',   12850),
  ('Sujal',     'Cuttack', 14000),
  ('Sukhendhu', 'BGU',     13000),
  ('Suman',     'BGU',     13000),
  ('Suresh',    'Cuttack', 16500),
  ('Vikram',    'Patia',   14000);

-- ============================================================
-- 9. RELOAD POSTGREST CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE. Verify with:
--   SELECT email, role FROM auth.users u
--   JOIN public.profiles p ON p.id = u.id;
-- Expected: 5 x 'user', 1 x 'admin'
-- Login: username only (e.g. "keshu"), password "123456"
-- ============================================================
