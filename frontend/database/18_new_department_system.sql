-- ============================================================
-- Migration 18: New Department System
-- Author: Manifest System
-- Date: 2026-04-03 (Fixed: manifest_id is TEXT, no FK to manifests table)
--
-- Creates 7 tables to support dynamic, database-driven departments:
--   departments (extended), dept_members, dept_church_members,
--   service_schedules, schedule_sessions, schedule_assignments,
--   monthly_workplans, dept_finances
--
-- NOTE: manifest_id is a TEXT tenant identifier, consistent with
--       all other tables in this schema (campus_activities, etc.)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Extend `departments` table if it exists, or create it
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id TEXT NOT NULL,
    name        TEXT NOT NULL
);

ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS slug        TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS icon        TEXT    DEFAULT 'Users',
    ADD COLUMN IF NOT EXISTS is_custom   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS status      TEXT    DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    ADD COLUMN IF NOT EXISTS created_by  TEXT,
    ADD COLUMN IF NOT EXISTS head_id     TEXT,
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- ────────────────────────────────────────────────────────────
-- 2. dept_members — system users with dept-scoped roles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dept_members (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id  UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dept_role      TEXT NOT NULL DEFAULT 'Member'
                     CHECK (dept_role IN ('HOD', 'Dept Admin', 'Dept Finance', 'Member')),
    created_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (department_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. dept_church_members — church members serving (no system login)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dept_church_members (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id  UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    member_id      UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    serving_role   TEXT NOT NULL,
    joined_date    DATE DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (department_id, member_id)
);

-- ────────────────────────────────────────────────────────────
-- 4. service_schedules — weekly schedule header
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_schedules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    department_id  UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    week_start     DATE NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published')),
    notes          TEXT,
    created_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. schedule_sessions — individual sessions inside a schedule
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedule_sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id    UUID NOT NULL REFERENCES public.service_schedules(id) ON DELETE CASCADE,
    session_label  TEXT NOT NULL,
    session_date   DATE NOT NULL,
    arrival_time   TEXT NOT NULL,
    sequence       INT  NOT NULL DEFAULT 0,
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. schedule_assignments — role assignments per session
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL REFERENCES public.schedule_sessions(id) ON DELETE CASCADE,
    role_label     TEXT NOT NULL,
    minister_name  TEXT NOT NULL,
    member_id      UUID REFERENCES public.members(id) ON DELETE SET NULL,
    sequence       INT  NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 7. monthly_workplans
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_workplans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    department_id  UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    month          DATE NOT NULL,
    objectives     TEXT,
    activities     JSONB NOT NULL DEFAULT '[]'::jsonb,
    status         TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft', 'Submitted', 'Approved')),
    created_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 8. dept_finances — income / expense ledger per department
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dept_finances (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    department_id  UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('Income', 'Expense')),
    category       TEXT NOT NULL,
    amount         NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description    TEXT,
    date           DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by    TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 9. Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departments_manifest      ON public.departments(manifest_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept         ON public.dept_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user         ON public.dept_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_church_dept          ON public.dept_church_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_church_member        ON public.dept_church_members(member_id);
CREATE INDEX IF NOT EXISTS idx_schedules_manifest        ON public.service_schedules(manifest_id);
CREATE INDEX IF NOT EXISTS idx_schedules_dept            ON public.service_schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_week            ON public.service_schedules(week_start);
CREATE INDEX IF NOT EXISTS idx_sessions_schedule         ON public.schedule_sessions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session       ON public.schedule_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_member        ON public.schedule_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_workplans_manifest        ON public.monthly_workplans(manifest_id);
CREATE INDEX IF NOT EXISTS idx_workplans_dept            ON public.monthly_workplans(department_id);
CREATE INDEX IF NOT EXISTS idx_workplans_month           ON public.monthly_workplans(month);
CREATE INDEX IF NOT EXISTS idx_dept_finances_manifest    ON public.dept_finances(manifest_id);
CREATE INDEX IF NOT EXISTS idx_dept_finances_dept        ON public.dept_finances(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_finances_date        ON public.dept_finances(date);

-- ────────────────────────────────────────────────────────────
-- 10. RLS Policies (consistent with existing schema pattern)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.dept_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dept_church_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_workplans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dept_finances         ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to avoid duplicate errors on re-run
DROP POLICY IF EXISTS "Enable ALL for authenticated users on dept_members"         ON public.dept_members;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on dept_church_members"  ON public.dept_church_members;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on service_schedules"    ON public.service_schedules;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on schedule_sessions"    ON public.schedule_sessions;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on monthly_workplans"    ON public.monthly_workplans;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on dept_finances"        ON public.dept_finances;

CREATE POLICY "Enable ALL for authenticated users on dept_members"
    ON public.dept_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on dept_church_members"
    ON public.dept_church_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on service_schedules"
    ON public.service_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on schedule_sessions"
    ON public.schedule_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on schedule_assignments"
    ON public.schedule_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on monthly_workplans"
    ON public.monthly_workplans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on dept_finances"
    ON public.dept_finances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 11. Enable Realtime for key tables
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_workplans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dept_finances;
