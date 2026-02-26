
-- 51_fix_souls_schema.sql (Corrected Event Mapping)

DO $$ 
BEGIN
    -- 1. Add Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'souls' AND column_name = 'event_id') THEN
        ALTER TABLE public.souls ADD COLUMN event_id TEXT REFERENCES public.ministry_events(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'souls' AND column_name = 'station_id') THEN
        ALTER TABLE public.souls ADD COLUMN station_id TEXT REFERENCES public.pickup_stations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'souls' AND column_name = 'vehicle_id') THEN
        ALTER TABLE public.souls ADD COLUMN vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;

    -- 2. Backfill Valid Data
    UPDATE public.souls s
    SET event_id = s.source_id
    FROM public.ministry_events e
    WHERE s.source_type IN ('Event', 'Service') 
    AND s.event_id IS NULL
    AND s.source_id = e.id;

    -- 3. Recover Orphans (Map to Inter-Schools Conference 2026)
    UPDATE public.souls
    SET event_id = '11324002-c401-494b-be68-179650967970' -- The Inter-Schools Conference 2026
    WHERE source_id = 'evt-1769154800040' 
    AND event_id IS NULL;
    
END $$;
