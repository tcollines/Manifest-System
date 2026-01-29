-- Add coordinator_email column to pickup_stations
ALTER TABLE public.pickup_stations ADD COLUMN IF NOT EXISTS coordinator_email text;

-- Add comment
COMMENT ON COLUMN public.pickup_stations.coordinator_email IS 'Email address of the stage coordinator';
