-- RLS RESET SCRIPT
-- This script clears ALL restrictions on the 'users' table to fix visibility issues.
-- It ensures that your Custom Auth system (which acts as 'anon') can Read/Write data.

-- 1. DROP ALL POSSIBLE EXISTING POLICIES (Clean Slate)
-- We use 'if exists' so it won't error if you missed a previous script.
drop policy if exists "Enable read access for all authenticated users" on "public"."users";
drop policy if exists "Enable insert for authenticated users only" on "public"."users";
drop policy if exists "Enable update for authenticated users only" on "public"."users";
drop policy if exists "Enable public read access for all users" on "public"."users";
drop policy if exists "Enable public insert access" on "public"."users";
drop policy if exists "Enable public update access" on "public"."users";
drop policy if exists "Enable public read access for invitation verification" on "public"."users";

-- 2. ENABLE RLS (Just to be sure it's on, even if permissive)
alter table "public"."users" enable row level security;

-- 3. CREATE PERMISSIVE POLICIES FOR 'ANON' (Public/Custom Auth)

-- ALLOW READ (View Users)
create policy "allow_anon_select"
on "public"."users"
for select
to anon
using (true);

-- ALLOW INSERT (Add Users)
create policy "allow_anon_insert"
on "public"."users"
for insert
to anon
with check (true);

-- ALLOW UPDATE (Edit Users)
create policy "allow_anon_update"
on "public"."users"
for update
to anon
using (true);

-- ALLOW DELETE (Remove Users)
create policy "allow_anon_delete"
on "public"."users"
for delete
to anon
using (true);
