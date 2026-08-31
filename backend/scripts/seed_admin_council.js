/**
 * Seed script for Admin Council
 * 
 * Creates the Supabase Auth user for admin@manifestms.com
 * and inserts the corresponding admin_council_users row.
 * 
 * Run with: node backend/scripts/seed_admin_council.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
    const email = 'admin@manifestms.com';
    const password = 'emf@phaneroo';
    const name = 'Admin Council';

    console.log(`\n🔧 Seeding Admin Council user: ${email}\n`);

    // 1. Create Supabase Auth user (or skip if exists)
    try {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === email);

        if (existing) {
            console.log(`✅ Auth user already exists: ${existing.id}`);
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });

            if (createError) {
                console.error('❌ Failed to create auth user:', createError.message);
                process.exit(1);
            }
            console.log(`✅ Auth user created: ${newUser.user.id}`);
        }
    } catch (e) {
        console.error('❌ Error checking/creating auth user:', e.message);
        process.exit(1);
    }

    // 2. Ensure admin_council_users row exists
    const { data: councilRow, error: councilError } = await supabase
        .from('admin_council_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (councilError) {
        console.error('❌ Error checking admin_council_users:', councilError.message);
        process.exit(1);
    }

    if (councilRow) {
        console.log(`✅ admin_council_users row already exists: ${councilRow.id}`);
    } else {
        const { data: inserted, error: insertError } = await supabase
            .from('admin_council_users')
            .insert({ email, name, role: 'Admin Counsel' })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to insert admin_council_users:', insertError.message);
            process.exit(1);
        }
        console.log(`✅ admin_council_users row created: ${inserted.id}`);
    }

    console.log('\n🎉 Admin Council seed complete!\n');
}

seed();
