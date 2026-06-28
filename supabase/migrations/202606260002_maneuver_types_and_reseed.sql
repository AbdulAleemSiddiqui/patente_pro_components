-- Migration: add maneuver_types parent table and re-seed maneuvers
-- Run in the Supabase SQL editor.
-- Tenant-agnostic: creates the structure and seeds data for every existing tenant.

-- ─── 1. maneuver_types parent table ──────────────────────────────────────────
create table if not exists public.maneuver_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  unique (tenant_id, name)
);

create index if not exists maneuver_types_tenant_idx on public.maneuver_types (tenant_id);

alter table public.maneuver_types enable row level security;

drop policy if exists "tenant members can read maneuver types" on public.maneuver_types;
create policy "tenant members can read maneuver types"
  on public.maneuver_types for select
  to authenticated
  using (tenant_id = public.jwt_tenant_id());

drop policy if exists "admins can manage maneuver types" on public.maneuver_types;
create policy "admins can manage maneuver types"
  on public.maneuver_types for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

-- ─── 2. Link maneuvers to their type ─────────────────────────────────────────
alter table public.maneuvers
  add column if not exists maneuver_type_id uuid references public.maneuver_types(id) on delete cascade;

create index if not exists maneuvers_type_idx on public.maneuvers (maneuver_type_id);

-- ─── 3. Remove old maneuver values (cascades to maneuver_ratings) ────────────
delete from public.maneuvers;

-- ─── 4. Seed types + maneuvers for every tenant ─────────────────────────────
with inserted_types as (
  insert into public.maneuver_types (tenant_id, name, order_index)
  select t.id, td.name, td.order_index
  from public.tenants t
  cross join (values
    ('FASE 1', 1),
    ('FASE 2', 2),
    ('PERCORSO URBANO', 3)
  ) as td(name, order_index)
  on conflict (tenant_id, name) do update set order_index = excluded.order_index
  returning id, tenant_id, name
)
insert into public.maneuvers (tenant_id, maneuver_type_id, name, order_index)
select mt.tenant_id, mt.id, md.name, md.order_index
from inserted_types mt
join (values
  ('FASE 1', 'PNEUMATICI', 1),
  ('FASE 1', 'SPIE', 2),
  ('FASE 1', 'LIVELLI', 3),
  ('FASE 1', 'LUCI', 4),
  ('FASE 1', 'STERZO', 5),

  ('FASE 2', 'INVERSIONE DI MARCIA', 1),
  ('FASE 2', 'RETROMARCIA', 2),
  ('FASE 2', 'PARCHEGGIO', 3),

  ('PERCORSO URBANO', 'ROTATORIA EXIT 1', 1),
  ('PERCORSO URBANO', 'ROTATORIA EXIT 2', 2),
  ('PERCORSO URBANO', 'ROTATORIA EXIT 3', 3),
  ('PERCORSO URBANO', 'ROTATORIA EXIT 4', 4),
  ('PERCORSO URBANO', 'STOP', 5),
  ('PERCORSO URBANO', 'DARE LA PRECEDENZA', 6),
  ('PERCORSO URBANO', 'PEDONI', 7),
  ('PERCORSO URBANO', 'SVOLTA A DESTRA (DX)', 8),
  ('PERCORSO URBANO', 'SVOLTA A SINISTRA (SX)', 9),
  ('PERCORSO URBANO', 'FROM Senso Unico TO Doppio Senso', 10)
) as md(type_name, name, order_index) on md.type_name = mt.name
on conflict (tenant_id, name) do update set
  maneuver_type_id = excluded.maneuver_type_id,
  order_index = excluded.order_index;
