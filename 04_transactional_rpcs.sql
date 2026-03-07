-- Migration 04: Transactional RPCs
-- Purpose: Move multi-step business logic from the React frontend into atomic Postgres 
-- functions to eliminate chained network requests, partial success states, and race conditions.

-- =========================================================================
-- 1. rpc_checkin_passenger
-- Atomically verify a passenger, ensuring no lost updates via optimistic locking.
-- =========================================================================
CREATE OR REPLACE FUNCTION rpc_checkin_passenger(
    p_passenger_id UUID,
    p_is_verified BOOLEAN,
    p_expected_version INT
) RETURNS JSONB AS $$
DECLARE
    v_row public.passengers%ROWTYPE;
BEGIN
    UPDATE public.passengers
    SET verified = p_is_verified
    WHERE id = p_passenger_id AND version = p_expected_version
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'Concurrency Conflict: Passenger version mismatch or not found';
    END IF;

    RETURN to_jsonb(v_row);
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 2. rpc_start_return_journey (Replaces the frontend iteration)
-- Atomically flips the vehicle to 'Return' mode AND resets all passengers to unverified.
-- =========================================================================
CREATE OR REPLACE FUNCTION rpc_start_return_journey(
    p_vehicle_id UUID,
    p_expected_version INT
) RETURNS JSONB AS $$
DECLARE
    v_row public.vehicles%ROWTYPE;
BEGIN
    -- 1. Reset all passengers linked to this vehicle in a single statement
    UPDATE public.passengers 
    SET verified = false 
    WHERE vehicle_id = p_vehicle_id;

    -- 2. Update the vehicle to Return defaults under lock
    UPDATE public.vehicles
    SET 
        journey_direction = 'Return',
        current_stage = 'Onboarding',
        approvals = '{"registration": "Pending", "finance": "Pending"}'::jsonb
    WHERE id = p_vehicle_id AND version = p_expected_version
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'Concurrency Conflict: Vehicle version mismatch or not found';
    END IF;

    RETURN to_jsonb(v_row);
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 3. rpc_update_vehicle_stage
-- Safely transitions a vehicle stage with timestamp capturing.
-- =========================================================================
CREATE OR REPLACE FUNCTION rpc_update_vehicle_stage(
    p_vehicle_id UUID,
    p_new_stage TEXT,
    p_approvals JSONB,
    p_update_fields JSONB, -- For passing timestamps safely
    p_expected_version INT
) RETURNS JSONB AS $$
DECLARE
    v_row public.vehicles%ROWTYPE;
BEGIN
    UPDATE public.vehicles
    SET 
        current_stage = p_new_stage,
        approvals = p_approvals,
        status = COALESCE(p_update_fields->>'status', status),
        ongoing_start_time = COALESCE(p_update_fields->>'ongoingStartTime', ongoing_start_time),
        return_start_time = COALESCE(p_update_fields->>'returnStartTime', return_start_time),
        ongoing_arrival_time = COALESCE(p_update_fields->>'ongoingArrivalTime', ongoing_arrival_time),
        return_arrival_time = COALESCE(p_update_fields->>'returnArrivalTime', return_arrival_time)
    WHERE id = p_vehicle_id AND version = p_expected_version
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'Concurrency Conflict: Vehicle version mismatch or not found';
    END IF;

    RETURN to_jsonb(v_row);
END;
$$ LANGUAGE plpgsql;
