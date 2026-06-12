-- Ensure admin user exists in public.users
-- This migration handles the case where auth.users exists but public.users doesn't

-- First, check if the admin auth user exists and create/update their public.users entry
-- Replace 'abdulaleem.extra@gmail.com' with your actual admin email if different

with admin_user as (
  select
    id,
    email,
    coalesce(raw_user_meta_data ->> 'full_name', 'Admin User') as full_name,
    coalesce(raw_user_meta_data ->> 'role', 'admin')::public.user_role as role
  from auth.users
  where email = 'abdulaleem.extra@gmail.com'
  limit 1
),
tenant as (
  select id as tenant_id
  from public.tenants
  limit 1
)
insert into public.users (id, tenant_id, role, full_name, email, is_active)
select
  au.id,
  t.tenant_id,
  au.role,
  au.full_name,
  au.email,
  true
from admin_user au
cross join tenant t
on conflict (id) do update
set
  tenant_id = excluded.tenant_id,
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  is_active = excluded.is_active;
