-- Phase 3 Final Resilience: Role Change Audit Trail
CREATE TABLE IF NOT EXISTS public.role_change_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    old_role text,
    new_role text,
    changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at timestamptz DEFAULT now()
);

-- Protect audit trail
ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

-- Only Administrators can read audit logs
CREATE POLICY "Admins can read role audit log" 
ON public.role_change_log 
FOR SELECT 
USING (public.has_role('Administrator'));

-- NO INSERT POLICY: Client inserts are entirely disabled. 
-- The backend must use the service_role key to bypass RLS and write to this audit log.
