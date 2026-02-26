import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function broadSearch() {
    console.log('Searching broad across all tables for "S378" and "P568"...');

    const tables = ['ministry_events', 'services', 'events']; // Common candidates
    const keywords = ['S378', 'P568', '378', '568'];

    for (const table of tables) {
        console.log(`Checking table: ${table}`);
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                if (error.code === '42P01') console.log(`  Table ${table} does not exist.`);
                else console.log(`  Error on ${table}: ${error.message}`);
                continue;
            }

            console.log(`  Table ${table} exists. Columns:`, Object.keys(data[0] || {}));

            // Search if name or code columns exist
            const cols = Object.keys(data[0] || {});
            const searchCols = cols.filter(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('code') || c.toLowerCase().includes('title'));

            if (searchCols.length > 0) {
                for (const col of searchCols) {
                    for (const kw of keywords) {
                        const { data: results } = await supabase.from(table).select('*').ilike(col, `%${kw}%`);
                        if (results && results.length > 0) {
                            console.log(`  MATCH in ${table}.${col} for "${kw}":`, results);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`  Exceptional failure for ${table}:`, e);
        }
    }
}

broadSearch();
