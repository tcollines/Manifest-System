import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugDeep(legacyId: string) {
    console.log(`Deep Inspecting ${legacyId}...`);
    const { data: m } = await supabase.from('members').select('*').eq('id', legacyId).single();
    if (!m) { console.log('Not found'); return; }

    console.log(`Name: '${m.name}'`);
    console.log(`Phone: '${m.phone}'`);

    // Try to find duplicates
    console.log('Searching for duplicates with .eq(name).eq(phone)...');
    const { data: matches, error: err1 } = await supabase
        .from('members')
        .select('id, name, phone')
        .eq('name', m.name)
        .eq('phone', m.phone)
        .neq('id', legacyId);

    if (err1) console.error('Error 1:', err1);
    console.log(`Matches found: ${matches?.length}`);
    matches?.forEach(match => console.log(` - ${match.id} (Name: '${match.name}', Phone: '${match.phone}')`));

    // Try searching only by Name if Phone matches problematic
    console.log('Searching by FUZZY name (iLike %NAME%)...');
    const { data: fuzzyMatches } = await supabase
        .from('members')
        .select('id, name, phone, category')
        .ilike('name', `%${m.name}%`)
        .neq('id', legacyId);
    console.log(`Fuzzy Matches: ${fuzzyMatches?.length}`);
    fuzzyMatches?.forEach(match => console.log(` - ${match.id} ('${match.name}', Phone: '${match.phone}', Cat: '${match.category}')`));

    // Try searching by Phone only
    console.log('Searching by phone only...');
    const { data: phoneMatches } = await supabase.from('members').select('id, name').eq('phone', m.phone).neq('id', legacyId);
    console.log(`Phone-only Matches: ${phoneMatches?.length}`);
    phoneMatches?.forEach(match => console.log(` - ${match.id} ('${match.name}')`));
}

async function run() {
    await debugDeep('m-1769097302554'); // Anok Bonn
    console.log('---');
    await debugDeep('m-1769320535968'); // Gerald Murungi
}

run();
