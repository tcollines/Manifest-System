
-- Update all existing Coordinators to belong to Transportation Department (d5)
UPDATE users
SET department_id = 'd5'
WHERE role = 'Coordinator' AND department_id IS NULL;
