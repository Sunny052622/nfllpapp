# Expense Tracker PWA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first PWA for internal expense tracking with 4 data-entry users, 1 admin, ~20 predefined row types, 12-month retention, and installable PWA support.

**Architecture:** React + Vite frontend with Tailwind CSS, Supabase (Auth + PostgreSQL + RLS) backend, Recharts for admin dashboard, react-day-picker for dates. Mobile-first entry form with bottom-sheet modals; desktop-first admin dashboard.

**Tech Stack:** React 18, Vite, Tailwind CSS, Supabase, Recharts, react-day-picker, vite-plugin-pwa, Vercel

---

## Phase 1: Project & Supabase Setup

### Task 1.1: Initialize Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`

**Steps:**
1. Run `npm create vite@latest . -- --template react` (or create manually)
2. Add dependencies: `npm install @supabase/supabase-js tailwindcss postcss autoprefixer recharts react-day-picker vite-plugin-pwa react-router-dom`
3. Add dev deps: `npm install -D tailwindcss postcss autoprefixer`
4. Run `npx tailwindcss init -p`
5. Configure Tailwind in `tailwind.config.js` with content paths
6. Add Tailwind directives to `src/index.css`

**Verify:** `npm run dev` starts without errors

---

### Task 1.2: Supabase project setup

**External (manual):**
1. Create Supabase project at supabase.com
2. Copy Project URL and anon key for `.env.local`

**Files:**
- Create: `.env.local` (add to .gitignore)
- Create: `.env.example` with placeholder vars

**Content `.env.example`:**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### Task 1.3: Run Supabase SQL schema

**External (Supabase SQL Editor):**
1. Run schema from spec: `profiles`, `employees`, `entries` tables
2. Run RLS policies
3. Run employee seed data (20 rows)

**Verify:** Tables exist in Supabase dashboard; RLS enabled

---

### Task 1.4: Create Supabase client & auth flow

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/components/ProtectedRoute.jsx`

**`src/lib/supabase.js`:**
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**ProtectedRoute:** Redirect to `/login` if not authenticated; check `profiles.role` for admin routes.

---

## Phase 2: Auth & Core Data

### Task 2.1: Login page

**Files:**
- Create: `src/pages/Login.jsx`
- Modify: `src/App.jsx` — add routes

**Spec:**
- Email + Password fields
- Sign In button
- On success: redirect to `/entry` (user) or `/admin` (admin) based on `profiles.role`
- Mobile-centered, clean form

**Note:** Create admin user manually in Supabase Auth + insert profile with `role='admin'`

---

### Task 2.2: Row master data

**Files:**
- Create: `src/data/rowMaster.js`

**Content:** Copy full `ROW_MASTER` array from spec (lines 124–218). All headers, locations, h1, salary, employeeName, requiresNote, isAdHoc.

---

### Task 2.3: Profiles trigger (optional but recommended)

**External (Supabase SQL):**
Create trigger to auto-insert profile on `auth.users` insert:
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'), 'user');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Phase 3: Layout & Entry Form

### Task 3.1: Layout component

**Files:**
- Create: `src/components/Layout.jsx`

**Spec:**
- Bottom nav: Entry | Salary Sheet | (Admin only: Dashboard)
- Header bar with app title
- Mobile-first, min 48px tap targets

---

### Task 3.2: Entry form — date bar

**Files:**
- Create: `src/pages/EntryForm.jsx`

**Spec:**
- Sticky date bar at top
- Format: `Sunday, 15 March 2026`
- Tap opens full-screen calendar (react-day-picker)
- Default: today; persist selected date in state

---

### Task 3.3: Entry form — sections & row list

**Files:**
- Modify: `src/pages/EntryForm.jsx`

**Spec:**
- Group rows by `header` into collapsible sections
- Section header: "Transport — ₹1,240" (today's total for that header)
- Sections expanded by default
- Each row: `[Location badge] [H1 label] [+ Add]` and `₹450 · 2 entries today`

---

### Task 3.4: Hooks — useEntries, useEmployees

**Files:**
- Create: `src/hooks/useEntries.js`
- Create: `src/hooks/useEmployees.js`

**useEntries:** Fetch entries (filter by date, optionally header/location), submit new entry, optimistic update
**useEmployees:** Fetch employees for salary/advance lookup

---

### Task 3.5: Bottom sheet modal — add entry

**Files:**
- Create: `src/components/AddEntryModal.jsx` (or inline in EntryForm)
- Modify: `src/pages/EntryForm.jsx`

**Spec:**
- Row label pre-filled, read-only
- Date pre-filled, editable
- Amount field: `inputMode="decimal"`, large, ₹ prefix
- Note field: only for Repairs (`requiresNote`), required
- Ad-hoc Advance: Name + Location inputs
- Submit: "Save Entry"
- On save: close modal, refresh row totals

---

### Task 3.6: Transport — multiple entries per day

**Logic:**
- No uniqueness constraint; allow multiple entries per (date, header, location, h1)
- Show cumulative total + count inline
- Optional: tap count to see mini-list of today's entries

---

### Task 3.7: Salary section (read-only)

**Files:**
- Modify: `src/pages/EntryForm.jsx` or create `src/components/SalarySection.jsx`

**Spec:**
- Table: Name | Location | Salary | Advances This Month | Balance
- Balance = Salary − advances (current month)
- Red if advances > salary, green otherwise
- Not editable

---

## Phase 4: Salary Sheet Page

### Task 4.1: Salary Sheet page

**Files:**
- Create: `src/pages/SalarySheet.jsx`
- Modify: `src/App.jsx`, `src/components/Layout.jsx`

**Spec:**
- Month selector (default: current month)
- Table: Employee | Location | Salary | Advances (this month) | Balance
- Color-coded balance
- Sortable by location or balance
- Admin: all months; user: current month only

---

## Phase 5: Admin Dashboard

### Task 5.1: Admin dashboard — filter bar

**Files:**
- Create: `src/pages/AdminDashboard.jsx`

**Spec:**
- Sticky filter bar: Date range (This Week/Month/Last Month/Last 3 Months/Custom), Header, Location, Entered by
- Apply / Reset buttons

---

### Task 5.2: Admin dashboard — KPI cards

**Spec:**
- 4 cards: Total Spend, Transport Total, Salary+Advances Total, Number of Entries
- Use filtered data

---

### Task 5.3: Admin dashboard — charts

**Spec (Recharts):**
1. Bar chart — Spend by Header
2. Line chart — Daily spend trend
3. Bar chart — Spend by Location
4. Pie chart — Category breakdown %

All responsive, tooltips with ₹ amounts.

---

### Task 5.4: Admin dashboard — data table

**Spec:**
- Columns: Date | Header | Location | H1 | Amount | Note | Entered By
- Paginated (20 rows)
- Sortable
- Search/filter bar
- Export to CSV (Papa Parse or manual)
- Delete entry with confirmation (admin only)

---

### Task 5.5: Admin dashboard — Salary Analysis tab

**Spec:**
- Month selector
- Table: Employee | Location | Salary | Total Advances | Balance
- Bar chart: Salary vs Advances per employee

---

## Phase 6: PWA & Polish

### Task 6.1: PWA configuration

**Files:**
- Modify: `vite.config.js`
- Create: `public/icon-192.png`, `public/icon-512.png` (or placeholders)

**vite.config.js:**
```js
import { VitePWA } from 'vite-plugin-pwa'
// ... existing config
plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Expense Tracker',
      short_name: 'ExpTracker',
      theme_color: '#1a1a2e',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    }
  })
]
```

---

### Task 6.2: UX polish

**Checklist:**
- [ ] Mobile-first vertical flow, min 48px tap targets
- [ ] `inputMode="decimal"` on amount inputs
- [ ] No horizontal scroll on mobile
- [ ] Bottom sheet modals for entry
- [ ] Sticky date bar
- [ ] Section totals visible when collapsed
- [ ] Loading states (skeleton loaders)
- [ ] Optimistic UI on save
- [ ] Error handling: toast on Supabase fail, keep form data

---

### Task 6.3: Deployment

**Steps:**
1. Push to GitHub
2. Connect repo to Vercel
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env
4. Deploy
5. Test PWA install on Android/iOS

---

## Execution Order Summary

| Phase | Tasks | Dependencies |
|-------|-------|--------------|
| 1 | 1.1–1.4 | None |
| 2 | 2.1–2.3 | Phase 1 |
| 3 | 3.1–3.7 | Phase 2 |
| 4 | 4.1 | Phase 3 |
| 5 | 5.1–5.5 | Phase 3 |
| 6 | 6.1–6.3 | Phases 1–5 |

---

## Key Files Reference

| Path | Purpose |
|------|---------|
| `src/lib/supabase.js` | Supabase client |
| `src/data/rowMaster.js` | Predefined row types |
| `src/hooks/useEntries.js` | Entry CRUD + filters |
| `src/hooks/useEmployees.js` | Employee + advance data |
| `src/pages/Login.jsx` | Auth |
| `src/pages/EntryForm.jsx` | Main data entry |
| `src/pages/SalarySheet.jsx` | Monthly salary summary |
| `src/pages/AdminDashboard.jsx` | Admin filters, charts, table |
| `src/components/Layout.jsx` | Nav + header |
| `src/components/ProtectedRoute.jsx` | Auth guard |

---

*Plan derived from `cursor_prompt_expense_pwa.md`*
