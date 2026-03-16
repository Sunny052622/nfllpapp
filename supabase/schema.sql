-- Expense Tracker PWA — Schema only (NO auth.users inserts)
-- Run in Supabase SQL Editor.
-- Safe to run multiple times (drops and recreates).
-- Create users manually: Authentication → Users → Add user

-- ============================================
-- 0. CLEAN UP (if re-running)
-- ============================================
DROP POLICY IF EXISTS "Users insert own entries" ON entries;
DROP POLICY IF EXISTS "All users read entries" ON entries;
DROP POLICY IF EXISTS "Admin full access entries" ON entries;
DROP POLICY IF EXISTS "All users read profiles" ON profiles;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS employees;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 1. TABLES
-- ============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  monthly_salary NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  entered_by UUID REFERENCES profiles(id),
  header TEXT NOT NULL,
  location TEXT NOT NULL,
  h1 TEXT,
  amount NUMERIC NOT NULL,
  note TEXT,
  employee_id INTEGER REFERENCES employees(id)
);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users read profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users read employees" ON employees
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users insert own entries" ON entries
  FOR INSERT WITH CHECK (entered_by = auth.uid());

CREATE POLICY "All users read entries" ON entries
  FOR SELECT USING (true);

CREATE POLICY "Admin full access entries" ON entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. EMPLOYEE SEED DATA
-- ============================================
INSERT INTO employees (name, location, monthly_salary) VALUES
('Abhishek', 'Patia', 16000),
('Anju', 'BGU', 19000),
('Bhola', 'BGU', 14000),
('Kaman', 'KV', 18750),
('Keshu', 'KV', 16500),
('Lama', 'BGU', 25000),
('Milan', 'BGU', 11000),
('Milon', 'KV', 10000),
('Mili', 'BGU', 13000),
('Pikai', 'KV', 15000),
('Rajesh', 'KV', 13000),
('Sagar', 'BGU', 16500),
('Santosh', 'KV', 10000),
('Shardha', 'BGU', 17000),
('Sohanlal', 'Patia', 12850),
('Sujal', 'Cuttack', 14000),
('Sukhendhu', 'BGU', 13000),
('Suman', 'BGU', 13000),
('Suresh', 'Cuttack', 16500),
('Vikram', 'Patia', 14000);

-- ============================================
-- 4. PROFILES TRIGGER (auto-create profile on signup)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.email, 'User')),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 5. API PERMISSIONS (fixes "Database error querying schema" on login)
-- ============================================
-- PostgREST needs explicit grants to expose tables to the API.
-- If you already ran this schema before and see that error, run only this block in SQL Editor:
--   GRANT USAGE ON SCHEMA public TO anon, authenticated;
--   GRANT SELECT ON public.profiles TO anon, authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO anon, authenticated;
--   GRANT SELECT ON public.employees TO anon, authenticated;
--   NOTIFY pgrst, 'reload schema';
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO anon, authenticated;
GRANT SELECT ON public.employees TO anon, authenticated;
-- Tell PostgREST to reload schema cache so it sees the tables.
NOTIFY pgrst, 'reload schema';

-- ============================================
-- AFTER RUNNING THIS:
-- 1. Go to Authentication → Users → Add user
-- 2. Create each user — in Supabase use "email" = username@narprafoods.com, password = 123456:
--    keshu@narprafoods.com, raja@narprafoods.com, tamasa@narprafoods.com,
--    atish@narprafoods.com, lipsa@narprafoods.com, admin@narprafoods.com
-- 3. Users log in with USERNAME only (e.g. keshu) + password 123456
-- 4. Make admin an admin — run:
--    UPDATE profiles SET role = 'admin'
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@narprafoods.com');
-- ============================================
