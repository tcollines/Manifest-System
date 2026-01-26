-- Create vehicle_attendance table
create table public.vehicle_attendance (
  id uuid default gen_random_uuid() primary key,
  vehicle_id text not null references public.personal_vehicles(id) on delete cascade,
  service_id text not null references public.ministry_events(id) on delete cascade,
  check_in_time timestamp with time zone default timezone('utc'::text, now()) not null,
  check_out_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for performance
create index idx_vehicle_attendance_vehicle_id on public.vehicle_attendance(vehicle_id);
create index idx_vehicle_attendance_service_id on public.vehicle_attendance(service_id);

-- Optional: If you want to backfill from existing array data (advanced, requires script)
