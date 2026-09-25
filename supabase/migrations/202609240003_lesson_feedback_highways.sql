-- Migration: a lesson can cover multiple highway segments
-- Run in the Supabase SQL editor.
--
-- Client request (2026-09-23): the register-lesson form's single FROM/TO
-- highway pair becomes repeatable rows. Existing columns move into a
-- one-to-many table; feedback/ratings already cascade from lessons, and
-- this table cascades from lesson_feedback. Like the other app tables,
-- RLS stays off — tenant scoping is client-side.

create table if not exists public.lesson_feedback_highways (
  id uuid primary key default gen_random_uuid(),
  lesson_feedback_id uuid not null references public.lesson_feedback(id) on delete cascade,
  from_highway_id uuid references public.highways(id),
  to_highway_id uuid references public.highways(id),
  sort_order int not null default 0
);

-- Explicit constraint names: the nested PostgREST embed in api.js
-- disambiguates the two highways FKs by these names.
alter table public.lesson_feedback_highways
  add constraint lesson_feedback_highways_from_fkey
  foreign key (from_highway_id) references public.highways(id);

alter table public.lesson_feedback_highways
  add constraint lesson_feedback_highways_to_fkey
  foreign key (to_highway_id) references public.highways(id);

create index if not exists lesson_feedback_highways_feedback_idx
  on public.lesson_feedback_highways (lesson_feedback_id, sort_order);

-- Carry existing single From/To pairs over as the first segment
insert into public.lesson_feedback_highways (lesson_feedback_id, from_highway_id, to_highway_id, sort_order)
select id, from_highway_id, to_highway_id, 0
from public.lesson_feedback
where from_highway_id is not null or to_highway_id is not null;

alter table public.lesson_feedback
  drop column if exists from_highway_id,
  drop column if exists to_highway_id;
