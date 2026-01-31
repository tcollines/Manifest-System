-- CHECK SCHEMA: pickup_stations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pickup_stations';
