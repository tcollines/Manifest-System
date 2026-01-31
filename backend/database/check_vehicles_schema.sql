-- DIAGNOSTIC: Check Vehicles and Passengers Schema
-- Needed to write the vehicle repair script accurately.

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'passengers';
