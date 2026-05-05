-- Add location mapping columns to ministry_events
ALTER TABLE ministry_events ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE ministry_events ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
ALTER TABLE ministry_events ADD COLUMN IF NOT EXISTS location_name TEXT;

-- If there's an events table separate from ministry_events, let's add it there too to be safe
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_name TEXT;
