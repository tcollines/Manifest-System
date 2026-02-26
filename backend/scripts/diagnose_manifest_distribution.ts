
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- Manifest ID Distribution Audit ---");

    // 1. Check manifest_details
    const { data: manifests } = await supabase.from('manifest_details').select('id, name');
    console.log("Manifests found:", JSON.stringify(manifests));

    if (!manifests || manifests.length === 0) {
        console.log("No manifests found!");
        return;
    }

    // 2. Check counts per manifest in core tables
    const tables = ['users', 'members', 'ministry_events', 'souls'];

    for (const table of tables) {
        console.log(`\nChecking Table: ${table}`);
        for (const manifest of manifests) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('manifest_id', manifest.id);

            if (error) {
                console.log(`  [${manifest.name}] Error: ${error.message}`);
            } else {
                console.log(`  [${manifest.name} (${manifest.id})] Records: ${count}`);
            }
        }
    }

    // 3. Check for records with NULL manifest_id
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .is('manifest_id', null);

        if (error) {
            console.log(`  [${table}] Error checking NULLs: ${error.message}`);
        } else if (count && count > 0) {
            console.log(`\n[WARNING] Table ${table} has ${count} records with NULL manifest_id!`);
        } else {
            console.log(`  [${table}] No NULL manifest_ids.`);
        }
    }

    // 4. Check specific user "Loy Mawanda"
    const { data: loy } = await supabase.from('users').select('*').ilike('name', 'Loy%').limit(1);
    if (loy && loy.length > 0) {
        console.log("\n--- Loy Mawanda Profile ---");
        console.log("ID:", loy[0].id);
        console.log("Name:", loy[0].name);
        console.log("Manifest ID:", loy[0].manifest_id);
        console.log("Role:", loy[0].role);

        const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(loy[0].id);
        if (authError) {
            console.log("Error fetching Auth user:", authError.message);
        } else {
            console.log("Auth Metadata:", JSON.stringify(authUser?.app_metadata));
        }
    }

    // 5. Check specific member "Abraham Kiggundu"
    const { data: abraham } = await supabase.from('members').select('*').ilike('name', 'Abraham%').limit(1);
    if (abraham && abraham.length > 0) {
        console.log("\n--- Abraham Kiggundu Record ---");
        console.log("ID:", abraham[0].id);
        console.log("Name:", abraham[0].name);
        console.log("Manifest ID:", abraham[0].manifest_id);
    }
}

diagnose();
