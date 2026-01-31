-- 1. Remove duplicate attendance records (keeping the latest one or arbitrary one)
-- This is required before adding the UNIQUE constraint.
DELETE FROM public.service_attendance T1
USING public.service_attendance T2
WHERE T1.ctid < T2.ctid  -- duplicate deletion based on internal row ID
  AND T1.member_id = T2.member_id 
  AND T1.service_id = T2.service_id;

-- 2. Add the UNIQUE constraint
ALTER TABLE public.service_attendance
ADD CONSTRAINT service_attendance_member_id_service_id_key UNIQUE (member_id, service_id);
