-- Function to migrate data from a temporary Event ID (evt-*) to a permanent UUID
CREATE OR REPLACE FUNCTION resolve_event_id(
    old_id TEXT,
    new_id UUID
) RETURNS JSON AS $$
DECLARE
    v_affected_rows INT := 0;
    v_total_updates INT := 0;
BEGIN
    -- 1. Pickup Stations (Logistics)
    UPDATE pickup_stations 
    SET event_id = new_id::text 
    WHERE event_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 2. Service Attendance
    -- Note: service_attendance.service_id is Text
    UPDATE service_attendance 
    SET service_id = new_id::text 
    WHERE service_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 3. Souls (Service Source)
    UPDATE souls 
    SET source_id = new_id::text 
    WHERE source_id = old_id AND source_type = 'Service';
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 4. Next Gen Souls
    UPDATE next_gen_souls 
    SET service_id = new_id::text 
    WHERE service_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 5. Transactions (Finance)
    UPDATE transactions 
    SET event_id = new_id::text 
    WHERE event_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 6. Personal Vehicles (Attendance Array - TEXT[])
    -- Error logs confirmed this table uses TEXT[]
    UPDATE personal_vehicles
    SET attended_service_ids = array_replace(attended_service_ids, old_id, new_id::text)
    WHERE attended_service_ids @> ARRAY[old_id];
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 7. Members (Attendance Array - JSONB)
    -- Error logs confirmed this table uses JSONB
    UPDATE members
    SET attended_service_ids = (attended_service_ids - old_id) || jsonb_build_array(new_id::text)
    WHERE attended_service_ids @> jsonb_build_array(old_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    -- 8. Children (Attendance Array - JSONB)
    -- Error log confirmed this table uses JSONB (despite earlier schema file saying text[])
    UPDATE children
    SET attended_service_ids = (attended_service_ids - old_id) || jsonb_build_array(new_id::text)
    WHERE attended_service_ids @> jsonb_build_array(old_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    -- 9. Users (Event Coordinators / linked to Event)
    UPDATE users
    SET event_id = new_id::text
    WHERE event_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    RETURN json_build_object(
        'success', true,
        'old_id', old_id,
        'new_id', new_id,
        'total_updates', v_total_updates
    );
END;
$$ LANGUAGE plpgsql;
