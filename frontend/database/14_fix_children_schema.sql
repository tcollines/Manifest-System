-- Ensure children table has all necessary columns
CREATE TABLE IF NOT EXISTS public.children (
    id text PRIMARY KEY,
    name text NOT NULL,
    parent_name text,
    parent_contact text,
    age integer,
    gender text,
    residence text,
    status text DEFAULT 'Absent',
    check_in_time text,
    check_out_time text,
    joined_date text,
    attended_service_ids text[] DEFAULT '{}'::text[]
);

-- Add columns if they don't exist (migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'status') THEN
        ALTER TABLE public.children ADD COLUMN status text DEFAULT 'Absent';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'check_in_time') THEN
        ALTER TABLE public.children ADD COLUMN check_in_time text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'check_out_time') THEN
        ALTER TABLE public.children ADD COLUMN check_out_time text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'attended_service_ids') THEN
        ALTER TABLE public.children ADD COLUMN attended_service_ids text[] DEFAULT '{}'::text[];
    END IF;
END $$;
