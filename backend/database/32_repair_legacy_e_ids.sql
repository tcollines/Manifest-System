-- AUTO-REPAIR: Fix Legacy 'e-' IDs (e.g., e-1766929...)
-- This works exactly like the previous repair, but targets 'e-%' instead of 'evt-%'.

DO $$
DECLARE
    r_event RECORD;
    v_match_id UUID;
    v_new_id UUID;
    v_rows_migrated INT;
BEGIN
    -- Loop through all legacy 'e-' events
    FOR r_event IN 
        SELECT * FROM ministry_events WHERE id LIKE 'e-%'
    LOOP
        RAISE NOTICE 'Processing Legacy Event: % (%)', r_event.title, r_event.id;

        -- 1. Try to find a matching UUID event (Same Title + Date)
        SELECT id::uuid INTO v_match_id
        FROM ministry_events
        WHERE title = r_event.title 
          AND date = r_event.date
          AND id NOT LIKE 'e-%' 
          AND id NOT LIKE 'evt-%'
          LIMIT 1;
          
        IF v_match_id IS NOT NULL THEN
            -- MATCH FOUND: Merge data into valid UUID
            RAISE NOTICE '  -> Match found: %. Merging...', v_match_id;
            
            -- Call logic from resolve_event_id (inlined or via RPC if type safe)
            -- We invoke the RPC safely
            PERFORM resolve_event_id(r_event.id, v_match_id);
            
            -- Delete the old legacy event
            DELETE FROM ministry_events WHERE id = r_event.id;
            RAISE NOTICE '  -> Legacy event deleted.';
            
        ELSE
            -- NO MATCH: Create new UUID event, migrate, then delete old
            v_new_id := uuid_generate_v4();
            RAISE NOTICE '  -> No match. Creating new UUID: %', v_new_id;
            
            INSERT INTO ministry_events (
                id, title, type, date, time, location, description, 
                created_at, service_number
            ) VALUES (
                v_new_id::text, r_event.title, r_event.type, r_event.date, r_event.time, r_event.location, r_event.description, 
                r_event.created_at, r_event.service_number
            );
            
            -- Migrate data
            PERFORM resolve_event_id(r_event.id, v_new_id);
            
            -- Delete the old legacy event
            DELETE FROM ministry_events WHERE id = r_event.id;
            RAISE NOTICE '  -> Legacy event deleted.';
            
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
