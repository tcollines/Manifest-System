DO $$
DECLARE
  todays_service_id text;
  -- List of names to update
  target_names text[] := ARRAY[
    'Mutyaba Tonny', 
    'Mwanje Andrew', 
    'Ssanyu Genevieve', 
    'Airdu Jeremiah'
  ];
  formatted_date text := to_char(now(), 'YYYY-MM-DD');
BEGIN
  -- 1. Get the Service ID for today
  SELECT id INTO todays_service_id 
  FROM ministry_events 
  WHERE date = formatted_date 
  LIMIT 1;

  IF todays_service_id IS NOT NULL THEN
    RAISE NOTICE 'Found Service ID: % for Date: %', todays_service_id, formatted_date;

    -- 2. Update the children (Handling JSONB column for attended_service_ids)
    UPDATE children
    SET 
      category = 'First Timer',
      status = 'Checked In',
      check_in_time = COALESCE(check_in_time, to_char(now(), 'HH12:MI AM')),
      attended_service_ids = (
        CASE 
            -- Check if current value is null
            WHEN attended_service_ids IS NULL THEN jsonb_build_array(todays_service_id)
            -- Check if it already contains the ID
            WHEN attended_service_ids @> jsonb_build_array(todays_service_id) THEN attended_service_ids
            -- Append
            ELSE attended_service_ids || jsonb_build_array(todays_service_id)
        END
      )
    WHERE name = ANY(target_names);
    
    RAISE NOTICE 'Updated records for: %', target_names;
  ELSE
    RAISE NOTICE 'No service found for today (%)', formatted_date;
  END IF;
END $$;
