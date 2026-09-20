-- Migration: relax lessons constraints for the Excel sheet sync
-- Run in the Supabase SQL editor.
--
-- The sync-lessons edge function inserts rows derived from the GIORNALIERE
-- workbook (see excel_sync/). Three existing constraints reject those rows:
--
--   1. duration_minutes CHECK only allowed 30/45/50/60/90/120, but the
--      transform merges consecutive hours (180, 600, 720, ... minutes).
--   2. student_id was NOT NULL, but ferie/office/theory/exam rows have no
--      student. The FK still applies whenever a student IS set.
--   3. kind CHECK only allowed 'lesson'/'exam', but transform.py classifies
--      19 kinds (ferie, office, logistics, cqc, ...).

-- 1. Allow any positive duration (multiples of 60 come from merged hours)
alter table public.lessons
  drop constraint if exists lessons_duration_minutes_check;

alter table public.lessons
  add constraint lessons_duration_minutes_check check (duration_minutes > 0);

-- 2. Lessons without a student (vacation, office hours, theory, exams) are valid
alter table public.lessons
  alter column student_id drop not null;

-- 3. Accept every kind transform.py emits
alter table public.lessons
  drop constraint if exists lessons_kind_check;

alter table public.lessons
  add constraint lessons_kind_check check (kind in (
    'lesson', 'exam', 'theory', 'ferie', 'office', 'meeting', 'medical',
    'sick', 'group_lesson', 'shadowing', 'logistics', 'autoservice',
    'points_recovery', 'cqc', 'cqc_renewal', 'cqc_consult', 'adr', 'dtt',
    'note'
  ));
