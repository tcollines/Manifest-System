-- Function to get aggregated event highlights
-- REVISION 3: Reverted input type to UUID.
-- Reason: Enforcing Backend Sole Authority. Temp IDs must be resolved before calling this.

-- 1. Drop the flexible function (TEXT)
DROP FUNCTION IF EXISTS get_event_highlights(text);
-- Drop old UUID one just in case
DROP FUNCTION IF EXISTS get_event_highlights(uuid);

-- 2. Create the strict function (UUID)
CREATE OR REPLACE FUNCTION get_event_highlights(event_uuid UUID)
RETURNS JSON AS $$
DECLARE
    -- Variables for Logistics
    v_station_ids UUID[];
    v_vehicle_ids UUID[];
    v_fleet_count INT := 0;
    v_event_id_text TEXT := event_uuid::text; -- Cast once for comparisons

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
    -- 1. Logistics Stats
    -- SAFELY Aggregate only valid UUIDs, ignoring legacy 's-' or 'evt-' IDs in station table
    SELECT ARRAY_AGG(id) INTO v_station_ids 
    FROM pickup_stations 
    WHERE event_id::text = v_event_id_text
      AND id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; -- Regex for UUID
    
    IF v_station_ids IS NOT NULL THEN
        -- Get Vehicle IDs and Aggregates from Vehicles
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
        WHERE station_id = ANY(v_station_ids::text[]);
        
        IF v_vehicle_ids IS NOT NULL THEN
            -- Get Passenger Aggregates
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
            WHERE vehicle_id = ANY(v_vehicle_ids::text[]);
        END IF;
    END IF;

    -- 2. Service Stats (Attendance Table)
    SELECT COUNT(DISTINCT member_id) INTO v_service_attendance_count 
    FROM service_attendance 
    WHERE service_id::text = v_event_id_text;
    
    -- Count First Timers in Service Attendance
    SELECT COUNT(DISTINCT sa.member_id) INTO v_service_first_timers
    FROM service_attendance sa
    JOIN members m ON sa.member_id = m.id
    WHERE sa.service_id::text = v_event_id_text AND m.category = 'First Timer';

    -- 3. Calculate Final Attendees & First Timers (Max Logic)
    v_final_attendees := GREATEST(v_passenger_count + v_logistics_children, v_service_attendance_count);
    v_final_first_timers := GREATEST(v_logistics_first_timers, v_service_first_timers);

    -- 4. Souls Won (DB Source)
    SELECT COUNT(*) INTO v_souls_db_count FROM souls 
    WHERE source_id = v_event_id_text AND source_type = 'Service';

    SELECT COUNT(*) INTO v_next_gen_souls_count FROM next_gen_souls 
    WHERE service_id::text = v_event_id_text;
    
    v_total_souls := v_souls_db_count + v_next_gen_souls_count;
    
    IF v_total_souls = 0 THEN
        v_total_souls := v_passengers_souls;
    END IF;

    -- 5. Finance Expenditure (Transactions)
    SELECT COALESCE(SUM(amount), 0) INTO v_finance_expenditure 
    FROM transactions 
    WHERE event_id::text = v_event_id_text AND type = 'Expense';

    -- 6. Personal Cars
    SELECT COUNT(*) INTO v_personal_cars_count FROM vehicle_attendance 
    WHERE service_id::text = v_event_id_text;
    
    -- Fallback
    IF v_personal_cars_count = 0 THEN
        SELECT COUNT(*) INTO v_personal_cars_count 
        FROM personal_vehicles 
        WHERE attended_service_ids @> ARRAY[v_event_id_text];
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
