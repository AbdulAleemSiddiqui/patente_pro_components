-- Migration: add kind column to lessons (lesson vs exam)
-- Run in the Supabase SQL editor.
--
-- A scheduled slot can be a regular lesson or an examination. Existing rows
-- default to 'lesson' so no backfill is needed.

alter table public.lessons
  add column if not exists kind text not null default 'lesson';

alter table public.lessons
  drop constraint if exists lessons_kind_check;

alter table public.lessons
  add constraint lessons_kind_check check (kind in ('lesson', 'exam'));