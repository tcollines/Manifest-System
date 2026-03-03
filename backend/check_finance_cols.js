require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    // Check finance_transactions
    const { data: tData, error: tError } = await supabase.from('finance_transactions').select('*').limit(1);
    console.log('Finance Transaction Sample:', tData?.[0] ? Object.keys(tData[0]) : 'No data');

    // Check requisitions
    const { data: rData, error: rError } = await supabase.from('requisitions').select('*').limit(1);
    console.log('Requisition Sample:', rData?.[0] ? Object.keys(rData[0]) : 'No data');
}

checkColumns();
