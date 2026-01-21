-- Update Read Policy for Anon Access
-- Since the application uses a custom login system (UserStore) that does NOT create a Supabase Auth session,
-- all users are technically "anonymous" (anon) to the database.
-- Therefore, we must allow "anon" roles to view the users list.

-- Drop the previous "authenticated" policy if it exists (to avoid confusion/duplicates)
drop policy if exists "Enable read access for all authenticated users" on "public"."users";

-- Create the new policy for ANON access
create policy "Enable public read access for all users"
on "public"."users"
for select
to anon
using (true);
