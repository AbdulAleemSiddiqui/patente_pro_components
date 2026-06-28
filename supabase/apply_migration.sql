-- First, backup existing data (if any)
CREATE TABLE IF NOT EXISTS teacher_availability_backup AS
SELECT * FROM teacher_availability;

-- Drop the old table
DROP TABLE IF EXISTS teacher_availability CASCADE;

-- Create the new table with date-specific availability
CREATE TABLE teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  check (start_at < end_at)
);

-- Create indexes for performance
CREATE INDEX teacher_availability_teacher_idx ON teacher_availability (teacher_id, start_at);
CREATE INDEX teacher_availability_tenant_idx ON teacher_availability (tenant_id, start_at);

-- Enable RLS
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

-- Create policies (same as before but updated for new schema)
CREATE POLICY "teachers read own availability and admins read all"
  ON teacher_availability FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = teacher_id
        AND u.tenant_id = public.jwt_tenant_id()
        AND public.is_admin()
    )
  );

CREATE POLICY "teachers manage own availability"
  ON teacher_availability FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "admins manage tenant availability"
  ON teacher_availability FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = teacher_id AND u.tenant_id = public.jwt_tenant_id()
    )
  )
  WITH CHECK (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = teacher_id AND u.tenant_id = public.jwt_tenant_id()
    )
  );

-- Note: If you had data in the old table, you would need to migrate it manually
-- since the old schema (day_of_week, start_time, end_time) doesn't directly
-- convert to date-specific blocks (start_at, end_at)
