-- REPAIR: Fix Legacy Vehicle IDs (v-...)
-- The vehicles holding your passengers have 'v-' IDs.
-- We must convert them to UUIDs so the system can aggregate them safely.

DO $$
DECLARE
    r_vehicle RECORD;
    v_new_id UUID;
BEGIN
    -- Loop through all vehicles with 'v-' IDs
    FOR r_vehicle IN 
        SELECT * FROM vehicles WHERE id LIKE 'v-%'
    LOOP
        v_new_id := uuid_generate_v4();
        
        RAISE NOTICE 'Fixing Vehicle: % (Old ID: %) -> New ID: %', r_vehicle.number_plate, r_vehicle.id, v_new_id;

        -- 1. Create a duplicate vehicle with the NEW UUID
        INSERT INTO vehicles (
            id, station_id, number_plate, driver_name, driver_contact, driver_nin,
            type, coordinator, time_arrival, status,
            children, finance_details, approvals, location,
            current_stage, journey_direction, 
            ongoing_start_time, ongoing_arrival_time, return_start_time, return_arrival_time,
            created_at
        ) VALUES (
            v_new_id::text, r_vehicle.station_id, r_vehicle.number_plate, r_vehicle.driver_name, r_vehicle.driver_contact, r_vehicle.driver_nin,
            r_vehicle.type, r_vehicle.coordinator, r_vehicle.time_arrival, r_vehicle.status,
            r_vehicle.children, r_vehicle.finance_details, r_vehicle.approvals, r_vehicle.location,
            r_vehicle.current_stage, r_vehicle.journey_direction,
            r_vehicle.ongoing_start_time, r_vehicle.ongoing_arrival_time, r_vehicle.return_start_time, r_vehicle.return_arrival_time,
            r_vehicle.created_at
        );

        -- 2. Move Passengers to the New Vehicle ID
        UPDATE passengers 
        SET vehicle_id = v_new_id::text 
        WHERE vehicle_id = r_vehicle.id;

        -- 3. Delete the Old 'v-' Vehicle
        DELETE FROM vehicles WHERE id = r_vehicle.id;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;
