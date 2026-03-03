-- Migration 05: State Machine Guards
-- Purpose: Enforce strict linear operational flow logic on the backend for Vehicles.
-- Any illegal forward jump or backward regression is rejected at the database level.

-- Helper Function to define the valid order of Journey Stages
CREATE OR REPLACE FUNCTION get_stage_weight(stage TEXT)
RETURNS INT IMMUTABLE AS $$
BEGIN
    RETURN CASE stage
        WHEN 'Onboarding' THEN 1
        WHEN 'Verifying' THEN 2
        WHEN 'RegApproval' THEN 3
        WHEN 'FinanceApproval' THEN 4
        WHEN 'Transit' THEN 5
        WHEN 'Arrived' THEN 6
        WHEN 'Completed' THEN 7
        ELSE 0 -- Unknown stage
    END;
END;
$$ LANGUAGE plpgsql;


-- Trigger Function enforcing State Machine logic
CREATE OR REPLACE FUNCTION trg_enforce_vehicle_state_machine()
RETURNS TRIGGER AS $$
DECLARE
    old_weight INT;
    new_weight INT;
BEGIN
    -- Only enforce if current_stage is actually changing
    IF OLD.current_stage IS NOT DISTINCT FROM NEW.current_stage THEN
        RETURN NEW;
    END IF;

    old_weight := get_stage_weight(OLD.current_stage::TEXT);
    new_weight := get_stage_weight(NEW.current_stage::TEXT);

    -- 1. Prevent Regressions (Going backward in the state logic)
    IF new_weight < old_weight THEN
        -- **EXCEPTION 1:** The RPC flips a vehicle from 'Ongoing' to 'Return' journey, which legally resets stage to Onboarding
        IF NEW.journey_direction = 'Return' AND OLD.journey_direction = 'Ongoing' THEN
             RETURN NEW;
        END IF;

        -- **EXCEPTION 2:** An Admin might need to revert a stage (e.g. from Transit back to FinanceApproval if departure is cancelled).
        -- We allow regressions ONLY IF the user making the query is bypassing RLS (Service Role) or is a superadmin, 
        -- but since we cannot easily detect backend role here without querying auth.users, we strictly block it for safety, 
        -- unless they update some bypass column. For now, strictly block.
        RAISE EXCEPTION 'State Regression Error: Cannot move vehicle backward from % to %', OLD.current_stage, NEW.current_stage;
    END IF;

    -- 2. Prevent Skipped Stages (Forward Jumps)
    IF new_weight > old_weight + 1 THEN
        -- **EXCEPTION 1:** On RETURN journeys, 'RegApproval' (3) is skipped. 'Verifying' (2) goes straight to 'FinanceApproval' (4).
        IF OLD.journey_direction = 'Return' AND OLD.current_stage = 'Verifying' AND NEW.current_stage = 'FinanceApproval' THEN
            RETURN NEW;
        END IF;

        -- **EXCEPTION 2:** On RETURN journeys, clicking "Arrived" actually jumps immediately from 'Transit' (5) to 'Completed' (7).
        IF OLD.journey_direction = 'Return' AND OLD.current_stage = 'Transit' AND NEW.current_stage = 'Completed' THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'State Jump Error: Cannot skip stages. Attempted illegal jump from % to %', OLD.current_stage, NEW.current_stage;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the Trigger
DROP TRIGGER IF EXISTS trg_guard_vehicle_state_machine ON public.vehicles;

CREATE TRIGGER trg_guard_vehicle_state_machine
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION trg_enforce_vehicle_state_machine();
