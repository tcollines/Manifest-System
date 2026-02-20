-- Add indexes to improve query performance with Row Level Security (RLS) filters on manifest_id

CREATE INDEX IF NOT EXISTS idx_members_manifest_id ON members(manifest_id);
CREATE INDEX IF NOT EXISTS idx_ministry_events_manifest_id ON ministry_events(manifest_id);
CREATE INDEX IF NOT EXISTS idx_pickup_stations_manifest_id ON pickup_stations(manifest_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_manifest_id ON vehicles(manifest_id);
CREATE INDEX IF NOT EXISTS idx_passengers_manifest_id ON passengers(manifest_id);
CREATE INDEX IF NOT EXISTS idx_souls_manifest_id ON souls(manifest_id);
CREATE INDEX IF NOT EXISTS idx_users_manifest_id ON users(manifest_id);
CREATE INDEX IF NOT EXISTS idx_children_attendance_manifest_id ON children_attendance(manifest_id);

-- Composite indexes for frequent queries that filter by manifest_id AND another key
CREATE INDEX IF NOT EXISTS idx_service_attendance_manifest_service ON service_attendance(manifest_id, service_id);
CREATE INDEX IF NOT EXISTS idx_members_manifest_status ON members(manifest_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_manifest_event ON vehicles(manifest_id, event_id);
CREATE INDEX IF NOT EXISTS idx_passengers_manifest_vehicle ON passengers(manifest_id, vehicle_id);
