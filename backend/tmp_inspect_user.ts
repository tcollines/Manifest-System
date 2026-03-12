
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data } = await supabase.from('users').select('username').ilike('username', '%Francis%');
    if (data) {
        data.forEach(u => {
            console.log(`Username: "${u.username}"`);
            const codes = [...u.username].map(c => c.charCodeAt(0));
            console.log(`Codes: ${codes.join(', ')}`);
        });
    }
}
inspect();
