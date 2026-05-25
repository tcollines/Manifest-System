import { supabase } from './src/supabase';

async function checkSchema() {
    console.log("Checking tables for manifest_id...");
    const { data: tables, error: tErr } = await supabase.from('information_schema.columns' as any).select('table_name').eq('table_schema', 'public').eq('column_name', 'manifest_id');
    
    if (tErr) console.error(tErr);
    else console.log("Tables WITH manifest_id:", Array.from(new Set((tables || []).map((t: any) => t.table_name))));

    const { data: allTables, error: aErr } = await supabase.from('information_schema.tables' as any).select('table_name').eq('table_schema', 'public');
    if (aErr) console.error(aErr);
    else {
        const all = Array.from(new Set((allTables || []).map((t: any) => t.table_name)));
        const withManifest = Array.from(new Set((tables || []).map((t: any) => t.table_name)));
        const without = all.filter(t => !withManifest.includes(t));
        console.log("Tables WITHOUT manifest_id:", without);
    }
}

checkSchema();
