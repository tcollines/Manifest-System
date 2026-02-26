-- Fix Attendance Integrity: Delete Service Orphans & Add FKs

-- 1. Delete Service Orphans (approx 30 rows)
DELETE FROM service_attendance
WHERE service_id NOT IN (SELECT id::text FROM ministry_events);

-- 2. Add Foreign Key for Member ID (Cascade Delete)
ALTER TABLE service_attendance
ADD CONSTRAINT fk_service_attendance_member
FOREIGN KEY (member_id)
REFERENCES members(id)
ON DELETE CASCADE;

-- 3. Add Foreign Key for Service ID (Cascade Delete)
ALTER TABLE service_attendance
ADD CONSTRAINT fk_service_attendance_service
FOREIGN KEY (service_id)
REFERENCES ministry_events(id)
ON DELETE CASCADE;

-- 4. Audit & Exclusion Support
ALTER TABLE service_attendance 
ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS audit_note TEXT;
