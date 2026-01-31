-- Backfill existing children
-- If category is 'First Timer', set is_first_timer = true
UPDATE public.children
SET 
  is_first_timer = true,
  first_timer_date = COALESCE(joined_date::date, created_at::date, NOW()::date)
WHERE category = 'First Timer' AND is_first_timer = false;

-- Note: We cannot guess 'first_timer_service_id' for historical records unless we dig into attended_service_ids.
-- For now, date is enough.
