-- MIGRATION: Repair Historical Event Data (evt-* -> UUID)
-- Objective: Eliminate all 'evt-*' IDs by migrating their data to valid UUIDs.
-- Strategy:
-- 1. Loop through all 'evt-%' events.
-- 2. Try to find a matching UUID event (Same Title & Date).
-- 3. If found, migrate data to the match.
-- 4. If not found, create a new UUID match and migrate data.
-- 5. Delete the 'evt-%' row.
-- 6. Add constraint to prevent future 'evt-%' inserts.

DO $$
DECLARE
    r_event RECORD;
    v_match_id UUID;
    v_new_id UUID;
    v_migrated_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting Historic Event Repair...';

    FOR r_event IN 
        SELECT * FROM ministry_events WHERE id LIKE 'evt-%'
    LOOP
        RAISE NOTICE 'Processing Temp Event: % (%)', r_event.title, r_event.id;
        
        -- 1. Try to find an existing UUID match (Title + Date)
        -- We ignore other evt- IDs in this lookup
        SELECT id::uuid INTO v_match_id
        FROM ministry_events
        WHERE title = r_event.title 
          AND date = r_event.date
          AND id NOT LIKE 'evt-%'
          LIMIT 1;
          
        IF v_match_id IS NOT NULL THEN
            RAISE NOTICE '  -> Found existing match: %', v_match_id;
            
            -- Move data to existing match
            PERFORM resolve_event_id(r_event.id, v_match_id);
            
            -- Delete the temp event
            DELETE FROM ministry_events WHERE id = r_event.id;
            
        ELSE
            -- No match found. Create a NEW UUID event.
            v_new_id := uuid_generate_v4();
            RAISE NOTICE '  -> No match. Creating new UUID: %', v_new_id;
            
            INSERT INTO ministry_events (
                id, title, type, date, time, location, description, 
                created_at, service_number
            ) VALUES (
                v_new_id::text, r_event.title, r_event.type, r_event.date, r_event.time, r_event.location, r_event.description, 
                r_event.created_at, r_event.service_number
            );
            
            -- Move data to new UUID
            PERFORM resolve_event_id(r_event.id, v_new_id);
            
            -- Delete the temp event
            DELETE FROM ministry_events WHERE id = r_event.id;
            
        END IF;
        
        v_migrated_count := v_migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Repair Complete. Processed % events.', v_migrated_count;
END;
$$ LANGUAGE plpgsql;
