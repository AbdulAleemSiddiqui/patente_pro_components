# Supabase Setup

The app now has Supabase client wiring and an initial SQL migration, but it is not connected to a live database until project credentials are added.

## 1. Create Supabase Project

Create a hosted Supabase project for the MVP pilot.

## 2. Add Environment Variables

Create `.env.local` from `.env.example`:

```txt
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Do not commit `.env.local`.

## 3. Run Initial Schema

Run this SQL migration in Supabase:

```txt
supabase/migrations/202606060001_initial_schema.sql
```

You can run it through the Supabase SQL editor or the Supabase CLI.

## 4. Configure Auth Claims

Each authenticated user needs JWT claims:

```json
{
  "role": "admin",
  "tenant_id": "tenant-uuid"
}
```

Valid roles:

- `admin`
- `teacher`
- `student`

The RLS policies depend on these claims.

## 5. Current Frontend Status

- Supabase client exists in `src/lib/supabase.js`.
- Auth helpers exist in `src/lib/auth.js`.
- Data helpers exist in `src/lib/api.js`.
- UI still uses mock data until screens are explicitly switched to backend queries.

## 6. Recommended Next Step

Seed one tenant, city, admin user profile, teachers, students, routes, maneuvers, and error tags. Then replace the mock data in the Admin pages with calls from `src/lib/api.js`.
