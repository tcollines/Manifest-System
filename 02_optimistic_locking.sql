-- Migration 02: Optimistic Locking Triggers
-- Purpose: Automatically increment the "version" integer column on every UPDATE
-- to power robust optimistic locking and prevent concurrent write amplification or state regression anomalies.

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Apply to Vehicles
DROP TRIGGER IF EXISTS trg_increment_vehicle_version ON public.vehicles;

CREATE TRIGGER trg_increment_vehicle_version
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();


-- 2. Apply to Passengers
DROP TRIGGER IF EXISTS trg_increment_passenger_version ON public.passengers;

CREATE TRIGGER trg_increment_passenger_version
    BEFORE UPDATE ON public.passengers
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();
