-- Migration: drop the teacher_availability system
-- Run in the Supabase SQL editor.
--
-- Client decision (2026-09-24): the school works the other way around —
-- every teacher is available 24/7 unless an absence (ferie/leave) is
-- entered as an engagement. Lesson creation only checks conflicting
-- engagements (any row in lessons). Nothing in the app reads
-- teacher_availability anymore; the table is removed entirely.

drop table if exists public.teacher_availability;
