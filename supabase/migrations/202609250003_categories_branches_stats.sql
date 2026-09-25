-- Migration: categories & branches catalogs + server-side stats functions
-- Run in the Supabase SQL editor.
--
-- 1. Categories (patente) and Branches become tenant-managed catalogs with
--    colors (Settings page can add/delete). users.category / users.branch
--    keep storing the label text; their fixed CHECK constraints are dropped
--    so the catalogs can grow.
-- 2. Per-student progress and dashboard stats move into SQL functions so
--    the Progress and Database pages stop downloading every lesson with
--    its feedback payload (they were slow for that reason).

-- ─── 1. Catalog tables ───────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  color text not null default '#1a3a5c',
  created_at timestamptz not null default now(),
  unique (tenant_id, label)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  unique (tenant_id, label)
);

-- Explicit: some projects default new tables to RLS-enabled
alter table public.categories disable row level security;
alter table public.branches disable row level security;

create index if not exists categories_tenant_idx on public.categories (tenant_id);
create index if not exists branches_tenant_idx on public.branches (tenant_id);

-- Seed every tenant with the agreed starting values
insert into public.categories (tenant_id, label, color)
select t.id, c.label, c.color
from public.tenants t
cross join (values
  ('AM-M', '#1a3a5c'), ('AM-A', '#2563eb'), ('A1-M', '#0d9488'),
  ('A1-A', '#14b8a6'), ('A-M', '#7c3aed'), ('B-M', '#ea580c'),
  ('B-A', '#f97316'), ('B1-M', '#be185d'), ('B1-A', '#db2777')
) as c(label, color)
on conflict (tenant_id, label) do nothing;

insert into public.branches (tenant_id, label, color)
select t.id, b.label, b.color
from public.tenants t
cross join (values
  ('P', '#2563eb'),
  ('C', '#f97316')
) as b(label, color)
on conflict (tenant_id, label) do nothing;

-- Users keep free-text category/branch (validated against the catalogs in the UI)
alter table public.users drop constraint if exists users_category_check;
alter table public.users drop constraint if exists users_branch_check;

-- ─── 2. Per-student progress aggregates (Progress page) ─────────────────────
create or replace function public.get_student_progress(p_tenant uuid)
returns table (
  student_id uuid,
  total bigint,
  completed bigint,
  pending bigint,
  avg_rating numeric
)
language sql stable
as $$
  select
    l.student_id,
    count(*) filter (where l.status <> 'cancelled'),
    count(*) filter (where l.status = 'completed'),
    count(*) filter (where l.status = 'scheduled'),
    avg(case lf.general_rating
          when 'good' then 3
          when 'fair' then 2
          when 'poor' then 1
        end)
  from public.lessons l
  left join public.lesson_feedback lf on lf.lesson_id = l.id
  where l.tenant_id = p_tenant
    and l.student_id is not null
  group by l.student_id
$$;

-- ─── 3. Dashboard stats (Database page) ─────────────────────────────────────
-- p_day is the client's local date so "today" matches the user's calendar.
-- Times are compared in Europe/Rome — the school's timezone.
create or replace function public.get_dashboard_stats(p_tenant uuid, p_day date)
returns json
language sql stable
as $$
  select json_build_object(
    'lessons_today', (
      select count(*)
      from public.lessons l
      where l.tenant_id = p_tenant
        and (l.scheduled_at at time zone 'Europe/Rome')::date = p_day
    ),
    'completed_today', (
      select count(*)
      from public.lessons l
      where l.tenant_id = p_tenant
        and (l.scheduled_at at time zone 'Europe/Rome')::date = p_day
        and l.status = 'completed'
    ),
    'upcoming', (
      select coalesce(json_agg(json_build_object(
        'id', u.id, 'scheduled_at', u.scheduled_at, 'status', u.status, 'student', u.full_name
      )), '[]'::json)
      from (
        select l.id, l.scheduled_at, l.status, s.full_name
        from public.lessons l
        left join public.users s on s.id = l.student_id
        where l.tenant_id = p_tenant
          and l.status <> 'cancelled'
          and l.scheduled_at >= now()
        order by l.scheduled_at asc
        limit 4
      ) u
    ),
    'critical_areas', (
      select coalesce(json_agg(json_build_object('name', c.name, 'percent', c.percent)), '[]'::json)
      from (
        select m.name,
               round(((avg(case r.rating
                              when 'good' then 3
                              when 'fair' then 2
                              when 'poor' then 1
                            end) - 1) / 2) * 100)::int as percent
        from public.maneuver_ratings r
        join public.lesson_feedback lf on lf.id = r.lesson_feedback_id
        join public.lessons l on l.id = lf.lesson_id
        join public.maneuvers m on m.id = r.maneuver_id
        where l.tenant_id = p_tenant
        group by m.name
        having avg(case r.rating when 'good' then 3 when 'fair' then 2 when 'poor' then 1 end) is not null
        order by percent asc
        limit 5
      ) c
    )
  );
$$;
