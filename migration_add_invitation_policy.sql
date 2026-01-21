-- Enable RLS (ensure it is on)
alter table "public"."users" enable row level security;

-- Create Policy for Public Access to Invites
-- This allows anyone (including unauthenticated users) to read user records 
-- IF AND ONLY IF the record has a non-null invitation_token.
-- This is necessary for the /accept-invite page to verify tokens before the user logs in.
create policy "Enable public read access for invitation verification"
on "public"."users"
for select
to anon
using (
  invitation_token is not null
);
