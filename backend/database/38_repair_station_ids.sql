-- REPAIR: Fix Legacy Station IDs (s-...)
-- The stations holding your 11 vehicles have 's-' IDs.
-- We must convert them to UUIDs so the system can count them.

DO $$
DECLARE
    r_station RECORD;
    v_new_id UUID;
BEGIN
    -- Loop through all stations with 's-' IDs
    FOR r_station IN 
        SELECT * FROM pickup_stations WHERE id LIKE 's-%'
    LOOP
        v_new_id := uuid_generate_v4();
        
        RAISE NOTICE 'Fixing Station: % (Old ID: %) -> New ID: %', r_station.name, r_station.id, v_new_id;

        -- 1. Create a duplicate station with the NEW UUID
        INSERT INTO pickup_stations (
            id, name, location, registered_attendees, vehicle_status, event_id, 
            coordinator_name, coordinator_contact, coordinator_email, created_at
        ) VALUES (
            v_new_id::text, r_station.name, r_station.location, r_station.registered_attendees, r_station.vehicle_status, r_station.event_id,
            r_station.coordinator_name, r_station.coordinator_contact, r_station.coordinator_email, r_station.created_at
        );

        -- 2. Move Vehicles to the New Station ID
        UPDATE vehicles 
        SET station_id = v_new_id::text 
        WHERE station_id = r_station.id;
        
        -- 3. Move Users (Data Entrants) to the New Station ID
        UPDATE users
        SET station_id = v_new_id::text
        WHERE station_id = r_station.id;

        -- 4. Delete the Old 's-' Station
        DELETE FROM pickup_stations WHERE id = r_station.id;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;
