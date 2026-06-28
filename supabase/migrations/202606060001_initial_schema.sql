create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.lesson_status as enum ('scheduled', 'completed', 'cancelled');
create type public.swap_status as enum ('pending', 'accepted', 'rejected');

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid references public.cities(id),
  logo_url text,
  theme_color text default '#1a3a5c',
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table public.route_types (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name text not null,
  requires_sub_selection boolean not null default false,
  unique (city_id, name)
);

create table public.route_sub_types (
  id uuid primary key default gen_random_uuid(),
  route_type_id uuid not null references public.route_types(id) on delete cascade,
  label text not null,
  unique (route_type_id, label)
);

-- create table public.teacher_availability (
--   id uuid primary key default gen_random_uuid(),
--   teacher_id uuid not null references public.users(id) on delete cascade,
--   day_of_week int not null check (day_of_week between 0 and 6),
--   start_time time not null,
--   end_time time not null,
--   check (start_time < end_time)
-- );
create table public.teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  check (start_at < end_at)
);

create table public.maneuvers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  unique (tenant_id, name)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  teacher_id uuid not null references public.users(id),
  student_id uuid not null references public.users(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null check (duration_minutes in (30, 45, 50, 60, 90, 120)),
  status public.lesson_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  route_type_id uuid references public.route_types(id),
  route_sub_type_id uuid references public.route_sub_types(id),
  notes text,
  submitted_at timestamptz not null default now()
);

create table public.maneuver_ratings (
  id uuid primary key default gen_random_uuid(),
  lesson_feedback_id uuid not null references public.lesson_feedback(id) on delete cascade,
  maneuver_id uuid not null references public.maneuvers(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  unique (lesson_feedback_id, maneuver_id)
);

create table public.error_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  unique (tenant_id, label)
);

create table public.lesson_feedback_error_tags (
  lesson_feedback_id uuid not null references public.lesson_feedback(id) on delete cascade,
  error_tag_id uuid not null references public.error_tags(id) on delete cascade,
  primary key (lesson_feedback_id, error_tag_id)
);

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requesting_teacher_id uuid not null references public.users(id),
  target_teacher_id uuid not null references public.users(id),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.swap_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index users_tenant_role_idx on public.users (tenant_id, role);
create index lessons_tenant_scheduled_idx on public.lessons (tenant_id, scheduled_at);
create index lessons_teacher_idx on public.lessons (teacher_id, scheduled_at);
create index lessons_student_idx on public.lessons (student_id, scheduled_at);
-- create index teacher_availability_teacher_idx on public.teacher_availability (teacher_id, day_of_week);
create index teacher_availability_teacher_idx on public.teacher_availability (teacher_id, start_at);
create index teacher_availability_tenant_idx on public.teacher_availability (tenant_id, start_at);
create index swap_requests_target_idx on public.swap_requests (target_teacher_id, status);

create or replace function public.jwt_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid
$$;

create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'role'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.jwt_role() = 'admin'
$$;

alter table public.cities enable row level security;
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.route_types enable row level security;
alter table public.route_sub_types enable row level security;
alter table public.teacher_availability enable row level security;
alter table public.maneuvers enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_feedback enable row level security;
alter table public.maneuver_ratings enable row level security;
alter table public.error_tags enable row level security;
alter table public.lesson_feedback_error_tags enable row level security;
alter table public.swap_requests enable row level security;

create policy "cities readable by authenticated users"
  on public.cities for select
  to authenticated
  using (true);

create policy "tenant members can read own tenant"
  on public.tenants for select
  to authenticated
  using (id = public.jwt_tenant_id());

create policy "admins can update own tenant"
  on public.tenants for update
  to authenticated
  using (id = public.jwt_tenant_id() and public.is_admin())
  with check (id = public.jwt_tenant_id() and public.is_admin());

create policy "tenant users can read users"
  on public.users for select
  to authenticated
  using (tenant_id = public.jwt_tenant_id());

create policy "admins can manage tenant users"
  on public.users for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

create policy "routes readable by authenticated users"
  on public.route_types for select
  to authenticated
  using (true);

create policy "route subtypes readable by authenticated users"
  on public.route_sub_types for select
  to authenticated
  using (true);

create policy "tenant members can read maneuvers"
  on public.maneuvers for select
  to authenticated
  using (tenant_id = public.jwt_tenant_id());

create policy "admins can manage maneuvers"
  on public.maneuvers for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

create policy "tenant members can read error tags"
  on public.error_tags for select
  to authenticated
  using (tenant_id = public.jwt_tenant_id());

create policy "admins can manage error tags"
  on public.error_tags for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

create policy "teachers read own availability and admins read all"
  on public.teacher_availability for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = teacher_id
        and u.tenant_id = public.jwt_tenant_id()
        and public.is_admin()
    )
  );

create policy "teachers manage own availability"
  on public.teacher_availability for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "admins manage tenant availability"
  on public.teacher_availability for all
  to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.users u
      where u.id = teacher_id and u.tenant_id = public.jwt_tenant_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.users u
      where u.id = teacher_id and u.tenant_id = public.jwt_tenant_id()
    )
  );

create policy "tenant members read lessons"
  on public.lessons for select
  to authenticated
  using (
    tenant_id = public.jwt_tenant_id()
    and (
      public.is_admin()
      or teacher_id = auth.uid()
      or student_id = auth.uid()
    )
  );

create policy "admins manage lessons"
  on public.lessons for all
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and public.is_admin())
  with check (tenant_id = public.jwt_tenant_id() and public.is_admin());

create policy "teachers can complete own lessons"
  on public.lessons for update
  to authenticated
  using (tenant_id = public.jwt_tenant_id() and teacher_id = auth.uid())
  with check (tenant_id = public.jwt_tenant_id() and teacher_id = auth.uid());

create policy "tenant members read feedback for visible lessons"
  on public.lesson_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and l.tenant_id = public.jwt_tenant_id()
        and (public.is_admin() or l.teacher_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "teachers submit own lesson feedback"
  on public.lesson_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and l.tenant_id = public.jwt_tenant_id()
        and l.teacher_id = auth.uid()
    )
  );

create policy "ratings readable through visible feedback"
  on public.maneuver_ratings for select
  to authenticated
  using (
    exists (
      select 1
      from public.lesson_feedback lf
      join public.lessons l on l.id = lf.lesson_id
      where lf.id = lesson_feedback_id
        and l.tenant_id = public.jwt_tenant_id()
        and (public.is_admin() or l.teacher_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "teachers insert ratings for own lessons"
  on public.maneuver_ratings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.lesson_feedback lf
      join public.lessons l on l.id = lf.lesson_id
      where lf.id = lesson_feedback_id
        and l.tenant_id = public.jwt_tenant_id()
        and l.teacher_id = auth.uid()
    )
  );

create policy "feedback error tags readable through visible feedback"
  on public.lesson_feedback_error_tags for select
  to authenticated
  using (
    exists (
      select 1
      from public.lesson_feedback lf
      join public.lessons l on l.id = lf.lesson_id
      where lf.id = lesson_feedback_id
        and l.tenant_id = public.jwt_tenant_id()
        and (public.is_admin() or l.teacher_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "teachers insert feedback error tags for own lessons"
  on public.lesson_feedback_error_tags for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.lesson_feedback lf
      join public.lessons l on l.id = lf.lesson_id
      where lf.id = lesson_feedback_id
        and l.tenant_id = public.jwt_tenant_id()
        and l.teacher_id = auth.uid()
    )
  );

create policy "teachers read own swap requests and admins read tenant swaps"
  on public.swap_requests for select
  to authenticated
  using (
    requesting_teacher_id = auth.uid()
    or target_teacher_id = auth.uid()
    or (
      public.is_admin()
      and exists (
        select 1 from public.lessons l
        where l.id = lesson_id and l.tenant_id = public.jwt_tenant_id()
      )
    )
  );

create policy "teachers create own swap requests"
  on public.swap_requests for insert
  to authenticated
  with check (requesting_teacher_id = auth.uid());

create policy "target teachers update swap status"
  on public.swap_requests for update
  to authenticated
  using (target_teacher_id = auth.uid())
  with check (target_teacher_id = auth.uid());
