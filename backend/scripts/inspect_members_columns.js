const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTables() {
    try {
        const { data: mData } = await supabase.from('members').select('*').limit(1);
        console.log('Members Columns:', mData && mData.length > 0 ? Object.keys(mData[0]).sort().join(', ') : 'No data');

        const { data: cData } = await supabase.from('children').select('*').limit(1);
        console.log('Children Columns:', cData && cData.length > 0 ? Object.keys(cData[0]).sort().join(', ') : 'No data');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

inspectTables();
