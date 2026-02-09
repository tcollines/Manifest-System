import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findVariations() {
    const { data: all } = await supabase.from('service_attendance').select('service_id');
    const variations = Array.from(new Set(all?.map(a => a.service_id) || []));

    console.log('Variations containing 378:');
    variations.forEach(v => {
        if (v.toLowerCase().includes('378')) {
            const count = all?.filter(a => a.service_id === v).length;
            console.log(`  - "${v}": ${count} records`);
        }
    });

    console.log('\nSample Service IDs (first 10):');
    console.log(variations.slice(0, 10));
}

findVariations();
