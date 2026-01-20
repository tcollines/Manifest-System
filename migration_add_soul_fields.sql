-- Add new columns to souls table

ALTER TABLE souls ADD COLUMN IF NOT EXISTS preferred_call_time TEXT;
ALTER TABLE souls ADD COLUMN IF NOT EXISTS student_status TEXT CHECK (student_status IN ('Primary', 'Secondary', 'University/Tertiary', 'None'));
ALTER TABLE souls ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE souls ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE souls ADD COLUMN IF NOT EXISTS invited_by JSONB; -- Stores {name: string, contact: string}

-- Note: Ensure JSONB support or use TEXT if preferred, but JSONB is better for structured data
