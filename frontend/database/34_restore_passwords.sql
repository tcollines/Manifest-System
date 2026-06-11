-- RESTORE PASSWORDS FOR TEMP USERS
-- Objective: Restore the password column to the public.users table so that temporary users can have their passwords displayed.

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password text;

-- Populate existing passwords with a default value for temp users/data entrants
UPDATE public.users 
SET password = '123' 
WHERE password IS NULL;

COMMIT;
