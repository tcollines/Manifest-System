import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function idHunt() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    if (!att) return;
    const ids = Array.from(new Set(att.map(a => a.member_id)));

    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Hunting for ${orphans.length} orphans...`);
    const orphanSet = new Set(orphans);

    const files = fs.readdirSync('d:/Manifest System/backend/scripts');
    for (const f of files) {
        if (f.endsWith('.json') || f.endsWith('.ts')) {
            const content = fs.readFileSync(path.join('d:/Manifest System/backend/scripts', f), 'utf8');
            for (const oid of orphans.slice(0, 10)) { // Just check 10 for now
                if (content.includes(oid)) {
                    console.log(`FOUND ${oid} in ${f}`);
                }
            }
        }
    }

    // Check the root too
    const rootFiles = fs.readdirSync('d:/Manifest System/backend');
    for (const f of rootFiles) {
        if (f.endsWith('.json')) {
            const content = fs.readFileSync(path.join('d:/Manifest System/backend', f), 'utf8');
            if (content.includes(orphans[0])) {
                console.log(`FOUND ${orphans[0]} in root file ${f}`);
            }
        }
    }
}

idHunt();
