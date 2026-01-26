-- Change requester_id from UUID to TEXT to support existing user IDs format
ALTER TABLE public.requisitions 
ALTER COLUMN requester_id TYPE TEXT;

-- If there was a foreign key constraint to users.id that was also UUID, it would need to be dropped first.
-- Assuming no strict FK constraint was added in the previous script (it was just a comment "-- Links to users table"),
-- but if one exists, we would do:
-- ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_requester_id_fkey;

-- Also ensuring status check is correct
ALTER TABLE public.requisitions 
DROP CONSTRAINT IF EXISTS requisitions_status_check;

ALTER TABLE public.requisitions 
ADD CONSTRAINT requisitions_status_check 
CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid'));
