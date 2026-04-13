require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

supabase.from('vehicles').select('*').like('number_plate', '%123ED%').then(async res => {
    const data = res.data.map(v => ({ id: v.id, plate: v.number_plate, stage: v.current_stage, status: v.status }));
    console.table(data);
    
    // Check passengers
    for (const v of data) {
        const pRes = await supabase.from('passengers').select('id, name, soul_won').eq('vehicle_id', v.id);
        console.log(`Passengers for ${v.plate}:`, pRes.data?.length);
    }
});
