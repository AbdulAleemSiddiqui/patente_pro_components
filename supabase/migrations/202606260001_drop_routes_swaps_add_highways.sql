-- Migration: drop slot-swap + route types, add highways (Autostrada)
-- Run this in the Supabase SQL editor after the existing migrations.
-- Demo tenant id: 22222222-2222-2222-2222-222222222222

-- ─── 1. Drop slot-swap feature ───────────────────────────────────────────────
drop table if exists public.swap_requests cascade;
drop type if exists public.swap_status;

-- ─── 2. Remove route types / sub-route types ─────────────────────────────────
-- Drop FK columns on lesson_feedback first, then the route tables.
alter table public.lesson_feedback
  drop column if exists route_type_id,
  drop column if exists route_sub_type_id;

drop table if exists public.route_sub_types cascade;
drop table if exists public.route_types cascade;

-- ─── 3. Add highways (Autostrada) — tenant-scoped ────────────────────────────
create table public.highways (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create index highways_tenant_idx on public.highways (tenant_id);

alter table public.highways enable row level security;

create policy "tenant members can read highways"
  on public.highways for select
  to authenticated
  using (tenant_id = public.jwt_tenant_id());

create policy "admins can manage highways"
  on public.highways for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

-- ─── 4. Add optional highway FKs on lesson_feedback ──────────────────────────
alter table public.lesson_feedback
  add column if not exists from_highway_id uuid references public.highways(id) on delete set null,
  add column if not exists to_highway_id   uuid references public.highways(id) on delete set null;

-- ─── 5. Seed highways for every existing tenant ─────────────────────────────
-- Tenant-agnostic: populates the Genova list for all schools so the To/From
-- dropdowns are never empty regardless of the actual tenant id.
insert into public.highways (tenant_id, name)
select t.id, v.name
from public.tenants t
cross join (values
  ('GE EST'),
  ('GE OVEST'),
  ('GE NERVI'),
  ('Becco'),
  ('RAPALLO'),
  ('GE AEROPORTO'),
  ('GE BOLZANETO'),
  ('GE PEGLI')
) as v(name)
on conflict (tenant_id, name) do nothing;
