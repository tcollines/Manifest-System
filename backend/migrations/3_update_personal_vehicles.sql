-- Ensure personal_vehicles has the necessary columns for tracking status
alter table public.personal_vehicles 
add column if not exists current_service_id text references public.ministry_events(id),
add column if not exists attended_service_ids text[],
add column if not exists check_in_time text,
add column if not exists check_out_time text;

-- Add index for performance on current_service_id
create index if not exists idx_personal_vehicles_current_service_id on public.personal_vehicles(current_service_id);
