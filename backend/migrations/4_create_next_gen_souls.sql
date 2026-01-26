create table next_gen_souls (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  age integer,
  gender text check (gender in ('Male', 'Female')),
  residence text,
  service_id text references ministry_events(id),
  status text default 'New',
  captured_by text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table next_gen_souls enable row level security;

-- Create policy for full access (simplify for now, matching other tables)
create policy "Enable all access for authenticated users" on next_gen_souls
  for all using (auth.role() = 'authenticated');
