
// @ts-nocheck
import { supabase } from '../src/supabase';

export const getColsForTable = async (tableName: string) => {
    console.log(`Fetching columns for table: ${tableName}`);
    const { data: rows, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`Error fetching from ${tableName}:`, error.message);
    } else if (rows && rows.length > 0) {
        console.log(`Columns in ${tableName}:`, Object.keys(rows[0]));
    } else {
        console.log(`Table ${tableName} is empty or not found.`);
    }
    process.exit(0);
};

const table = process.argv[2] || 'passengers';
getColsForTable(table);
