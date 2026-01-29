-- Add 'children' column to vehicles table to store the count of children
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'children') THEN
        ALTER TABLE public.vehicles ADD COLUMN children integer DEFAULT 0;
    END IF;
END $$;
