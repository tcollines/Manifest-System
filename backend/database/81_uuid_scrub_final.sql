-- Final UUID Data Scrub Migration
-- Safely converts the remaining 16 legacy 'text' ID columns into native 'uuid' types.

DO $$
BEGIN
    -- 1. Assets
    ALTER TABLE public.assets 
        ALTER COLUMN department_id TYPE uuid USING NULLIF(department_id, '')::uuid;

    -- 2. Children
    ALTER TABLE public.children 
        ALTER COLUMN first_timer_service_id TYPE uuid USING NULLIF(first_timer_service_id, '')::uuid,
        ALTER COLUMN place_id TYPE uuid USING NULLIF(place_id, '')::uuid;

    -- 3. Department Requests (PK/FK check)
    ALTER TABLE public.department_requests 
        ALTER COLUMN id TYPE uuid USING NULLIF(id, '')::uuid;

    -- 4. Members
    ALTER TABLE public.members 
        ALTER COLUMN first_timer_service_id TYPE uuid USING NULLIF(first_timer_service_id, '')::uuid,
        ALTER COLUMN place_id TYPE uuid USING NULLIF(place_id, '')::uuid;

    -- 5. Next Gen Souls
    ALTER TABLE public.next_gen_souls 
        ALTER COLUMN service_id TYPE uuid USING NULLIF(service_id, '')::uuid;

    -- 6. Personal Vehicles
    ALTER TABLE public.personal_vehicles 
        ALTER COLUMN current_service_id TYPE uuid USING NULLIF(current_service_id, '')::uuid;

    -- 7. Requisitions
    ALTER TABLE public.requisitions 
        ALTER COLUMN department_id TYPE uuid USING NULLIF(department_id, '')::uuid,
        ALTER COLUMN requester_id TYPE uuid USING NULLIF(requester_id, '')::uuid;

    -- 8. Souls
    ALTER TABLE public.souls 
        ALTER COLUMN source_id TYPE uuid USING NULLIF(source_id, '')::uuid;

    -- 9. Transactions
    ALTER TABLE public.transactions 
        ALTER COLUMN event_id TYPE uuid USING NULLIF(event_id, '')::uuid,
        ALTER COLUMN id TYPE uuid USING NULLIF(id, '')::uuid;

    -- 10. Users
    ALTER TABLE public.users 
        ALTER COLUMN event_id TYPE uuid USING NULLIF(event_id, '')::uuid,
        ALTER COLUMN station_id TYPE uuid USING NULLIF(station_id, '')::uuid;

    -- 11. Vehicle Attendance
    ALTER TABLE public.vehicle_attendance 
        ALTER COLUMN service_id TYPE uuid USING NULLIF(service_id, '')::uuid;

    RAISE NOTICE 'Successfully scrubbed all text IDs to UUIDs!';
END $$;
