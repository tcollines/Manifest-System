-- Create Assets Table
create table if not exists public.assets (
  id uuid default gen_random_uuid() primary key,
  asset_number text not null,
  name text not null,
  description text,
  serial_number text,
  date_procured date,
  value_at_purchase numeric,
  department_id text not null, -- Stores the department code/id (e.g., 'd1', 'd2')
  current_condition text,
  storage_location text,
  responsible_person text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.assets enable row level security;

-- Policies (Simplified for now, can be tightened later)
-- Allow authenticated users to view assets (or restrict to own department if needed, but per requirements Admin sees all)
create policy "Enable read access for authenticated users" on public.assets
  for select using (auth.role() = 'authenticated');

-- Allow authenticated users to insert assets
create policy "Enable insert access for authenticated users" on public.assets
  for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to update assets
create policy "Enable update access for authenticated users" on public.assets
  for update using (auth.role() = 'authenticated');

-- Allow authenticated users to delete assets
create policy "Enable delete access for authenticated users" on public.assets
  for delete using (auth.role() = 'authenticated');

-- Create Realtime Publication if not exists
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.assets;
commit;
