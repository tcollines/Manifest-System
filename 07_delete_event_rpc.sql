-- Migration 07: Delete Event Cascade RPC
-- Replaces sequential REST API loops with an instantaneous database transaction

CREATE OR REPLACE FUNCTION delete_event_cascade(
    p_manifest_id uuid,
    p_event_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_station_ids uuid[];
    v_vehicle_ids uuid[];
BEGIN
    -- Ensure event belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.ministry_events WHERE id = p_event_id AND manifest_id = p_manifest_id) THEN
        RAISE EXCEPTION 'Event not found or unauthorized';
    END IF;

    -- 1. Gather all station IDs for this event
    SELECT array_agg(id) INTO v_station_ids
    FROM public.pickup_stations
    WHERE event_id = p_event_id AND manifest_id = p_manifest_id;

    -- If there are stations, clean up their descendants
    IF v_station_ids IS NOT NULL AND array_length(v_station_ids, 1) > 0 THEN
        -- Delete users (Entrants) mapped to these stations
        DELETE FROM public.users 
        WHERE station_id = ANY(v_station_ids) AND manifest_id = p_manifest_id;

        -- Gather all vehicle IDs for these stations
        SELECT array_agg(id) INTO v_vehicle_ids
        FROM public.vehicles
        WHERE station_id = ANY(v_station_ids) AND manifest_id = p_manifest_id;

        -- If vehicles exist, delete passengers then vehicles
        IF v_vehicle_ids IS NOT NULL AND array_length(v_vehicle_ids, 1) > 0 THEN
            DELETE FROM public.passengers WHERE vehicle_id = ANY(v_vehicle_ids) AND manifest_id = p_manifest_id;
            DELETE FROM public.vehicles WHERE id = ANY(v_vehicle_ids) AND manifest_id = p_manifest_id;
        END IF;

        -- Delete the stations themselves
        DELETE FROM public.pickup_stations WHERE id = ANY(v_station_ids) AND manifest_id = p_manifest_id;
    END IF;

    -- 2. Delete Coordinators and Entrants mapped directly to this event
    DELETE FROM public.users 
    WHERE event_id = p_event_id 
      AND role IN ('Coordinator', 'Vehicle Coordinator', 'Stage Coordinator', 'Data Entrant', 'Entrant')
      AND manifest_id = p_manifest_id;

    -- 3. Array Cleanup for Members (remove event_id from attended_service_ids)
    -- Postgres >= 9.3 allows array_remove
    UPDATE public.members
    SET attended_service_ids = array_remove(attended_service_ids, p_event_id::text)
    WHERE p_event_id::text = ANY(attended_service_ids) AND manifest_id = p_manifest_id;

    -- 4. Array Cleanup for Children
    UPDATE public.children
    SET attended_service_ids = array_remove(attended_service_ids, p_event_id::text)
    WHERE p_event_id::text = ANY(attended_service_ids) AND manifest_id = p_manifest_id;

    -- 5. Array Cleanup for Personal Vehicles
    UPDATE public.personal_vehicles
    SET attended_service_ids = array_remove(attended_service_ids, p_event_id::text)
    WHERE p_event_id::text = ANY(attended_service_ids) AND manifest_id = p_manifest_id;

    -- Clear current_service_id where it matches
    UPDATE public.personal_vehicles
    SET current_service_id = NULL
    WHERE current_service_id = p_event_id AND manifest_id = p_manifest_id;

    -- 6. Delete other flat relational data
    DELETE FROM public.incidents WHERE service_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM public.souls WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM public.volunteer_attendance WHERE service_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM public.transactions WHERE event_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM public.next_gen_souls WHERE service_id = p_event_id AND manifest_id = p_manifest_id;
    DELETE FROM public.service_attendance WHERE service_id = p_event_id AND manifest_id = p_manifest_id;

    -- Wait, let's also check for asset_assignments and feedback just in case, though controllers didn't explicitly delete them.
    -- (Omitted unless requested by schema)

    -- 7. Finally delete the event itself
    DELETE FROM public.ministry_events WHERE id = p_event_id AND manifest_id = p_manifest_id;

END;
$$;
