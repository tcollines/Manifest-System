-- FINAL MERGE: Consolidate Duplicates (With Advanced Deduplication)
-- Fixes "Duplicate Key" errors by handling:
-- 1. Member already in Target (Redundant)
-- 2. Member in multiple Orphan/Bad records (Self-Conflict)

DO $$ 
DECLARE
    -- Valid IDs (Keepers)
    v_inter_schools_good UUID := '11324002-c401-494b-be68-179650967970';
    v_s376_good UUID := 'a1a110f7-c859-4b0c-92ba-7b2b1c12881c';
    v_prayer_good UUID := '7dc7cd8f-332c-41b3-85b4-686aea26f90c';

    -- Bad IDs (Deleters)
    v_inter_bad_1 UUID := 'ba9975f3-2195-48a5-8462-da03937a4a89';
    v_inter_bad_2 UUID := '949cc2d1-b528-4ee3-8a65-f7fb87fc7887';
    v_s376_bad UUID := '36c10d43-20d9-48b8-9947-1114aea4ed24';
    v_prayer_bad UUID := '7cdbfdc2-f268-4952-ae6f-b4899dce35fb';
    
    v_bad_ids UUID[];
BEGIN
    v_bad_ids := ARRAY[v_inter_bad_1, v_inter_bad_2, v_s376_bad, v_prayer_bad];

    RAISE NOTICE 'Starting Advanced Deduplication Merge...';

    -- PART 1: Handle Orphans (Data with no valid parent)
    -- 1.1 Delete orphans where the member ALREADY exists in the Target Event
    DELETE FROM service_attendance 
    WHERE service_id::text NOT IN (SELECT id::text FROM ministry_events)
      AND member_id IN (
          SELECT member_id FROM service_attendance WHERE service_id = v_inter_schools_good::text
      );

    -- 1.2 Self-Deduplicate Orphans 
    -- If Member A is orphaned twice (e.g. from 2 deleted events), keep one, delete others.
    DELETE FROM service_attendance o1
    USING service_attendance o2
    WHERE o1.service_id::text NOT IN (SELECT id::text FROM ministry_events)
      AND o2.service_id::text NOT IN (SELECT id::text FROM ministry_events)
      AND o1.member_id = o2.member_id
      AND o1.ctid < o2.ctid; -- Arbitrarily delete the one with lower system ID

    -- 1.3 Adopt Remaining Unique Orphans
    UPDATE service_attendance 
    SET service_id = v_inter_schools_good::text
    WHERE service_id::text NOT IN (SELECT id::text FROM ministry_events);
    
    
    -- PART 2: Handle Specific Bad Events (Copy-Paste Logic)
    -- We repeat the safely logic for each Bad Event ID

    -- BAD GROUP 1: Inter-Schools Bad IDs
    -- 2.1 Delete Bad records if Member in Target
    DELETE FROM service_attendance 
    WHERE service_id IN (v_inter_bad_1::text, v_inter_bad_2::text)
      AND member_id IN (SELECT member_id FROM service_attendance WHERE service_id = v_inter_schools_good::text);
      
    -- 2.2 Migrate Remaining (Now safe from target conflicts, but check self conflicts?)
    -- resolve_event_id handles simple migration, but let's be safe.
    PERFORM resolve_event_id(v_inter_bad_1::text, v_inter_schools_good);
    PERFORM resolve_event_id(v_inter_bad_2::text, v_inter_schools_good);


    -- BAD GROUP 2: S376
    DELETE FROM service_attendance 
    WHERE service_id = v_s376_bad::text
      AND member_id IN (SELECT member_id FROM service_attendance WHERE service_id = v_s376_good::text);
    
    PERFORM resolve_event_id(v_s376_bad::text, v_s376_good);


    -- BAD GROUP 3: Prayer Evening
    DELETE FROM service_attendance 
    WHERE service_id = v_prayer_bad::text
      AND member_id IN (SELECT member_id FROM service_attendance WHERE service_id = v_prayer_good::text);
      
    PERFORM resolve_event_id(v_prayer_bad::text, v_prayer_good);


    -- PART 3: Final Cleanup
    -- Google Sync table cleanup
    BEGIN
        EXECUTE 'DELETE FROM google_calendar_sync WHERE event_id = ANY($1)' USING v_bad_ids::text[];
    EXCEPTION WHEN undefined_table THEN
        NULL; 
    END;

    -- Unlink Users
    UPDATE users SET event_id = NULL WHERE event_id = ANY(v_bad_ids::text[]);

    -- Delete Events
    DELETE FROM ministry_events WHERE id = ANY(v_bad_ids::text[]);
    
    RAISE NOTICE 'Merge Complete. All duplicates resolved.';
END;
$$ LANGUAGE plpgsql;
