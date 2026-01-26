-- Create table for Personal Vehicles (Parking Module)
CREATE TABLE IF NOT EXISTS personal_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number_plate TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_contact TEXT,
    status TEXT DEFAULT 'Absent', -- 'Checked In', 'Checked Out', 'Absent'
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    current_service_id UUID REFERENCES ministry_events(id),
    registered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for searching by number plate
CREATE INDEX IF NOT EXISTS idx_personal_vehicles_plate ON personal_vehicles(number_plate);
