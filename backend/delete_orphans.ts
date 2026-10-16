import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '.env') });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        console.log("Fetching all services...");
        const { data: services, error: servicesError } = await supabase
            .from('ministry_events')
            .select('id')
            .eq('type', 'Service');
        if (servicesError) throw servicesError;
        
        const validServiceIds = new Set(services.map(s => s.id));
        console.log(`Found ${validServiceIds.size} valid services.`);

        // 1. Fetch souls won from services
        let orphanedIds: string[] = [];
        let orphanedSourceIds = new Set<string>();
        let start = 0;
        let limit = 1000;
        let hasMore = true;
        
        console.log("Scanning unified_souls_won for orphaned service records...");
        while (hasMore) {
            const { data, error } = await supabase
                .from('unified_souls_won')
                .select('id, source_id')
                .eq('source_category', 'Service')
                .range(start, start + limit - 1);

            if (error) throw error;
            if (data.length === 0) {
                hasMore = false;
            } else {
                data.forEach(s => {
                    if (s.source_id && !validServiceIds.has(s.source_id)) {
                        orphanedIds.push(s.id);
                        orphanedSourceIds.add(s.source_id);
                    }
                });
                start += limit;
                if (data.length < limit) hasMore = false;
            }
        }
        
        console.log(`Found ${orphanedIds.length} orphaned souls across ${orphanedSourceIds.size} deleted services.`);

        if (orphanedIds.length > 0) {
            console.log("Deleting orphaned records from unified_souls_won...");
            // Delete in chunks of 500
            for (let i = 0; i < orphanedIds.length; i += 500) {
                const chunk = orphanedIds.slice(i, i + 500);
                const { error: delError } = await supabase
                    .from('unified_souls_won')
                    .delete()
                    .in('id', chunk);
                if (delError) throw delError;
                console.log(`Deleted chunk ${i} to ${i + chunk.length}`);
            }

            console.log("Deleting corresponding records from original souls table...");
            // Also clean up from original `souls` table just to be thorough for "delete them completely"
            const sourceIdsArr = Array.from(orphanedSourceIds);
            for (let i = 0; i < sourceIdsArr.length; i += 50) {
                const chunk = sourceIdsArr.slice(i, i + 50);
                // In original souls table, source_id matches
                const { error: originalDelErr } = await supabase
                    .from('souls')
                    .delete()
                    .in('source_id', chunk);
                if (originalDelErr) throw originalDelErr;
                console.log(`Deleted related records from 'souls' table for source chunks.`);
            }

            console.log("Deletion complete!");
        } else {
            console.log("No orphaned souls to delete.");
        }

    } catch (e) {
        console.error("Script failed:", e);
    }
}
main();
