-- 66_fix_attendance_children.sql
-- Fixes get_event_highlights to properly compute Next Gen children count
-- and correctly append it to the master service attendance to eliminate 
-- discrepancies between the Registration module and the Analytics Dashboard.

BEGIN;

-- Override existing definition
DROP FUNCTION IF EXISTS get_event_highlights(uuid);

CREATE OR REPLACE FUNCTION get_event_highlights(v_event_id UUID)
RETURNS JSON AS $$
DECLARE
    -- Variables for Logistics
    v_station_ids UUID[];
    v_vehicle_ids UUID[];
    v_fleet_count INT := 0;

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
    
    -- Variables for Next Gen / Children
    v_manual_children_count INT := 0;
    v_db_children_count INT := 0;
    v_final_children_record INT := 0;
    
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
    -- 1. Logistics Stats
    SELECT ARRAY_AGG(id) INTO v_station_ids 
    FROM pickup_stations 
    WHERE event_id = v_event_id;
    
    IF v_station_ids IS NOT NULL THEN
        SELECT 
            ARRAY_AGG(id),
            COUNT(*),
            COALESCE(SUM(COALESCE(children, 0)), 0),
            COALESCE(SUM(CAST(finance_details->>'ongoingDispatch' AS DECIMAL)), 0)
        INTO 
            v_vehicle_ids,
            v_fleet_count,
            v_logistics_children,
            v_fleet_expenditure
        FROM vehicles 
        WHERE station_id = ANY(v_station_ids);
        
        IF v_vehicle_ids IS NOT NULL THEN
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
            WHERE vehicle_id = ANY(v_vehicle_ids);
        END IF;
    END IF;

    -- 2. Service Stats (Attendance Table)
    SELECT COUNT(DISTINCT member_id) INTO v_service_attendance_count 
    FROM service_attendance 
    WHERE service_id = v_event_id;
    
    -- Count First Timers in Service Attendance
    SELECT COUNT(DISTINCT sa.member_id) INTO v_service_first_timers
    FROM service_attendance sa
    JOIN members m ON sa.member_id = m.id
    WHERE sa.service_id = v_event_id AND m.category = 'First Timer';
    
    -- 2.5 Next Gen Attendance Compilation
    -- Get manual entries
    SELECT COALESCE((stats->>'manualChildrenCount')::int, 0) INTO v_manual_children_count
    FROM ministry_events
    WHERE id = v_event_id;
    
    -- Get DB scanned entries
    SELECT COUNT(*) INTO v_db_children_count 
    FROM children 
    WHERE attended_service_ids IS NOT NULL 
      AND attended_service_ids::text LIKE '%' || v_event_id::text || '%';
    
    -- Take the highest of the two
    v_final_children_record := GREATEST(v_manual_children_count, v_db_children_count);

    -- 3. Calculate Final Attendees & First Timers
    -- Internal counts incorporate both general scanning + next gen children tracking
    v_final_attendees := GREATEST(v_passenger_count + v_logistics_children, v_service_attendance_count + v_final_children_record);
    v_final_first_timers := GREATEST(v_logistics_first_timers, v_service_first_timers);

    -- 4. Souls Won (DB Source)
    SELECT COUNT(*) INTO v_souls_db_count FROM souls 
    WHERE event_id = v_event_id AND source_type = 'Service';

    SELECT COUNT(*) INTO v_next_gen_souls_count FROM next_gen_souls 
    WHERE service_id = v_event_id; 
    
    v_total_souls := v_souls_db_count + v_next_gen_souls_count;
    
    IF v_total_souls = 0 THEN
        v_total_souls := v_passengers_souls;
    END IF;

    -- 5. Finance Expenditure (Transactions)
    SELECT COALESCE(SUM(amount), 0) INTO v_finance_expenditure 
    FROM transactions 
    WHERE event_id = v_event_id AND type = 'Expense';

    -- 6. Personal Cars
    SELECT COUNT(*) INTO v_personal_cars_count FROM vehicle_attendance 
    WHERE service_id = v_event_id;
    
    IF v_personal_cars_count = 0 THEN
        SELECT COUNT(*) INTO v_personal_cars_count 
        FROM personal_vehicles 
        WHERE current_service_id_uuid = v_event_id;
    END IF;

    -- 7. Construct JSON Response (now perfectly incorporating children + service discrepancy fixes)
    RETURN json_build_object(
        'vehicles', v_fleet_count,
        'personalCars', v_personal_cars_count,
        'students', v_logistics_students,
        'institutions', v_logistics_institutions,
        'attendees', v_final_attendees,
        'firstTimers', v_final_first_timers,
        'soulsWon', v_total_souls,
        'children', GREATEST(v_logistics_children, v_final_children_record),
        'expenditure', (v_fleet_expenditure + v_finance_expenditure)
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
