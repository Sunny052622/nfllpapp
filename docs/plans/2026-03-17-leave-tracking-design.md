# Employee Leave Tracking Feature

**Date:** 2026-03-17
**Status:** Approved

## Problem

Need to track employee leaves (SL = Sick Leave, ML = Medical Leave) per month, including long leaves via date ranges.

## Solution

New "Leaves" page at `/leaves` showing all employees with monthly SL/ML counts and an add-leave modal supporting single-day and date-range entries.

## Page Layout

- Month selector dropdown (last 12 months, same pattern as SalarySheet)
- Employee table: Name | Location | SL | ML | Total | [+ Add]
- Sorted by location then name

## Add Leave Modal

- Employee: Pre-selected from row
- Leave type: SL or ML (radio toggle)
- Mode toggle: Single Day / Date Range
  - Single Day: date picker (default today)
  - Date Range: start + end date, auto-calculates days, editable days field for manual override
- Note: optional text
- Save button

## Database

New `leaves` table:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (gen_random_uuid) | Primary key |
| employee_id | INTEGER | FK -> employees.id |
| leave_type | TEXT | 'SL' or 'ML' |
| start_date | DATE | First day |
| end_date | DATE | Last day (= start for single day) |
| days | INTEGER | Leave days count |
| note | TEXT | Optional |
| recorded_by | TEXT | User name from localStorage |
| created_at | TIMESTAMPTZ | Auto |

## Files to Create

- `src/pages/Leaves.jsx` — main leaves page with table + modal
- `src/hooks/useLeaves.js` — CRUD hook for leaves table
- `supabase/create_leaves_table.sql` — SQL to create table + grants

## Files to Modify

- `src/App.jsx` — add /leaves route
- `src/components/Layout.jsx` — add Leaves to bottom nav

## Nav Order

Entry | Salary Sheet | Leaves | Dashboard
