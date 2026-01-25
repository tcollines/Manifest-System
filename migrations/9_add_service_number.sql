-- Add service_number column to ministry_events table
ALTER TABLE ministry_events 
ADD COLUMN IF NOT EXISTS service_number INTEGER;

COMMENT ON COLUMN ministry_events.service_number IS 'Explicit number for the service (e.g., 376 for Sunday Fellowship 376)';
