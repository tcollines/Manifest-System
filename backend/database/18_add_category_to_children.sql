-- Add 'category' column to children table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'category') THEN
        ALTER TABLE public.children ADD COLUMN category text DEFAULT 'Member';
    END IF;
END $$;
