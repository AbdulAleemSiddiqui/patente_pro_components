-- Migration: add license Category and Branch to users
-- Run in the Supabase SQL editor.
--
-- Client request (2026-09-23): students must carry a patente category
-- (AM/A1/A/B/B1 combined with M/A) and a branch when created or updated.
-- Existing rows stay NULL; the Users page enforces both values for
-- students going forward.

alter table public.users
  add column if not exists category text,
  add column if not exists branch text;

alter table public.users
  add constraint users_category_check
  check (category in ('AM-M', 'AM-A', 'A1-M', 'A1-A', 'A-M', 'B-M', 'B-A', 'B1-M', 'B1-A'));

alter table public.users
  add constraint users_branch_check
  check (branch in ('P', 'C'));
