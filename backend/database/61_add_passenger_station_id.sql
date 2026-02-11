
-- Add station_id (UUID) and legacy_station_id (TEXT) to passengers table
ALTER TABLE passengers 
ADD COLUMN station_id UUID REFERENCES pickup_stations(id),
ADD COLUMN legacy_station_id TEXT;

-- Index for performance
CREATE INDEX idx_passengers_station_id ON passengers(station_id);
