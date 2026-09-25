-- Prune teachers down to the 9 real ones (client decision, 2026-09-23)
-- Run in the Supabase SQL editor. DESTRUCTIVE — read every step first.
--
-- The 9 client listed were: ALBERTO, ANREA (likely ANDREA), PINO, PAOLO,
-- AURORA, GABRALE (likely GABRIELE), NICOLA, GIORGIO, LINO — but the
-- spellings in the users table may differ (full names, accents). Step 1
-- shows you every teacher with their lesson counts; Step 2's keep-list
-- below MUST be corrected to those exact spellings before running.
--
-- Order matters: lessons.teacher_id has no ON DELETE cascade, so their
-- lessons are deleted first (the client confirmed: delete those lessons,
-- don't reassign). Deleting the auth.users row then cascades the
-- public.users profile and teacher_availability away.

-- ── STEP 1: REVIEW — who is a teacher, and how many lessons would go? ────
select
  u.id,
  u.full_name,
  u.email,
  u.is_active,
  u.created_at,
  (select count(*) from public.lessons l where l.teacher_id = u.id) as lesson_count
from public.users u
where u.role = 'teacher'
order by u.full_name;

-- ── STEP 2: DELETE — edit the keep-list to the EXACT spellings from
--    Step 1, then run this block. Everything else is removed.
--
-- begin;  -- optional: wrap in a transaction and inspect before commit
--
-- create temp table keep_teachers on commit drop as
-- select id from public.users
-- where role = 'teacher'
--   and full_name in (
--     'ALBERTO', 'ANDREA', 'PINO', 'PAOLO', 'AURORA',
--     'GABRIELE', 'NICOLA', 'GIORGIO', 'LINO'
--   );
--
-- -- sanity check: must list exactly the 9 (or fewer if some don't exist yet)
-- select full_name from public.users where id in (select id from keep_teachers);
--
-- delete from public.lessons
-- where teacher_id in (
--   select id from public.users
--   where role = 'teacher' and id not in (select id from keep_teachers)
-- );
--
-- delete from auth.users
-- where id in (
--   select id from public.users
--   where role = 'teacher' and id not in (select id from keep_teachers)
-- );
--
-- commit;
