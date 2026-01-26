-- Add soul_won column to passengers table
ALTER TABLE public.passengers 
ADD COLUMN IF NOT EXISTS soul_won boolean DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.passengers.soul_won IS 'Tracking if a passenger was won for Christ';
