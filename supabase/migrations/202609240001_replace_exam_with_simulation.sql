-- Migration: replace the 'exam' lesson kind with 'simulation'
-- Run in the Supabase SQL editor.
--
-- Client decision (2026-09-23): the lesson "Type" is either Lesson or
-- Simulation; 'exam' is retired. Existing exam rows are migrated, and the
-- Excel sync classifier (excel_sync/transform.py) now emits 'simulation'
-- for the same source rows, so re-runs keep matching the dedupe key
-- (teacher_id | student_id | scheduled_at | kind) and stay idempotent.

update public.lessons set kind = 'simulation' where kind = 'exam';

alter table public.lessons
  drop constraint if exists lessons_kind_check;

alter table public.lessons
  add constraint lessons_kind_check check (kind in (
    'lesson', 'simulation', 'theory', 'ferie', 'office', 'meeting',
    'medical', 'sick', 'group_lesson', 'shadowing', 'logistics',
    'autoservice', 'points_recovery', 'cqc', 'cqc_renewal', 'cqc_consult',
    'adr', 'dtt', 'note'
  ));
