
// @ts-nocheck
import { supabase } from '../src/supabase';

export const getColsForTable = async (tableName: string) => {
    const { data: rows } = await supabase.from(tableName).select('*').limit(1);
    if (rows && rows.length > 0) {
        console.log(`COLS:${Object.keys(rows[0]).join(',')}`);
    } else {
        console.log(`EMPTY:${tableName}`);
    }
    process.exit(0);
};

const table = process.argv[2] || 'passengers';
getColsForTable(table);
