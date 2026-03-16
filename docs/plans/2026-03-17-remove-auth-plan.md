# Remove Supabase Auth → User Picker + Admin PIN

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Supabase email/password auth with a simple user picker (Tamasa, Keshu) and a hardcoded PIN for admin dashboard access.

**Architecture:** Remove all `supabase.auth.*` calls. User identity is a name string stored in localStorage. Entries store the user name directly in `entered_by` (string, not UUID). Admin dashboard is gated by a 4-digit PIN prompt. Supabase is kept for data storage only, with RLS disabled.

**Tech Stack:** React 18, Vite, Supabase (data only, no auth), localStorage

---

### Task 1: Create user config and localStorage helpers

**Files:**
- Create: `src/data/users.js`
- Create: `src/lib/userStore.js`

**Step 1: Create `src/data/users.js`**

```js
export const USERS = ['Tamasa', 'Keshu']
export const ADMIN_PIN = '1234'
```

**Step 2: Create `src/lib/userStore.js`**

```js
const USER_KEY = 'currentUser'
const ADMIN_KEY = 'adminUnlocked'

export function getUser() {
  return localStorage.getItem(USER_KEY)
}

export function setUser(name) {
  localStorage.setItem(USER_KEY, name)
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

export function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function setAdminUnlocked() {
  localStorage.setItem(ADMIN_KEY, 'true')
}
```

**Step 3: Commit**

```bash
git add src/data/users.js src/lib/userStore.js
git commit -m "feat: add user config and localStorage helpers"
```

---

### Task 2: Create UserPicker page

**Files:**
- Create: `src/pages/UserPicker.jsx`

**Step 1: Create `src/pages/UserPicker.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { USERS } from '../data/users'
import { setUser } from '../lib/userStore'

export function UserPicker() {
  const navigate = useNavigate()

  const handlePick = (name) => {
    setUser(name)
    navigate('/entry', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Expense Tracker
        </h1>
        <p className="text-gray-500 text-center mb-8">Who is entering today?</p>
        <div className="space-y-3">
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => handlePick(name)}
              className="w-full py-4 px-6 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[56px]"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/UserPicker.jsx
git commit -m "feat: add UserPicker page"
```

---

### Task 3: Create AdminGate component

**Files:**
- Create: `src/components/AdminGate.jsx`

**Step 1: Create `src/components/AdminGate.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_PIN } from '../data/users'
import { isAdminUnlocked, setAdminUnlocked } from '../lib/userStore'

export function AdminGate({ children }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked())
  const navigate = useNavigate()

  if (unlocked) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setAdminUnlocked()
      setUnlocked(true)
    } else {
      setError('Wrong PIN')
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 text-center mb-6">Enter PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError('') }}
            placeholder="4-digit PIN"
            className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 min-h-[48px]"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={() => navigate('/entry')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Entry
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/AdminGate.jsx
git commit -m "feat: add AdminGate PIN component"
```

---

### Task 4: Rewire App.jsx routing

**Files:**
- Modify: `src/App.jsx`

**Step 1: Replace routing**

Remove: imports for `ProtectedRoute`, `Login`, `SetupDemo`
Add: imports for `UserPicker`, `AdminGate`
Replace all routes:

```jsx
import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserPicker } from './pages/UserPicker'
import { EntryForm } from './pages/EntryForm'
import { SalarySheet } from './pages/SalarySheet'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminGate } from './components/AdminGate'
import { getUser } from './lib/userStore'

// ... ErrorBoundary stays the same ...

function RequireUser({ children }) {
  const user = getUser()
  if (!user) return <Navigate to="/pick-user" replace />
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/pick-user" element={<UserPicker />} />
          <Route path="/entry" element={<RequireUser><EntryForm /></RequireUser>} />
          <Route path="/salary" element={<RequireUser><SalarySheet /></RequireUser>} />
          <Route path="/admin" element={<RequireUser><AdminGate><AdminDashboard /></AdminGate></RequireUser>} />
          <Route path="/" element={<Navigate to="/entry" replace />} />
          <Route path="*" element={<Navigate to="/entry" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
```

**Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: rewire routing to UserPicker + AdminGate"
```

---

### Task 5: Update Layout.jsx — remove auth, add Switch User

**Files:**
- Modify: `src/components/Layout.jsx`

**Step 1: Replace entire Layout.jsx**

Remove all `supabase.auth` calls. Replace Sign Out with Switch User. Always show Dashboard nav link.

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../lib/userStore'

export function Layout({ children }) {
  const navigate = useNavigate()
  const currentUser = getUser()

  const handleSwitchUser = () => {
    clearUser()
    navigate('/pick-user')
  }

  const navItems = [
    { to: '/entry', label: 'Entry' },
    { to: '/salary', label: 'Salary Sheet' },
    { to: '/admin', label: 'Dashboard' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Expense Tracker
          {currentUser && <span className="text-sm font-normal text-gray-500 ml-2">({currentUser})</span>}
        </h1>
        <button
          onClick={handleSwitchUser}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Switch User
        </button>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 py-4 text-center text-sm font-medium min-h-[48px] flex items-center justify-center ${
                  isActive
                    ? 'text-indigo-600 border-t-2 border-indigo-600 -mt-px'
                    : 'text-gray-500 border-t-2 border-transparent'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/Layout.jsx
git commit -m "feat: replace auth with Switch User in Layout"
```

---

### Task 6: Update useEntries.js — use localStorage user name

**Files:**
- Modify: `src/hooks/useEntries.js`

**Step 1: Replace `addEntry` to use localStorage**

Change the `addEntry` function. Remove `supabase.auth.getUser()` call. Read user name from `userStore` instead.

Old code (lines 49-65):
```js
  const addEntry = useCallback(
    async (entry) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { error: err } = await supabase.from('entries').insert({
        ...entry,
        entered_by: user.id,
        location: entry.location || '',
      })
```

New code:
```js
  const addEntry = useCallback(
    async (entry) => {
      const currentUser = getUser()
      if (!currentUser) return { error: 'No user selected' }

      const { error: err } = await supabase.from('entries').insert({
        ...entry,
        entered_by: currentUser,
        location: entry.location || '',
      })
```

Add import at top: `import { getUser } from '../lib/userStore'`

**Step 2: Commit**

```bash
git add src/hooks/useEntries.js
git commit -m "feat: useEntries reads user name from localStorage"
```

---

### Task 7: Update AdminDashboard.jsx — remove useProfiles, use name directly

**Files:**
- Modify: `src/pages/AdminDashboard.jsx`

**Step 1: Remove useProfiles import and usage**

Remove line 20: `import { useProfiles } from '../hooks/useProfiles'`
Remove line 100: `const { profiles } = useProfiles()`
Remove lines 117-121 (profileMap):
```js
  const profileMap = useMemo(() => {
    const m = {}
    for (const p of profiles) m[p.id] = p.name
    return m
  }, [profiles])
```

**Step 2: Update "Entered by" filter**

Replace the "Entered by" filter dropdown (lines 324-338) — change from profiles dropdown to just show USERS:

Add import at top: `import { USERS } from '../data/users'`

Old:
```jsx
<select value={enteredByFilter} onChange={(e) => setEnteredByFilter(e.target.value)} ...>
  <option value="">All</option>
  {profiles.map((p) => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
</select>
```

New:
```jsx
<select value={enteredByFilter} onChange={(e) => setEnteredByFilter(e.target.value)} ...>
  <option value="">All</option>
  {USERS.map((name) => (
    <option key={name} value={name}>{name}</option>
  ))}
</select>
```

**Step 3: Update table cell display**

Replace line 518: `<td className="px-4 py-2">{profileMap[e.entered_by] ?? '-'}</td>`
With: `<td className="px-4 py-2">{e.entered_by || '-'}</td>`

**Step 4: Update CSV export**

Replace lines 229-231:
```js
    const rows = filteredEntries.map((e) => ({
      ...e,
      entered_by: profileMap[e.entered_by] ?? e.entered_by,
    }))
```
With:
```js
    const rows = [...filteredEntries]
```

**Step 5: Commit**

```bash
git add src/pages/AdminDashboard.jsx
git commit -m "feat: AdminDashboard uses name strings, remove useProfiles"
```

---

### Task 8: Update SalarySheet.jsx — remove auth calls

**Files:**
- Modify: `src/pages/SalarySheet.jsx`

**Step 1: Remove all auth code**

Remove import: `import { supabase } from '../lib/supabase'`
Remove state: `const [profile, setProfile] = useState(null)`
Remove the entire `useEffect` that calls `supabase.auth.getUser()` (lines 24-38)
Remove: `const isAdmin = profile?.role === 'admin'`

Change `monthOptions` to always show 12 months (since admin gating is now via PIN, anyone who reaches salary sheet can see all months):

Replace:
```js
const limit = isAdmin ? 12 : 1
```
With:
```js
const limit = 12
```

Remove `useState` import if no longer needed (still needed for `selectedMonth`).
Remove `supabase` import entirely.

**Step 2: Commit**

```bash
git add src/pages/SalarySheet.jsx
git commit -m "feat: SalarySheet remove auth, show all months"
```

---

### Task 9: Delete old auth files

**Files:**
- Delete: `src/pages/Login.jsx`
- Delete: `src/pages/SetupDemo.jsx`
- Delete: `src/components/ProtectedRoute.jsx`
- Delete: `src/data/demoCredentials.js`
- Delete: `src/hooks/useProfiles.js`

**Step 1: Delete files**

```bash
rm src/pages/Login.jsx src/pages/SetupDemo.jsx src/components/ProtectedRoute.jsx src/data/demoCredentials.js src/hooks/useProfiles.js
```

**Step 2: Commit**

```bash
git add -u
git commit -m "chore: delete old auth files (Login, ProtectedRoute, useProfiles, demoCredentials)"
```

---

### Task 10: Update Supabase database — disable RLS, change entered_by type

**Files:**
- Create: `supabase/disable_auth.sql`

**Step 1: Create SQL migration**

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/disable_auth.sql
git commit -m "feat: add SQL to disable RLS and change entered_by to text"
```

---

### Task 11: Build and verify

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Run dev server and test**

```bash
npm run dev
```

Test:
1. Open http://localhost:5173 → should redirect to `/pick-user`
2. Click "Tamasa" → should go to `/entry` with "Tamasa" in header
3. Add an entry → should save with `entered_by: 'Tamasa'`
4. Click "Dashboard" in nav → should show PIN prompt
5. Enter `1234` → should unlock admin dashboard
6. Click "Switch User" → should go back to picker

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete auth removal — user picker + admin PIN"
```
