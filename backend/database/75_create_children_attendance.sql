-- Migration: Create children_attendance table for Next Gen ministry
-- This allows tracking individual service attendance for registered children.

CREATE TABLE IF NOT EXISTS public.children_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.ministry_events(id) ON DELETE CASCADE,
    manifest_id UUID NOT NULL REFERENCES public.manifest_details(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, service_id)
);

-- Apply Multi-Tenant Row Level Security (Phase 3 spec)
ALTER TABLE public.children_attendance ENABLE ROW LEVEL SECURITY;

-- Policy to ensure Tenant Isolation
DROP POLICY IF EXISTS "Tenant Isolation" ON public.children_attendance;
CREATE POLICY "Tenant Isolation" ON public.children_attendance
    FOR ALL
    USING (manifest_id::text = (auth.jwt() ->> 'manifest_id')::text);

-- Re-apply Performance Index from Phase 7 just for safety
CREATE INDEX IF NOT EXISTS idx_children_attendance_manifest_id ON public.children_attendance(manifest_id);
CREATE INDEX IF NOT EXISTS idx_children_attendance_service_id ON public.children_attendance(service_id);
