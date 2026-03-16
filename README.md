# Expense Tracker PWA

Mobile-first Progressive Web App for internal expense tracking.

## Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa
- **Hosting:** Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. **Seed users** (avoid running `seed-users.sql` — it causes "Database error querying schema"):
   - Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (from Dashboard → Settings → API)
   - Run: `npm run seed:users` to create users via Auth API
   - Users: tamasa1@, raja1@, keshu1@, lipsa1@, admin@narprafoods.com — password: 123456
   - If the script fails, create users manually: see `supabase/SETUP-USERS-MANUAL.md`

### 3. Environment

Copy `.env.example` to `.env.local` and add:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # for seed script only
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:5173

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env vars
4. Deploy

## PWA Icons

Replace `public/icon-192.png` and `public/icon-512.png` with your app icons for a better install experience.

## Project Structure

```
src/
  components/   Layout, ProtectedRoute
  pages/        Login, EntryForm, SalarySheet, AdminDashboard
  data/         rowMaster.js
  hooks/        useEntries, useEmployees, useProfiles
  lib/          supabase.js
```
