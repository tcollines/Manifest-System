import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function examineID() {
    const { data: all } = await supabase.from('service_attendance').select('service_id');
    const matches = all?.filter(a => a.service_id.toLowerCase().includes('378'));

    if (matches && matches.length > 0) {
        const id = matches[0].service_id;
        const hex = Buffer.from(id).toString('hex');
        const output = `ID: [${id}]\nLength: ${id.length}\nHex: ${hex}\n`;
        fs.writeFileSync('d:/Manifest System/backend/scripts/corrupted_id.txt', output);
        console.log('Written to d:/Manifest System/backend/scripts/corrupted_id.txt');
    } else {
        console.log('No matches found for 378');
    }
}

examineID();
