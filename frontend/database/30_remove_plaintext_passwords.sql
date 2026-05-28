-- SECURE PASSWORD STORAGE MIGRATION
-- Objective: Delete the plaintext password column from the public users table. 
-- Passwords will now solely reside in the encrypted auth.users vault.

BEGIN;

-- Drop the password column
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

COMMIT;
