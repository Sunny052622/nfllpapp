# Manual User Setup (No SQL)

If you get "Database error querying schema", use this approach instead of SQL.

## Step 1: Create users in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Create each user:

| Email | Password | Name |
|-------|----------|------|
| tamasa1@narprafoods.com | 123456 | Tamasa1 |
| raja1@narprafoods.com | 123456 | Raja1 |
| keshu1@narprafoods.com | 123456 | Keshu1 |
| lipsa1@narprafoods.com | 123456 | Lipsa1 |
| admin@narprafoods.com | 123456 | Admin |

## Step 2: Set Admin role (SQL Editor — optional)

If the SQL Editor works, run this **short** query to make admin an admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@narprafoods.com', 'ceo@narprafoods.com')
);
```

If SQL Editor fails, you can still use the 4 regular users. Set admin later when SQL works.

## Step 3: Log in

Use `admin@narprafoods.com` / `123456` (or any user above).
