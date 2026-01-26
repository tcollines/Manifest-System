
-- Enable Realtime for all relevant tables to ensure dashboards sync properly
-- This script is idempotent: it checks if tables are already in the publication before adding them.

-- 1. Enable replication for tables (Safe to run multiple times)
ALTER TABLE vehicles REPLICA IDENTITY FULL;
ALTER TABLE children REPLICA IDENTITY FULL;
ALTER TABLE passengers REPLICA IDENTITY FULL;
ALTER TABLE personal_vehicles REPLICA IDENTITY FULL;
ALTER TABLE requisitions REPLICA IDENTITY FULL;
-- ministry_events and users usually have this set, but ensuring it doesn't hurt
ALTER TABLE ministry_events REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;

-- 2. Add tables to the supabase_realtime publication safely
-- We use DO blocks to check existence first to avoid "already member" errors.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vehicles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'children') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE children;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'passengers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE passengers;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'personal_vehicles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE personal_vehicles;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'requisitions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE requisitions;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ministry_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ministry_events;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
    END IF;
END $$;
