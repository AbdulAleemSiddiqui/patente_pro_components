-- Migration: disable RLS on examiners
-- Run in the Supabase SQL editor.
--
-- Why: the examiners table can end up with RLS enabled (e.g. created via the
-- Supabase dashboard, which turns RLS on by default) with no workable policy —
-- jwt_tenant_id()-based policies can never pass because this app has no custom
-- JWT claims, so inserts fail with 42501 "new row violates row-level security
-- policy". Consistent with the rest of the app (RLS off, client-side tenant
-- scoping) — same fix already applied to the feedback tables (202606270001),
-- tenants (202606280001) and maneuvers (202609090001).

alter table public.examiners disable row level security;