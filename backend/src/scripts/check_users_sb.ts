import { supabase } from '../supabase';

// Helper: Generate simple username
const generateUsername = (name: string) => {
    return name.trim().replace(/\s+/g, '').toLowerCase();
};

async function run() {
  console.log("=== STARTING AUTH RECONCILIATION & SYNC (PAGINATED) ===");

  // 1. Fetch active coordinators, HODs, admins, logistics users
  const { data: publicUsers, error: fetchErr } = await supabase.from('users')
    .select('id, name, username, email, password, role, manifest_id')
    .in('role', ['Stage Coordinator', 'Vehicle Coordinator', 'Dept Admin', 'Head of Dept', 'Logistics'])
    .ilike('status', 'Active');

  if (fetchErr) {
    console.error("Failed to fetch public users:", fetchErr);
    return;
  }

  // 2. Fetch all GoTrue users with perPage: 1000 to bypass the 50-user default limit
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (authError) {
    console.error("Failed to list auth users:", authError);
    return;
  }

  const authUserIds = new Set(authUsers.map(u => u.id));
  const authUsersByEmail = new Map(authUsers.map(u => [u.email?.toLowerCase(), u]));

  console.log(`Auditing ${publicUsers.length} public profiles against ${authUsers.length} auth identities...`);

  for (const user of publicUsers) {
    // Generate username if missing
    let username = user.username;
    if (!username) {
      username = generateUsername(user.name);
      console.log(`[USER] Generating username '${username}' for '${user.name}'`);
      await supabase.from('users').update({ username }).eq('id', user.id);
    }

    // Resolve expected email
    let email = user.email;
    if (!email) {
      email = `${username.toLowerCase().replace(/\s+/g, '')}@manifest.local`;
      console.log(`[USER] Assigning local email '${email}' to '${user.name}'`);
      await supabase.from('users').update({ email }).eq('id', user.id);
    }

    const targetEmailLower = email.toLowerCase();
    const existingAuthUser = authUsersByEmail.get(targetEmailLower);

    // If an auth user with this email exists but has a different ID
    if (existingAuthUser && existingAuthUser.id !== user.id) {
      console.log(`[COLLISION] Email '${email}' belongs to stale auth user '${existingAuthUser.id}'. Deleting stale auth user...`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
      if (delErr) {
        console.error(`Failed to delete stale auth user ${existingAuthUser.id}:`, delErr.message);
        continue;
      }
      authUsersByEmail.delete(targetEmailLower);
      authUserIds.delete(existingAuthUser.id);
    }

    // Check if correct auth identity exists
    if (!authUserIds.has(user.id)) {
      const password = user.password || '123';
      console.log(`[PROVISION] Creating auth user for '${user.name}' (${email}) with password '${password}'`);

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        id: user.id,
        email: email,
        password: password,
        email_confirm: true
      });

      if (createErr) {
        console.error(`Failed to provision auth for '${user.name}':`, createErr.message);
      } else {
        console.log(`[PROVISION] Successfully created auth account for '${user.name}'`);
        // Ensure public password column is set to the password we provisioned
        if (!user.password) {
          await supabase.from('users').update({ password }).eq('id', user.id);
        }
      }
    } else {
      // Identity exists, ensure password is synced to '123' if it was null in public.users
      if (!user.password) {
        console.log(`[SYNC] Updating public password to '123' for '${user.name}'`);
        await supabase.from('users').update({ password: '123' }).eq('id', user.id);
        await supabase.auth.admin.updateUserById(user.id, {
          password: '123',
          email_confirm: true
        });
      }
    }
  }

  console.log("=== AUTH RECONCILIATION COMPLETED ===");
}

run().catch(console.error);
