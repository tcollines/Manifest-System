
// @ts-nocheck
import { supabase } from '../src/supabase';

const ORPHANS = [
    'f3ab8d46-bdba-4562-8428-98e68933726f',
    'd3fe5924-f8d4-4c66-bf9e-14057a5941d6',
    '3f61f00e-b0b5-4332-8efd-83380d7e2d49',
    'eda1da4b-5819-4a0c-a938-353c7694fd27',
    '2ffa7ba0-c94d-424d-9156-c55ac28c004c'
];

const TABLES = [
    'members',
    'service_attendance',
    'ministry_events',
    'souls',
    'passengers',
    'pickup_stations',
    'vehicles',
    'users',
    'google_calendar_sync'
];

export const searchDeep = async () => {
    console.log('--- GLOBAL ORPHAN SEARCH ---');

    for (const table of TABLES) {
        console.log(`Checking table: ${table}...`);
        const { data: rows } = await supabase.from(table).select('*').limit(1);
        if (!rows || rows.length === 0) continue;

        const cols = Object.keys(rows[0]);
        for (const col of cols) {
            // We can't easily search all orphans in one go with OR for all columns.
            // But we can try to find matches.
            for (const orphan of ORPHANS) {
                const { data: matches } = await supabase.from(table).select('*').eq(col, orphan);
                if (matches && matches.length > 0) {
                    console.log(`FOUND ${orphan} in ${table}.${col}! Record:`, JSON.stringify(matches[0]).slice(0, 200));
                }
            }
        }
    }
    process.exit(0);
};

searchDeep();
