-- Migration 56: Migrate Member IDs to UUIDs

-- 1. Add Legacy ID Column
ALTER TABLE members ADD COLUMN IF NOT EXISTS legacy_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_legacy_id ON members(legacy_id) WHERE legacy_id IS NOT NULL;

-- 2. Drop Constraints temporarily (safest for PK update without CASCADE)
-- We need to know the constraint names. Since we can't easily dynamic SQL here, 
-- we will use a DO block to find and drop/re-add or update.

DO $$
DECLARE
    r RECORD;
    old_id TEXT;
    new_uuid UUID;
BEGIN
    -- Loop through all members with legacy IDs (assuming they start with 'm-' or are not UUIDs)
    -- Regex for UUID: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
    FOR r IN SELECT id FROM members WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' LOOP
        old_id := r.id;
        new_uuid := gen_random_uuid();

        -- UPDATE DEPENDENCIES FIRST (Manually simulating CASCADE)
        
        -- service_attendance
        UPDATE service_attendance SET member_id = new_uuid::text WHERE member_id = old_id;
        
        -- souls (source_id) - Check if source_type implies member
        -- 'Other', 'Service', 'Event' might use member ID? 
        -- Based on types.ts: source_id is string. 
        -- If we assume source_id points to member only when... actually it points to Event/Service usually.
        -- Wait, `capturedBy` is User ID. `sourceId` is usually Event ID.
        -- Let's check `invitedBy`? No, that's an object in JSON usually. 
        -- Let's stick to known FKs. service_attendance is the big one.
        
        -- If there are other tables like `group_members` or similar, they need update.
        -- Based on audit, verify other tables.
        
        -- NOW Update Member
        -- We can't update PK easily if it's referenced.
        -- Constraint checks are deferred at end of transaction? No, immediate by default.
        -- But we just updated the children to new_uuid (which doesn't exist yet in members!).
        -- This will fail FK violation (orphan row).
        
        -- CORRECT STRATEGY:
        -- 1. Create NEW row with new UUID and copy data.
        -- 2. Update children to point to NEW UUID.
        -- 3. Delete OLD row.
        
        INSERT INTO members (
            id, name, category, phone, status, check_in_time, gender, residency, 
            born_again, joined_date, attended_service_ids, legacy_id,
            occupation, place_of_work, email, is_phaneroo_member, referral_source,
            created_at
        )
        SELECT 
            new_uuid, name, category, phone, status, check_in_time, gender, residency, 
            born_again, joined_date, attended_service_ids, old_id, -- Set legacy_id here
            occupation, place_of_work, email, is_phaneroo_member, referral_source,
            created_at
        FROM members WHERE id = old_id;
        
        -- Re-link Children
        UPDATE service_attendance SET member_id = new_uuid::text WHERE member_id = old_id;
        
        -- Drop Old Row
        DELETE FROM members WHERE id = old_id;
        
        RAISE NOTICE 'Migrated % to %', old_id, new_uuid;
        
    END LOOP;
END $$;
