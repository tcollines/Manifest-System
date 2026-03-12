-- =============================================================================
-- Migration 87: Manual Fuzzy Merges
-- 
-- Execution of the manual merge plan for specific fuzzy duplicates:
--   1. Nabulime Rosemary (Keep latest contact)
--   2. Busingye Latif / Businge Latif (Merge to Busingye, keep latest)
--   3. Ayo Emmanuel / Ato Emmanuel (Merge Ato into Ayo)
--   4. Amolo Winnie / Amollo Winnie (Merge to Amolo Winnie, keep latest)
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_survivor_id uuid;
    v_duplicate_id uuid;
    v_ids uuid[];
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. Nabulime Rosemary
    --    Same person, different numbers. Keep latest record / contact.
    -- -------------------------------------------------------------------------
    SELECT array_agg(id ORDER BY created_at DESC) INTO v_ids
    FROM public.members
    WHERE name ILIKE 'NABULIME ROSEMARY';
    
    IF array_length(v_ids, 1) >= 2 THEN
        v_survivor_id := v_ids[1];   -- Newest
        v_duplicate_id := v_ids[2];  -- Oldest
        
        -- Transfer attendance
        INSERT INTO public.service_attendance (manifest_id, member_id, service_id, check_in_time)
        SELECT manifest_id, v_survivor_id, service_id, check_in_time
        FROM public.service_attendance
        WHERE member_id = v_duplicate_id
        ON CONFLICT (member_id, service_id) DO NOTHING;
        
        -- Merge attended_service_ids
        UPDATE public.members
        SET attended_service_ids = (
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as elem FROM public.members WHERE id IN (v_survivor_id, v_duplicate_id) AND attended_service_ids IS NOT NULL
            ) sub
        )
        WHERE id = v_survivor_id;
        
        -- Delete duplicate
        DELETE FROM public.members WHERE id = v_duplicate_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Busingye Latif
    --    Typo in name. Correct to "BUSINGYE LATIF", keep latest contact.
    -- -------------------------------------------------------------------------
    SELECT array_agg(id ORDER BY created_at DESC) INTO v_ids
    FROM public.members
    WHERE name ILIKE 'BUSINGE LATIF' OR name ILIKE 'BUSINGYE LATIF';
    
    IF array_length(v_ids, 1) >= 2 THEN
        v_survivor_id := v_ids[1];
        v_duplicate_id := v_ids[2];
        
        UPDATE public.members 
        SET name = 'BUSINGYE LATIF', 
            name_norm = 'busingye latif' 
        WHERE id = v_survivor_id;
        
        INSERT INTO public.service_attendance (manifest_id, member_id, service_id, check_in_time)
        SELECT manifest_id, v_survivor_id, service_id, check_in_time 
        FROM public.service_attendance 
        WHERE member_id = v_duplicate_id 
        ON CONFLICT (member_id, service_id) DO NOTHING;
        
        UPDATE public.members 
        SET attended_service_ids = (
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as elem FROM public.members WHERE id IN (v_survivor_id, v_duplicate_id) AND attended_service_ids IS NOT NULL
            ) sub
        ) 
        WHERE id = v_survivor_id;
        
        DELETE FROM public.members WHERE id = v_duplicate_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 3. Ayo Emmanuel & Ato Emmanuel
    --    Double entry typo on 'ATO'. Keep 'AYO' as primary. (Kato untouched).
    -- -------------------------------------------------------------------------
    SELECT id INTO v_survivor_id FROM public.members WHERE name ILIKE 'AYO EMMANUEL' LIMIT 1;
    SELECT id INTO v_duplicate_id FROM public.members WHERE name ILIKE 'ATO EMMANUEL' LIMIT 1;
    
    IF v_survivor_id IS NOT NULL AND v_duplicate_id IS NOT NULL THEN
        INSERT INTO public.service_attendance (manifest_id, member_id, service_id, check_in_time)
        SELECT manifest_id, v_survivor_id, service_id, check_in_time 
        FROM public.service_attendance 
        WHERE member_id = v_duplicate_id 
        ON CONFLICT (member_id, service_id) DO NOTHING;
        
        UPDATE public.members 
        SET attended_service_ids = (
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as elem FROM public.members WHERE id IN (v_survivor_id, v_duplicate_id) AND attended_service_ids IS NOT NULL
            ) sub
        ) 
        WHERE id = v_survivor_id;
        
        DELETE FROM public.members WHERE id = v_duplicate_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 4. Amolo Winnie
    --    Typo "Amollo". Correct to "AMOLO WINNIE", keep latest contact.
    -- -------------------------------------------------------------------------
    SELECT array_agg(id ORDER BY created_at DESC) INTO v_ids
    FROM public.members
    WHERE name ILIKE 'AMOLLO WINNIE' OR name ILIKE 'AMOLO WINNIE';
    
    IF array_length(v_ids, 1) >= 2 THEN
        v_survivor_id := v_ids[1];
        v_duplicate_id := v_ids[2];
        
        UPDATE public.members 
        SET name = 'AMOLO WINNIE', 
            name_norm = 'amolo winnie' 
        WHERE id = v_survivor_id;
        
        INSERT INTO public.service_attendance (manifest_id, member_id, service_id, check_in_time)
        SELECT manifest_id, v_survivor_id, service_id, check_in_time 
        FROM public.service_attendance 
        WHERE member_id = v_duplicate_id 
        ON CONFLICT (member_id, service_id) DO NOTHING;
        
        UPDATE public.members 
        SET attended_service_ids = (
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as elem FROM public.members WHERE id IN (v_survivor_id, v_duplicate_id) AND attended_service_ids IS NOT NULL
            ) sub
        ) 
        WHERE id = v_survivor_id;
        
        DELETE FROM public.members WHERE id = v_duplicate_id;
    END IF;

END $$;

COMMIT;
