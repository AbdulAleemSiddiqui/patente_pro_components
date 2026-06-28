-- Seed demo data for PatentePro
-- This file should be run after 202606060001_initial_schema.sql

-- Clear demo city data so this seed can be rerun safely
truncate table public.cities cascade;

-- Insert demo city
insert into public.cities (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Milan')
on conflict (name) do nothing;

-- Clear demo tenant data so this seed can be rerun safely
truncate table public.tenants cascade;

-- Insert demo tenant (school)
insert into public.tenants (id, name, city_id, theme_color) values
  ('22222222-2222-2222-2222-222222222222', 'PatentePro Demo School', '11111111-1111-1111-1111-111111111111', '#1a3a5c')
on conflict do nothing;

-- Clear demo route types so this seed can be rerun safely
truncate table public.route_types cascade;

-- Insert demo route types for Milan
insert into public.route_types (id, city_id, name, requires_sub_selection) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'City driving', true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Highway driving', false),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Extra-urban', true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Parking', false),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'Roundabout practice', false)
on conflict do nothing;

-- Clear demo route subtypes so this seed can be rerun safely
truncate table public.route_sub_types cascade;

-- Insert demo route sub-types for City driving
insert into public.route_sub_types (id, route_type_id, label) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'Downtown'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 'Residential'),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', 'Hills'),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333303', 'Rural')
on conflict do nothing;

-- Clear demo maneuvers so this seed can be rerun safely
truncate table public.maneuvers cascade;

-- Insert demo maneuvers
insert into public.maneuvers (id, tenant_id, name, order_index) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222222', 'Seat and mirror adjustment', 1),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222222', 'Correct clutch and brake use', 2),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222222', 'Hill start with parking brake', 3),
  ('55555555-5555-5555-5555-555555555504', '22222222-2222-2222-2222-222222222222', 'Smooth gear changes', 4),
  ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222222', 'Parallel parking on street', 5),
  ('55555555-5555-5555-5555-555555555506', '22222222-2222-2222-2222-222222222222', 'Angled parking', 6),
  ('55555555-5555-5555-5555-555555555507', '22222222-2222-2222-2222-222222222222', 'Perpendicular parking', 7),
  ('55555555-5555-5555-5555-555555555508', '22222222-2222-2222-2222-222222222222', 'U-turn on two-way road', 8),
  ('55555555-5555-5555-5555-555555555509', '22222222-2222-2222-2222-222222222222', 'Right and left turns at intersections', 9),
  ('55555555-5555-5555-5555-555555555510', '22222222-2222-2222-2222-222222222222', 'Overtake slow vehicle', 10),
  ('55555555-5555-5555-5555-555555555511', '22222222-2222-2222-2222-222222222222', 'Cross a roundabout', 11),
  ('55555555-5555-5555-5555-555555555512', '22222222-2222-2222-2222-222222222222', 'Systematic mirror use', 12),
  ('55555555-5555-5555-5555-555555555513', '22222222-2222-2222-2222-222222222222', 'Signal with indicators', 13),
  ('55555555-5555-5555-5555-555555555514', '22222222-2222-2222-2222-222222222222', 'Respect right of way', 14),
  ('55555555-5555-5555-5555-555555555515', '22222222-2222-2222-2222-222222222222', 'Lane keeping', 15)
on conflict do nothing;

-- Clear demo error tags so this seed can be rerun safely
truncate table public.error_tags cascade;

-- Insert demo error tags
insert into public.error_tags (id, tenant_id, label) values
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222222', 'Seat belt not fastened'),
  ('66666666-6666-6666-6666-666666666602', '22222222-2222-2222-2222-222222222222', 'Mirror not checked'),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222222', 'Speed violation'),
  ('66666666-6666-6666-6666-666666666604', '22222222-2222-2222-2222-222222222222', 'Improper lane change'),
  ('66666666-6666-6666-6666-666666666605', '22222222-2222-2222-2222-222222222222', 'Failed to signal'),
  ('66666666-6666-6666-6666-666666666606', '22222222-2222-2222-2222-222222222222', 'Incorrect hand position'),
  ('66666666-6666-6666-6666-666666666607', '22222222-2222-2222-2222-222222222222', 'Pedestrian safety issue'),
  ('66666666-6666-6666-6666-666666666608', '22222222-2222-2222-2222-222222222222', 'Poor parking execution')
on conflict do nothing;

-- NOTE: Demo Supabase auth users must be created separately via Supabase Auth UI or API
-- The users below should match real auth.users entries
-- 
-- To create demo auth users:
-- 1. In Supabase console: Auth → Users → Create user
-- 2. Email: admin@patente-pro.com, Password: (set securely)
-- 3. Update user metadata to include: {"role": "admin", "tenant_id": "22222222-2222-2222-2222-222222222222"}
-- 4. Repeat for teacher@patente-pro.com with role: "teacher"
-- 5. Repeat for student@patente-pro.com with role: "student"

-- Clear demo users so this seed can be rerun safely
truncate table public.users cascade;

-- Insert demo users only when matching auth.users entries exist.
-- This ensures the app-level users stay in sync with Supabase Auth.
with demo_users (id, role, full_name, email, is_active) as (
  values
    ('9c77e98b-2979-4979-beb8-e78efe606daa'::uuid, 'admin'::public.user_role, 'Admin User', 'admin@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777702'::uuid, 'teacher'::public.user_role, 'Marco Rossi', 'marco@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777703'::uuid, 'teacher'::public.user_role, 'Francesca Marino', 'francesca@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777707'::uuid, 'teacher'::public.user_role, 'Luigi Costa', 'luigi@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777708'::uuid, 'teacher'::public.user_role, 'Giorgio Esposito', 'giorgio@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777704'::uuid, 'student'::public.user_role, 'Giulia Ferretti', 'giulia@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777705'::uuid, 'student'::public.user_role, 'Luca Bianchi', 'luca@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777706'::uuid, 'student'::public.user_role, 'Sara Conti', 'sara@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777709'::uuid, 'student'::public.user_role, 'Anna Moretti', 'anna@patente-pro.com', true),
    ('77777777-7777-7777-7777-777777777710'::uuid, 'student'::public.user_role, 'Marco Verdi', 'marco.verdi@patente-pro.com', true)
)
insert into public.users (id, tenant_id, role, full_name, email, is_active)
select au.id,
       '22222222-2222-2222-2222-222222222222',
       du.role,
       du.full_name,
       du.email,
       du.is_active
from demo_users du
join auth.users au on au.id = du.id
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email,
    is_active = excluded.is_active;

-- Clear demo teacher availability so this seed can be rerun safely
truncate table public.teacher_availability cascade;

-- Insert teacher availability (after users are created)
with availability_rows (teacher_id, day_of_week, start_time, end_time) as (
  values
    ('77777777-7777-7777-7777-777777777702'::uuid, 1, '09:00'::time, '17:00'::time),  -- Marco: Monday
    ('77777777-7777-7777-7777-777777777702'::uuid, 2, '09:00'::time, '17:00'::time),  -- Marco: Tuesday
    ('77777777-7777-7777-7777-777777777702'::uuid, 3, '09:00'::time, '17:00'::time),  -- Marco: Wednesday
    ('77777777-7777-7777-7777-777777777702'::uuid, 5, '09:00'::time, '17:00'::time),  -- Marco: Friday
    ('77777777-7777-7777-7777-777777777703'::uuid, 1, '14:00'::time, '20:00'::time),  -- Francesca: Monday afternoon
    ('77777777-7777-7777-7777-777777777703'::uuid, 3, '14:00'::time, '20:00'::time),  -- Francesca: Wednesday afternoon
    ('77777777-7777-7777-7777-777777777703'::uuid, 4, '09:00'::time, '17:00'::time),  -- Francesca: Thursday
    ('77777777-7777-7777-7777-777777777703'::uuid, 5, '09:00'::time, '17:00'::time),  -- Francesca: Friday
    ('77777777-7777-7777-7777-777777777707'::uuid, 1, '14:00'::time, '18:00'::time),  -- Luigi: Monday
    ('77777777-7777-7777-7777-777777777707'::uuid, 2, '14:00'::time, '18:00'::time),  -- Luigi: Tuesday
    ('77777777-7777-7777-7777-777777777707'::uuid, 4, '09:00'::time, '13:00'::time),  -- Luigi: Thursday
    ('77777777-7777-7777-7777-777777777707'::uuid, 5, '09:00'::time, '13:00'::time),  -- Luigi: Friday
    ('77777777-7777-7777-7777-777777777708'::uuid, 2, '10:00'::time, '12:00'::time),  -- Giorgio: Tuesday
    ('77777777-7777-7777-7777-777777777708'::uuid, 3, '10:00'::time, '12:00'::time),  -- Giorgio: Wednesday
    ('77777777-7777-7777-7777-777777777708'::uuid, 5, '15:00'::time, '18:00'::time)   -- Giorgio: Friday
)
insert into public.teacher_availability (teacher_id, day_of_week, start_time, end_time)
select ar.teacher_id, ar.day_of_week, ar.start_time, ar.end_time
from availability_rows ar
where exists (
  select 1 from public.users u
  where u.id = ar.teacher_id
    and u.role = 'teacher'
);

-- Clear demo lessons so this seed can be rerun safely
truncate table public.lessons cascade;

-- Insert demo lessons (after users are created)
with lesson_rows (tenant_id, teacher_id, student_id, scheduled_at, duration_minutes, status) as (
  values
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777702'::uuid, '77777777-7777-7777-7777-777777777704'::uuid, now() + interval '1 day 09:00', 60, 'completed'::public.lesson_status),
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777702'::uuid, '77777777-7777-7777-7777-777777777704'::uuid, now() + interval '2 days 11:00', 60, 'completed'::public.lesson_status),
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777702'::uuid, '77777777-7777-7777-7777-777777777705'::uuid, now() + interval '3 days 14:00', 50, 'scheduled'::public.lesson_status),
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777703'::uuid, '77777777-7777-7777-7777-777777777706'::uuid, now() + interval '2 days 15:00', 60, 'scheduled'::public.lesson_status),
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777707'::uuid, '77777777-7777-7777-7777-777777777709'::uuid, now() + interval '4 days 09:00', 50, 'scheduled'::public.lesson_status),
    ('22222222-2222-2222-2222-222222222222'::uuid, '77777777-7777-7777-7777-777777777708'::uuid, '77777777-7777-7777-7777-777777777710'::uuid, now() + interval '5 days 15:00', 60, 'scheduled'::public.lesson_status)
)
insert into public.lessons (tenant_id, teacher_id, student_id, scheduled_at, duration_minutes, status)
select lr.tenant_id, lr.teacher_id, lr.student_id, lr.scheduled_at, lr.duration_minutes, lr.status
from lesson_rows lr
where exists (
  select 1 from public.users u
  where u.id = lr.teacher_id
    and u.role = 'teacher'
)
and exists (
  select 1 from public.users u
  where u.id = lr.student_id
    and u.role = 'student'
)
on conflict do nothing;
