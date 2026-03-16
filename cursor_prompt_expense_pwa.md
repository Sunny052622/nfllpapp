# Cursor Prompt — Expense Tracker PWA (Paste this entire prompt into Cursor)

---

## PROJECT OVERVIEW

Build a **mobile-first Progressive Web App (PWA)** for internal expense tracking. It has:
- **4 data-entry users** — all can enter all rows, all locations
- **1 admin user** — full dashboard with filters, charts, drill-down
- **~20 predefined row types** per entry session (Transport, Cylinder, Electricity, Repairs, Advance, Salary, Milk, Health, Stationery, Tickets, Wastage, Staff Benefits, BMC/Cleaners)
- **Multiple entries per day** are allowed for the same row
- **12 months data retention**
- **Auto date capture** with calendar picker
- **Salary is fixed / pre-filled** — users only enter Advance amounts; balance is auto-calculated
- **Installable** on Android and iOS from browser (PWA manifest + service worker)

---

## TECH STACK

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast, matches existing skills |
| Styling | Tailwind CSS | Mobile-first utility classes |
| PWA | vite-plugin-pwa | Service worker + manifest auto |
| Backend/DB | Supabase | Free tier: Auth + PostgreSQL + RLS |
| Charts | Recharts | Native React, responsive |
| Date picker | react-day-picker | Lightweight, mobile-friendly |
| Hosting | Vercel | Free, auto-deploy from GitHub |

---

## SUPABASE SETUP

### Tables

```sql
-- 1. Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  name text not null,
  role text check (role in ('user', 'admin')) default 'user',
  created_at timestamptz default now()
);

-- 2. Employees (salary master)
create table employees (
  id serial primary key,
  name text not null,
  location text not null,
  monthly_salary numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 3. Expense entries
create table entries (
  id uuid default gen_random_uuid() primary key,
  entry_date date not null default current_date,
  created_at timestamptz default now(),
  entered_by uuid references profiles(id),
  header text not null,         -- Transport, Cylinder, Electricity, etc.
  location text not null,       -- Patia, KV, BGU, Acropolis, Cuttack
  h1 text,                      -- Sub-category (Auto, Bike, Domestic, Anju, etc.)
  amount numeric not null,
  note text,                    -- Used for Repairs (description required)
  employee_id integer references employees(id)  -- for Advance rows
);

-- 4. Row Level Security
alter table entries enable row level security;
alter table profiles enable row level security;

-- Users can insert their own entries
create policy "Users insert own entries" on entries
  for insert with check (entered_by = auth.uid());

-- Users can read all entries (admin slicing needs this; filter in app)
create policy "All users read entries" on entries
  for select using (true);

-- Admin can update/delete
create policy "Admin full access" on entries
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
```

### Seed Data — Employees

```sql
insert into employees (name, location, monthly_salary) values
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
```

---

## PREDEFINED ROW MASTER

This is the full list of rows shown on the entry form. Store this as a constant in the app (`src/data/rowMaster.js`). Every row has: `header`, `location`, `h1`, and optional `salary` (for Salary rows) and `employee_id` lookup.

```js
// src/data/rowMaster.js
export const ROW_MASTER = [
  // TRANSPORT
  { header: 'Transport', location: 'Patia', h1: 'Auto' },
  { header: 'Transport', location: 'Patia', h1: 'Bike' },
  { header: 'Transport', location: 'Patia', h1: 'Petrol' },
  { header: 'Transport', location: 'KV', h1: 'Auto' },
  { header: 'Transport', location: 'KV', h1: 'Bike' },
  { header: 'Transport', location: 'KV', h1: 'Petrol' },
  { header: 'Transport', location: 'Acropolis', h1: 'Auto' },
  { header: 'Transport', location: 'Acropolis', h1: 'Bike' },
  { header: 'Transport', location: 'Acropolis', h1: 'Petrol' },
  { header: 'Transport', location: 'BGU', h1: 'Auto' },
  { header: 'Transport', location: 'BGU', h1: 'Bike' },
  { header: 'Transport', location: 'BGU', h1: 'Petrol' },
  { header: 'Transport', location: 'Cuttack', h1: 'Auto' },
  { header: 'Transport', location: 'Cuttack', h1: 'Bike' },
  { header: 'Transport', location: 'Cuttack', h1: 'Petrol' },
  // CYLINDER
  { header: 'Cylinder', location: 'Patia', h1: 'Domestic' },
  { header: 'Cylinder', location: 'Patia', h1: 'Cylinder' },
  { header: 'Cylinder', location: 'BGU', h1: 'Domestic' },
  { header: 'Cylinder', location: 'BGU', h1: 'Cylinder' },
  { header: 'Cylinder', location: 'KV', h1: 'Domestic' },
  { header: 'Cylinder', location: 'KV', h1: 'Cylinder' },
  { header: 'Cylinder', location: 'Cuttack', h1: 'Domestic' },
  { header: 'Cylinder', location: 'Cuttack', h1: 'Cylinder' },
  // ELECTRICITY
  { header: 'Electricity', location: 'Patia', h1: 'Shop' },
  { header: 'Electricity', location: 'Patia', h1: 'Home' },
  { header: 'Electricity', location: 'KV', h1: 'Shop' },
  { header: 'Electricity', location: 'KV', h1: 'Home' },
  { header: 'Electricity', location: 'BGU', h1: 'Shop' },
  { header: 'Electricity', location: 'BGU', h1: 'Home' },
  { header: 'Electricity', location: 'Acropolis', h1: 'Shop' },
  { header: 'Electricity', location: 'Acropolis', h1: 'Home' },
  // REPAIRS (note required, no fixed h1)
  { header: 'Repairs', location: 'Patia', h1: null, requiresNote: true },
  { header: 'Repairs', location: 'KV', h1: null, requiresNote: true },
  { header: 'Repairs', location: 'BGU', h1: null, requiresNote: true },
  { header: 'Repairs', location: 'Acropolis', h1: null, requiresNote: true },
  // ADVANCE (employee_id resolved at entry time)
  { header: 'Advance', location: 'Patia', h1: 'Abhishek', employeeName: 'Abhishek' },
  { header: 'Advance', location: 'BGU', h1: 'Anju', employeeName: 'Anju' },
  { header: 'Advance', location: 'BGU', h1: 'Bhola', employeeName: 'Bhola' },
  { header: 'Advance', location: 'KV', h1: 'Kaman', employeeName: 'Kaman' },
  { header: 'Advance', location: 'KV', h1: 'Keshu', employeeName: 'Keshu' },
  { header: 'Advance', location: 'BGU', h1: 'Lama', employeeName: 'Lama' },
  { header: 'Advance', location: 'BGU', h1: 'Milan', employeeName: 'Milan' },
  { header: 'Advance', location: 'KV', h1: 'Milon', employeeName: 'Milon' },
  { header: 'Advance', location: 'BGU', h1: 'Mili', employeeName: 'Mili' },
  { header: 'Advance', location: 'KV', h1: 'Pikai', employeeName: 'Pikai' },
  { header: 'Advance', location: 'KV', h1: 'Rajesh', employeeName: 'Rajesh' },
  { header: 'Advance', location: 'BGU', h1: 'Sagar', employeeName: 'Sagar' },
  { header: 'Advance', location: 'KV', h1: 'Santosh', employeeName: 'Santosh' },
  { header: 'Advance', location: 'BGU', h1: 'Shardha', employeeName: 'Shardha' },
  { header: 'Advance', location: 'Patia', h1: 'Sohanlal', employeeName: 'Sohanlal' },
  { header: 'Advance', location: 'Cuttack', h1: 'Sujal', employeeName: 'Sujal' },
  { header: 'Advance', location: 'BGU', h1: 'Sukhendhu', employeeName: 'Sukhendhu' },
  { header: 'Advance', location: 'BGU', h1: 'Suman', employeeName: 'Suman' },
  { header: 'Advance', location: 'Cuttack', h1: 'Suresh', employeeName: 'Suresh' },
  { header: 'Advance', location: 'Patia', h1: 'Vikram', employeeName: 'Vikram' },
  { header: 'Advance', location: null, h1: null, isAdHoc: true }, // ad-hoc: user types name + location
  // SALARY (pre-filled amount, read-only — shown for reference only, not entered)
  { header: 'Salary', location: 'Patia', h1: 'Abhishek', salary: 16000, employeeName: 'Abhishek' },
  { header: 'Salary', location: 'BGU', h1: 'Anju', salary: 19000, employeeName: 'Anju' },
  { header: 'Salary', location: 'BGU', h1: 'Bhola', salary: 14000, employeeName: 'Bhola' },
  { header: 'Salary', location: 'KV', h1: 'Kaman', salary: 18750, employeeName: 'Kaman' },
  { header: 'Salary', location: 'KV', h1: 'Keshu', salary: 16500, employeeName: 'Keshu' },
  { header: 'Salary', location: 'BGU', h1: 'Lama', salary: 25000, employeeName: 'Lama' },
  { header: 'Salary', location: 'BGU', h1: 'Milan', salary: 11000, employeeName: 'Milan' },
  { header: 'Salary', location: 'KV', h1: 'Milon', salary: 10000, employeeName: 'Milon' },
  { header: 'Salary', location: 'BGU', h1: 'Mili', salary: 13000, employeeName: 'Mili' },
  { header: 'Salary', location: 'KV', h1: 'Pikai', salary: 15000, employeeName: 'Pikai' },
  { header: 'Salary', location: 'KV', h1: 'Rajesh', salary: 13000, employeeName: 'Rajesh' },
  { header: 'Salary', location: 'BGU', h1: 'Sagar', salary: 16500, employeeName: 'Sagar' },
  { header: 'Salary', location: 'KV', h1: 'Santosh', salary: 10000, employeeName: 'Santosh' },
  { header: 'Salary', location: 'BGU', h1: 'Shardha', salary: 17000, employeeName: 'Shardha' },
  { header: 'Salary', location: 'Patia', h1: 'Sohanlal', salary: 12850, employeeName: 'Sohanlal' },
  { header: 'Salary', location: 'Cuttack', h1: 'Sujal', salary: 14000, employeeName: 'Sujal' },
  { header: 'Salary', location: 'BGU', h1: 'Sukhendhu', salary: 13000, employeeName: 'Sukhendhu' },
  { header: 'Salary', location: 'BGU', h1: 'Suman', salary: 13000, employeeName: 'Suman' },
  { header: 'Salary', location: 'Cuttack', h1: 'Suresh', salary: 16500, employeeName: 'Suresh' },
  { header: 'Salary', location: 'Patia', h1: 'Vikram', salary: 14000, employeeName: 'Vikram' },
  { header: 'Salary', location: null, h1: 'Others', salary: null }, // manual entry for others
  // MILK
  { header: 'Milk', location: 'BGU', h1: null },
  { header: 'Milk', location: 'Patia', h1: null },
  { header: 'Milk', location: 'KV', h1: null },
  { header: 'Milk', location: 'Cuttack', h1: null },
  // AS-AND-WHEN (single entry per occurrence, no fixed sub-category)
  { header: 'Health and Medicine', location: null, h1: null },
  { header: 'Stationery [Prints and Pins]', location: 'BGU', h1: null },
  { header: 'Stationery [Prints and Pins]', location: 'Patia', h1: null },
  { header: 'Stationery [Prints and Pins]', location: 'KV', h1: null },
  { header: 'Stationery [Prints and Pins]', location: 'Cuttack', h1: null },
  { header: 'Tickets', location: null, h1: null },
  { header: 'Wastage', location: null, h1: null },
  { header: 'Staff Benefits [Chappal etc.]', location: null, h1: null },
  { header: 'BMC/Cleaners', location: 'BGU', h1: null },
  { header: 'BMC/Cleaners', location: 'Patia', h1: null },
  { header: 'BMC/Cleaners', location: 'KV', h1: null },
  { header: 'BMC/Cleaners', location: 'Cuttack', h1: null },
];
```

---

## APP STRUCTURE

```
src/
  components/
    Layout.jsx            — bottom nav, header bar
    ProtectedRoute.jsx    — auth guard
  pages/
    Login.jsx             — email + password login
    EntryForm.jsx         — main data entry (user view)
    AdminDashboard.jsx    — charts + filters + table (admin view)
    SalarySheet.jsx       — salary + advance + balance per employee per month
  data/
    rowMaster.js          — the full row list above
  lib/
    supabase.js           — supabase client init
  hooks/
    useEntries.js         — fetch + submit entries
    useEmployees.js       — fetch employees + advances
  App.jsx
  main.jsx
```

---

## PAGE SPECIFICATIONS

### 1. LOGIN PAGE (`/login`)

- Clean mobile-centered form
- Email + Password fields
- "Sign In" button
- On success: redirect to `/entry` (user) or `/admin` (admin) based on profile.role
- No sign-up (admin creates users in Supabase dashboard)

---

### 2. ENTRY FORM (`/entry`) — MOBILE ONLY

This is the core user screen. Design for **vertical mobile use only** (max-width 480px centered).

#### Date Bar (top, sticky)
- Shows today's date by default: `Sunday, 15 March 2026`
- Tap to open a **calendar picker** (react-day-picker, full-screen modal on mobile)
- Date is **captured automatically** on open — user can change if entering for a past date
- Selected date is shown prominently and persists across the session

#### Entry Sections
Group rows by `header` into **collapsible sections**. Each section has:
- Section header with total for that header today (e.g. "Transport — ₹1,240")
- Rows listed vertically inside
- Sections are **expanded by default**

#### Each Row displays:
```
[Location badge] [H1 label]          [+ Add]
                                  ₹450 · 2 entries today
```

- Tapping **[+ Add]** opens a **bottom sheet modal** with:
  - Row label (pre-filled, read-only): e.g. "Transport · Patia · Auto"
  - Date (pre-filled from date bar, editable)
  - Amount field (numeric keyboard, large input, ₹ prefix)
  - Note field (only shown for Repairs rows — required)
  - For **ad-hoc Advance row**: also show Name + Location text inputs
  - Submit button: "Save Entry"
  - On save: closes modal, updates the row's running total shown inline

#### Salary Section (read-only display)
- Show each employee's: Name | Location | Salary | Advances This Month | **Balance**
- Balance = Salary − sum of all advances for that employee in current month
- **Balance shown in red if advances > salary**, green otherwise
- Not editable — purely informational

#### Transport rows — important UX note
- Multiple entries per day are expected (multiple trips)
- After saving one entry, the row shows: `₹150 · 1 entry` → `₹300 · 2 entries` etc.
- User can tap the count to see a mini-list of today's entries for that row

#### Bottom Navigation
- Entry | Salary Sheet | (Admin only: Dashboard)

---

### 3. SALARY SHEET (`/salary`) — accessible to all users

A simple monthly summary per employee:

| Employee | Location | Salary | Advances (this month) | Balance |
|---|---|---|---|---|
| Anju | BGU | ₹19,000 | ₹3,000 | ₹16,000 |

- Month selector at top (defaults to current month)
- Color-coded balance (red if negative)
- Sortable by location or balance
- Admin can see all months; regular users see current month only

---

### 4. ADMIN DASHBOARD (`/admin`) — desktop-first but responsive

#### Filter Bar (always visible, sticky top)
Filters:
- **Date range**: This Week / This Month / Last Month / Last 3 Months / Custom (date picker)
- **Header**: All / Transport / Cylinder / Electricity / Repairs / Advance / Salary / Milk / etc.
- **Location**: All / Patia / KV / BGU / Acropolis / Cuttack
- **Entered by**: All / [user names]
- Apply / Reset buttons

#### Summary Cards (top row)
4 KPI cards:
1. Total Spend (filtered period)
2. Transport Total
3. Salary + Advances Total
4. Number of Entries

#### Charts Section
1. **Bar chart** — Spend by Header category (filtered period)
2. **Line chart** — Daily spend trend (filtered period)
3. **Bar chart** — Spend by Location (filtered period)
4. **Pie chart** — Category breakdown %

All charts use Recharts, responsive, with tooltips showing ₹ amounts.

#### Data Table (bottom)
Full entries table with columns:
`Date | Header | Location | H1 | Amount | Note | Entered By`

- Paginated (20 rows per page)
- Sortable by any column
- Search/filter bar above table
- Export to CSV button (client-side, using Papa Parse or manual CSV generation)
- Admin can **delete** an entry (with confirmation dialog)

#### Salary Analysis Tab
- Month selector
- Table: Employee | Location | Salary | Total Advances | Balance
- Bar chart: Salary vs Advances per employee

---

## KEY BUSINESS LOGIC

### Advance Balance Calculation
```js
// For a given employee + month:
const advances = entries
  .filter(e => 
    e.header === 'Advance' && 
    e.employee_id === emp.id &&
    isSameMonth(e.entry_date, selectedMonth)
  )
  .reduce((sum, e) => sum + e.amount, 0);

const balance = emp.monthly_salary - advances;
```

### Transport — Multiple Entries Per Day
- No uniqueness constraint on (date, header, location, h1)
- Show cumulative total + count inline on the form row
- Individual entries visible in drill-down

### Repairs — Note Required
- If `row.requiresNote === true`, the note field is required before saving
- Validate before submit

### Ad-hoc Advance
- User fills: Name (text), Location (dropdown), Amount
- Saved with header='Advance', h1=name, location=location, employee_id=null
- Does NOT link to salary calculation (no employee record)

---

## PWA CONFIGURATION

In `vite.config.js`:
```js
import { VitePWA } from 'vite-plugin-pwa'

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
```

---

## ENVIRONMENT VARIABLES

Create `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## UX PRINCIPLES (enforce these throughout)

1. **Mobile-first vertical flow** — entry form is single column, large tap targets (min 48px height)
2. **Numeric keyboard** — all amount inputs use `inputMode="decimal"`
3. **No horizontal scrolling** on mobile
4. **Bottom sheet modals** for entry (not full page navigation)
5. **Sticky date bar** — always visible, always clear what date you're entering for
6. **Section totals** visible without scrolling — collapsed sections still show today's total
7. **Salary rows are visual only** on entry form — no input, just a glanceable balance
8. **Loading states** on all async operations (skeleton loaders, not spinners)
9. **Optimistic UI** — show entry immediately after save, sync in background
10. **Error handling** — if Supabase save fails, show toast + keep data in form

---

## DEPLOYMENT

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy — auto HTTPS, works as PWA on mobile

---

## WHAT TO BUILD FIRST (suggested order)

1. Supabase project setup + run SQL above
2. `src/lib/supabase.js` + auth flow + Login page
3. `rowMaster.js` data file
4. Entry Form — date bar + sections + bottom sheet modal
5. Salary section (read-only balance view)
6. Admin Dashboard — filters + KPI cards + charts
7. Admin data table + CSV export
8. Salary Sheet page
9. PWA manifest + service worker
10. Test on real Android/iOS device

---

*End of prompt. Paste entirely into Cursor Composer (Cmd+I) and say: "Build this step by step, starting with step 1."*
