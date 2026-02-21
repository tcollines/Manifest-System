-- 1. Index to support VehicleController getVehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_manifest_event_legacy ON vehicles(manifest_id, legacy_event_id);

-- 2. Index to support VehicleController getVehicles (station OR mapping phase)
CREATE INDEX IF NOT EXISTS idx_vehicles_manifest_station_legacy ON vehicles(manifest_id, legacy_station_id);

-- 3. In the event we actually do query the parent event_id with manifest frequently
CREATE INDEX IF NOT EXISTS idx_vehicles_manifest_event ON vehicles(manifest_id, event_id);
