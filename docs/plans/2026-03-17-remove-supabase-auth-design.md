# Remove Supabase Email Auth → Simple User Picker + Admin PIN

**Date:** 2026-03-17
**Status:** Approved

## Problem

Supabase email/password auth causes "Database error querying schema" due to PostgREST permission/cache issues. The auth layer is unnecessary for this internal expense tracker.

## Solution

Replace Supabase Auth with a simple user picker (no password) and a hardcoded PIN for admin dashboard access.

## User Flow

1. **First visit:** Two-button picker — Tamasa or Keshu. Tap → saved to localStorage → redirected to `/entry`.
2. **Return visits:** Reads name from localStorage, skips picker, goes to `/entry`.
3. **Switch user:** "Switch User" button in header returns to picker.
4. **Admin dashboard:** Tapping Dashboard prompts for 4-digit PIN (`1234`). Correct → access granted (remembered in localStorage). Wrong → stays on current page.

## Files to Delete

- `src/pages/Login.jsx`
- `src/pages/SetupDemo.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/data/demoCredentials.js`
- `src/hooks/useProfiles.js`

## Files to Create

- `src/pages/UserPicker.jsx` — two-button user selection screen
- `src/lib/userStore.js` — localStorage helpers: getUser(), setUser(), clearUser(), isAdminUnlocked(), setAdminUnlocked()
- `src/components/AdminGate.jsx` — PIN prompt wrapper for /admin route
- `src/data/users.js` — USERS = ['Tamasa', 'Keshu'], ADMIN_PIN = '1234'

## Files to Modify

- `src/App.jsx` — remove ProtectedRoute, add UserPicker route, AdminGate on /admin
- `src/components/Layout.jsx` — remove auth calls, add "Switch User" button, always show Dashboard nav
- `src/hooks/useEntries.js` — read user name from localStorage instead of supabase.auth.getUser()
- `src/lib/supabase.js` — keep as-is (still used for data)

## Database Changes

- Disable RLS on entries, employees, profiles tables
- `entered_by` column stores user name string ("Keshu", "Tamasa") instead of UUID
- Grant full access to anon role
- SQL script to run in Supabase SQL Editor

## Data Flow

```
UserPicker → localStorage.set('currentUser', 'Keshu')
EntryForm → reads localStorage → addEntry({ ..., entered_by: 'Keshu' })
Supabase entries table → entered_by = 'Keshu' (string)
AdminDashboard → AdminGate checks PIN → localStorage.set('adminUnlocked', true)
```
