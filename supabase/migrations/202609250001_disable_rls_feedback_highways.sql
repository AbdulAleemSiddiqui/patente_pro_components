-- Migration: disable RLS on lesson_feedback_highways
-- Run in the Supabase SQL editor.
--
-- Fixes feedback submission failing with 42501 ("new row violates
-- row-level security policy"). Newer Supabase projects enable RLS by
-- default on tables created via the SQL editor; this table was created
-- without policies, blocking all writes. Consistent with the rest of the
-- app (RLS off, client-side tenant scoping).

alter table public.lesson_feedback_highways disable row level security;
