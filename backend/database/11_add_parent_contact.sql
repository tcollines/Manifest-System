-- Add parent_contact column to passengers table
ALTER TABLE public.passengers 
ADD COLUMN IF NOT EXISTS parent_contact text;

-- Comment for clarity
COMMENT ON COLUMN public.passengers.parent_contact IS 'Contact number of the parent/guardian for student passengers';
