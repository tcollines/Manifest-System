-- Drop the overly strict trigger that prevents admins from manually clearing first timer status
DROP TRIGGER IF EXISTS trg_protect_first_timer ON public.members;

-- We can drop the function as well since it's no longer used
DROP FUNCTION IF EXISTS protect_first_timer_fields();
