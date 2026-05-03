import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testFullBatch() {
    console.log("Fetching some pending requisitions...");
    const { data: reqs } = await supabase.from('requisitions').select('id').eq('type', 'WORKPLAN').limit(2);
    if (!reqs || reqs.length === 0) {
        console.log("No reqs found to test.");
        return;
    }
    const requisitionIds = reqs.map(r => r.id);

    console.log("Creating batch...");
    const batchNumber = `BCH-TEST-${Date.now().toString().slice(-6)}`;
    const { data: batchData, error: batchError } = await supabase
        .from('requisition_batches')
        .insert([{
            batch_number: batchNumber,
            status: 'PENDING'
        }])
        .select('id')
        .single();
    
    if (batchError) {
       console.log("Batch Error:", batchError);
       return;
    }

    console.log("Updating requisitions:", requisitionIds);
    const { error: updateErr } = await supabase
         .from('requisitions')
         .update({ 
             batch_id: batchData.id, 
             status: 'FINANCE_BATCH',
             updated_at: new Date().toISOString() 
         })
         .in('id', requisitionIds);

    console.log("Update Error:", updateErr);
}

testFullBatch();
