-- Backfill existing First Timers
-- 1. Identify members with category 'First Timer' who don't have is_first_timer set
-- 2. Set is_first_timer = true
-- 3. Set first_timer_date based on joined_date or created_at
-- 4. Leave first_timer_service_id as NULL (since we can't be sure unless we trace attendance)

UPDATE public.members 
SET 
  is_first_timer = true, 
  first_timer_date = COALESCE(joined_date::date, check_in_time::date, created_at::date, NOW()::date)
WHERE 
  category = 'First Timer' 
  AND (is_first_timer IS NULL OR is_first_timer = false);

-- Note: We do NOT set first_timer_service_id during backfill as it's historical data
