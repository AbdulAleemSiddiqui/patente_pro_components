-- Migration: disable RLS on maneuvers
-- Run in the Supabase SQL editor.
--
-- Why: maneuvers still have RLS ON with jwt_tenant_id()/is_admin()-based policies,
-- which silently block reads/writes (jwt_tenant_id() returns null without custom JWT
-- claims). The Settings page needs to rename maneuvers (admin edit), and every page
-- (Log lesson, Progress, Students) reads the catalog. Consistent with the rest of the
-- app (RLS off, client-side scoping) — same fix already applied to the feedback tables
-- (202606270001) and tenants (202606280001).

alter table public.maneuvers disable row level security;