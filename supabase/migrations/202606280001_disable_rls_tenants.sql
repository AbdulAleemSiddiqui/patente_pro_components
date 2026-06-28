-- Migration: disable RLS on tenants
-- Run in the Supabase SQL editor.
--
-- Why: tenants still had RLS ON with jwt_tenant_id()-based policies, which block
-- reads/writes (jwt_tenant_id() returns null without custom JWT claims). The Settings
-- page needs to read/update the tenant row (school name, logo_url, theme_color), and
-- the app reads it to show the school name/logo in the navbar/sidebar. Consistent with
-- the rest of the app (RLS off, client-side scoping). Tenants are addressed by their
-- primary key from the authenticated session's tenantId, so this is safe.

alter table public.tenants disable row level security;
