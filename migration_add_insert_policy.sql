-- Fix Insert/Update Policies for Custom Auth
-- Since the app acts as "anon" (no Supabase session), we must allow anon access.
-- We also DROP the previous policies to avoid "already exists" errors.

-- 1. DROP existing policies (if they exist)
drop policy if exists "Enable insert for authenticated users only" on "public"."users";
drop policy if exists "Enable update for authenticated users only" on "public"."users";
-- Also drop the anon ones if we made them before? Just in case.
drop policy if exists "Enable public insert access" on "public"."users";
drop policy if exists "Enable public update access" on "public"."users";

-- 2. Create Policy for Insert Access (Anon)
create policy "Enable public insert access"
on "public"."users"
for insert
to anon
with check (true);

-- 3. Create Policy for Update Access (Anon)
create policy "Enable public update access"
on "public"."users"
for update
to anon
using (true)
with check (true);
