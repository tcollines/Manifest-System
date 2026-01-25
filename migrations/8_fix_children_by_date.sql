DO $$
DECLARE
  target_date text := '2026-01-25';
  todays_service_id text;
BEGIN
  -- 1. Get the Service ID for that date
  SELECT id INTO todays_service_id 
  FROM ministry_events 
  WHERE date = target_date 
  LIMIT 1;

  IF todays_service_id IS NOT NULL THEN
    RAISE NOTICE 'Found Service ID: % for Date: %', todays_service_id, target_date;

    -- 2. Update ALL children who joined on this date
    UPDATE children
    SET 
      category = 'First Timer',
      status = 'Checked In',
      check_in_time = COALESCE(check_in_time, '10:00 AM'), -- Default time if missing
      attended_service_ids = (
        CASE 
            WHEN attended_service_ids IS NULL THEN jsonb_build_array(todays_service_id)
            WHEN attended_service_ids @> jsonb_build_array(todays_service_id) THEN attended_service_ids
            ELSE attended_service_ids || jsonb_build_array(todays_service_id)
        END
      )
    WHERE joined_date = target_date;
    
    RAISE NOTICE 'Updated all children joined on %', target_date;
  ELSE
    RAISE NOTICE 'No service found for date (%)', target_date;
  END IF;
END $$;
