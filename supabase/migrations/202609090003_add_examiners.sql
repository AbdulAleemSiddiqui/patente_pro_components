-- Migration: add examiners table (school-scoped examiner directory)
-- Run in the Supabase SQL editor.
--
-- Examiners are the (external) people who conduct the practical driving exam.
-- The only relation is the tenant (school) they belong to — intentionally no
-- FK to users or lessons. RLS is intentionally left off, consistent with the
-- rest of the app (client-side tenant scoping — see 202606270001/202606280001).

create table if not exists public.examiners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create index if not exists examiners_tenant_idx on public.examiners (tenant_id, name);