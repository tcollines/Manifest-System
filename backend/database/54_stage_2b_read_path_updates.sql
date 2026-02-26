
-- 54_stage_2b_read_path_updates.sql
-- Goal: Update read paths in RPCs to prefer native UUID shadow columns.
-- Constraint: Use shadow columns where available, fallback to legacy TEXT columns otherwise.

BEGIN;

CREATE OR REPLACE FUNCTION get_event_highlights(event_uuid UUID)
RETURNS JSON AS $$
DECLARE
    -- Variables for Logistics
    v_station_ids_uuid UUID[];
    v_vehicle_ids_uuid UUID[];
    v_fleet_count INT := 0;
    v_event_id_text TEXT := event_uuid::text;

    v_passenger_count INT := 0;
    v_logistics_children INT := 0;
    v_logistics_first_timers INT := 0;
    v_logistics_students INT := 0;
    v_logistics_institutions INT := 0;
    v_passengers_souls INT := 0;
    v_fleet_expenditure DECIMAL := 0;
    
    -- Variables for Service Stats
    v_service_attendance_count INT := 0;
    v_service_first_timers INT := 0;
    
    -- Variables for Finance
    v_finance_expenditure DECIMAL := 0;
    
    -- Variables for Souls
    v_souls_db_count INT := 0;
    v_next_gen_souls_count INT := 0;
    v_total_souls INT := 0;
    
    -- Variables for Personal Cars
    v_personal_cars_count INT := 0;
    
    -- Final Aggregates
    v_final_attendees INT := 0;
    v_final_first_timers INT := 0;

BEGIN
    -- 1. Logistics Stats: Prefer event_id_uuid
    SELECT ARRAY_AGG(id_uuid) INTO v_station_ids_uuid 
    FROM pickup_stations 
    WHERE event_id_uuid = event_uuid 
       OR (event_id_uuid IS NULL AND event_id = v_event_id_text);
    
    IF v_station_ids_uuid IS NOT NULL THEN
        -- Get Vehicle Aggregates: Prefer station_id_uuid
        SELECT 
            ARRAY_AGG(id_uuid),
            COUNT(*),
            COALESCE(SUM(COALESCE(children, 0)), 0),
            COALESCE(SUM(NULLIF(finance_details->>'ongoingDispatch', '')::DECIMAL), 0)
        INTO 
            v_vehicle_ids_uuid,
            v_fleet_count,
            v_logistics_children,
            v_fleet_expenditure
        FROM vehicles 
        WHERE station_id_uuid = ANY(v_station_ids_uuid)
           OR (station_id_uuid IS NULL AND station_id = ANY(ARRAY(SELECT id FROM pickup_stations WHERE id_uuid = ANY(v_station_ids_uuid))));
        
        -- Simplified fallback: if array_agg failed for UUIDs, we might need to broaden.
        -- But Stage 2A ensures id_uuid is populated for new ones and backfill covers old.
        
        IF v_vehicle_ids_uuid IS NOT NULL THEN
            -- Get Passenger Aggregates: Prefer vehicle_id_uuid
            SELECT 
                COUNT(*),
                COUNT(*) FILTER (WHERE is_first_time = 'Yes'),
                COUNT(*) FILTER (WHERE category = 'Student'),
                COUNT(*) FILTER (WHERE category = 'Institution'),
                COUNT(*) FILTER (WHERE soul_won = true)
            INTO 
                v_passenger_count,
                v_logistics_first_timers,
                v_logistics_students,
                v_logistics_institutions,
                v_passengers_souls
            FROM passengers 
            WHERE vehicle_id_uuid = ANY(v_vehicle_ids_uuid)
               OR (vehicle_id_uuid IS NULL AND vehicle_id = ANY(ARRAY(SELECT id FROM vehicles WHERE id_uuid = ANY(v_vehicle_ids_uuid))));
        END IF;
    END IF;

    -- 2. Service Stats (Attendance Table): Prefer service_id_uuid
    SELECT COUNT(DISTINCT member_id_uuid) INTO v_service_attendance_count 
    FROM service_attendance 
    WHERE service_id_uuid = event_uuid 
       OR (service_id_uuid IS NULL AND service_id = v_event_id_text);
    
    -- Count First Timers
    SELECT COUNT(DISTINCT sa.member_id_uuid) INTO v_service_first_timers
    FROM service_attendance sa
    JOIN members m ON (sa.member_id_uuid = m.id_uuid OR (sa.member_id_uuid IS NULL AND sa.member_id = m.id))
    WHERE (sa.service_id_uuid = event_uuid OR (sa.service_id_uuid IS NULL AND sa.service_id = v_event_id_text))
      AND m.category = 'First Timer';

    -- 3. Calculate Final Attendees & First Timers
    v_final_attendees := GREATEST(v_passenger_count + v_logistics_children, v_service_attendance_count);
    v_final_first_timers := GREATEST(v_logistics_first_timers, v_service_first_timers);

    -- 4. Souls Won: Prefer event_id_uuid
    SELECT COUNT(*) INTO v_souls_db_count FROM souls 
    WHERE (event_id_uuid = event_uuid OR (event_id_uuid IS NULL AND source_id = v_event_id_text))
      AND (source_type = 'Service');

    SELECT COUNT(*) INTO v_next_gen_souls_count FROM next_gen_souls 
    WHERE service_id::text = v_event_id_text; -- next_gen_souls doesn't have a shadow yet
    
    v_total_souls := v_souls_db_count + v_next_gen_souls_count;
    
    IF v_total_souls = 0 THEN
        v_total_souls := v_passengers_souls;
    END IF;

    -- 5. Finance Expenditure (Transactions) - No shadow needed yet for simple text match
    SELECT COALESCE(SUM(amount), 0) INTO v_finance_expenditure 
    FROM transactions 
    WHERE event_id::text = v_event_id_text AND type = 'Expense';

    -- 6. Personal Cars: Prefer service_id_uuid in vehicle_attendance
    -- (Note: vehicle_attendance wasn't shadowed in 2A, checking if it needs to be)
    -- Actually, we updated resolve_event_id to handle PV.
    SELECT COUNT(*) INTO v_personal_cars_count FROM vehicle_attendance 
    WHERE service_id::text = v_event_id_text;
    
    -- Fallback to personal_vehicles shadowed column
    IF v_personal_cars_count = 0 THEN
        SELECT COUNT(*) INTO v_personal_cars_count 
        FROM personal_vehicles 
        WHERE current_service_id_uuid = event_uuid 
           OR (current_service_id_uuid IS NULL AND attended_service_ids @> ARRAY[v_event_id_text]);
    END IF;

    -- 7. Construct JSON Response
    RETURN json_build_object(
        'vehicles', v_fleet_count,
        'personalCars', v_personal_cars_count,
        'students', v_logistics_students,
        'institutions', v_logistics_institutions,
        'attendees', v_final_attendees,
        'firstTimers', v_final_first_timers,
        'soulsWon', v_total_souls,
        'children', v_logistics_children,
        'expenditure', (v_fleet_expenditure + v_finance_expenditure)
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
