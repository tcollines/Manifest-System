
-- 59_phase_3c_rpc_optimization.sql
-- Goal: Fix get_event_highlights which was broken by the Phase 3B schema flip (renamed id_uuid -> id).

BEGIN;

-- 1. Drop old function versions
DROP FUNCTION IF EXISTS get_event_highlights(uuid);
DROP FUNCTION IF EXISTS get_event_highlights(text);

-- 2. Create the optimized function for Native UUID Schema
CREATE OR REPLACE FUNCTION get_event_highlights(event_uuid UUID)
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
    -- 1. Logistics Stats: Aggregate stations linked to this event
    SELECT ARRAY_AGG(id) INTO v_station_ids 
    FROM public.pickup_stations 
    WHERE event_id = event_uuid;
    
    IF v_station_ids IS NOT NULL THEN
        -- Get Vehicle Aggregates
        SELECT 
            ARRAY_AGG(id),
            COUNT(*),
            COALESCE(SUM(COALESCE(children, 0)), 0),
            COALESCE(SUM(CAST(NULLIF(finance_details->>'ongoingDispatch', '') AS DECIMAL)), 0)
        INTO 
            v_vehicle_ids,
            v_fleet_count,
            v_logistics_children,
            v_fleet_expenditure
        FROM public.vehicles 
        WHERE station_id = ANY(v_station_ids);
        
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
            FROM public.passengers 
            WHERE vehicle_id = ANY(v_vehicle_ids);
        END IF;
    END IF;

    -- 2. Service Stats (Attendance Table)
    SELECT COUNT(DISTINCT member_id) INTO v_service_attendance_count 
    FROM public.service_attendance 
    WHERE service_id = event_uuid;
    
    -- Count First Timers in Service Attendance (Cross-reference Members table)
    SELECT COUNT(DISTINCT sa.member_id) INTO v_service_first_timers
    FROM public.service_attendance sa
    JOIN public.members m ON sa.member_id = m.id
    WHERE sa.service_id = event_uuid AND m.category = 'First Timer';

    -- 3. Calculate Final Attendees & First Timers (Max Logic: Logistics vs Service)
    -- This handles both "Physical Events" (Transportation based) and "Regular Services" (Attendance based)
    v_final_attendees := GREATEST(v_passenger_count + v_logistics_children, v_service_attendance_count);
    v_final_first_timers := GREATEST(v_logistics_first_timers, v_service_first_timers);

    -- 4. Souls Won (Check main Souls table + Next Gen specialized table)
    SELECT COUNT(*) INTO v_souls_db_count 
    FROM public.souls 
    WHERE source_id = event_uuid::text OR event_id = event_uuid;

    SELECT COUNT(*) INTO v_next_gen_souls_count 
    FROM public.next_gen_souls 
    WHERE service_id = event_uuid;
    
    v_total_souls := v_souls_db_count + v_next_gen_souls_count;
    
    -- Fallback to passenger table soul_won flag if no direct soul records found
    IF v_total_souls = 0 THEN
        v_total_souls := v_passengers_souls;
    END IF;

    -- 5. Finance Expenditure (Transactions)
    SELECT COALESCE(SUM(amount), 0) INTO v_finance_expenditure 
    FROM public.transactions 
    WHERE event_id = event_uuid AND type = 'Expense';

    -- 6. Personal Cars (Attended Services Array)
    SELECT COUNT(*) INTO v_personal_cars_count 
    FROM public.personal_vehicles 
    WHERE current_service_id = event_uuid 
       OR attended_service_ids @> ARRAY[event_uuid::text];

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
