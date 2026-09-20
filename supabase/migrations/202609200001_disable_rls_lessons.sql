-- Migration: disable RLS on lessons
-- Run in the Supabase SQL editor.
--
-- The lessons policies depend on jwt_tenant_id() — a top-level `tenant_id`
-- claim in the access token. Users created by the Excel sync (and any user
-- whose claims lack that field) silently match zero rows: the app's JS reads
-- tenant from user_metadata, but RLS reads it from the token claims, so
-- teachers/admins saw an empty lesson list.
--
-- This matches the existing pattern: feedback, tenants, maneuvers and
-- examiners already have RLS disabled; tenant scoping is client-side only.

alter table public.lessons disable row level security;
