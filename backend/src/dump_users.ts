
import { supabase } from './supabase';
import fs from 'fs';

async function dumpUsers() {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        fs.writeFileSync('users_dump.json', JSON.stringify(data, null, 2));
        console.log(`Dumped ${data?.length} users to users_dump.json`);
    } catch (err: any) {
        console.error('Dump failed:', err.message);
    }
}

dumpUsers();
