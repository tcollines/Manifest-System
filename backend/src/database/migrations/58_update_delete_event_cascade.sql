CREATE OR REPLACE FUNCTION delete_event_cascade(p_manifest_id UUID, p_event_id UUID) RETURNS void AS $$
BEGIN
    -- STRICTLY ONLY DELETE FROM EXACT, VERIFIED EXISTING TABLES WITH CONFIRMED FOREIGN KEYS
    
    -- 1. Main Demographics
    DELETE FROM souls WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM service_attendance WHERE service_id = p_event_id AND manifest_id = p_manifest_id;
    
    -- 2. Finance
    DELETE FROM transactions WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    
    -- 3. Next Gen
    DELETE FROM next_gen_souls WHERE service_id = p_event_id AND manifest_id = p_manifest_id;
    
    -- 4. Users (Delete temp entrants and coordinators before their stations are deleted)
    DELETE FROM users 
    WHERE (event_id = p_event_id OR station_id IN (SELECT id FROM pickup_stations WHERE event_id = p_event_id AND manifest_id = p_manifest_id))
      AND manifest_id = p_manifest_id;

    -- 5. Logistics
    DELETE FROM passengers WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM vehicles WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM vehicle_attendance WHERE service_id = p_event_id;
    DELETE FROM pickup_stations WHERE event_id = p_event_id AND manifest_id = p_manifest_id;

    -- 6. Final Stage: Delete the Master Event 
    DELETE FROM ministry_events 
    WHERE id = p_event_id AND manifest_id = p_manifest_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found or unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
