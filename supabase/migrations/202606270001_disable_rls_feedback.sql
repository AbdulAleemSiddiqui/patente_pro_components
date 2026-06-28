-- Migration: disable RLS on lesson feedback tables
-- Run in the Supabase SQL editor.
--
-- Why: the Progress page nests lesson_feedback / maneuver_ratings under lessons.
-- Those tables still had RLS ON with jwt_tenant_id()-based policies, which silently
-- filtered out rows (jwt_tenant_id() returns null without custom JWT claims), so the
-- nested feedback came back empty even for logged lessons. This matches the rest of
-- the app, where RLS is off and tenant scoping is done client-side through lessons
-- (which are tenant-scoped), so feedback is only ever read for already-visible lessons.

alter table public.lesson_feedback disable row level security;
alter table public.maneuver_ratings disable row level security;
alter table public.lesson_feedback_error_tags disable row level security;
