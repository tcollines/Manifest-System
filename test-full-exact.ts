import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const REQUISITION_STATUS = {
    PENDING: "PENDING",
    FINANCE_BATCH: "FINANCE_BATCH",
    TL_APPROVAL: "TL_APPROVAL",
    APPROVED: "APPROVED",
    PAID: "PAID",
    REJECTED: "REJECTED"
} as const;

async function testFullCreateBatch() {
    console.log("Fetching some pending requisitions...");
    const { data: reqs } = await supabase.from('requisitions').select('id, manifest_id').eq('type', 'WORKPLAN').limit(2);
    if (!reqs || reqs.length === 0) {
        console.log("No reqs found to test.");
        return;
    }
    const requisitionIds = reqs.map(r => r.id);
    const manifestId = reqs[0].manifest_id;

    console.log("Using requisitionIds:", requisitionIds);
    console.log("Using manifestId:", manifestId);

    const batchNumber = `BCH-TEST-${Date.now().toString().slice(-6)}`;

    // 1. Create the Batch record
    const { data: batchData, error: batchError } = await supabase
        .from('requisition_batches')
        .insert([{
            batch_number: batchNumber,
            status: 'PENDING'
            // Ideally add manifest_id here if added to schema later
        }])
        .select('id')
        .single();

    if (batchError) {
        console.log("BATCH ERROR:", batchError);
        return;
    }

    console.log("Got batch ID:", batchData.id);

    // 2. Link requisitions
    const { error: updateErr } = await supabase
         .from('requisitions')
         .update({ 
             batch_id: batchData.id, 
             status: REQUISITION_STATUS.FINANCE_BATCH,
             updated_at: new Date().toISOString() 
         })
         .in('id', requisitionIds)
         .eq('manifest_id', manifestId);

    if (updateErr) {
        console.log("UPDATE ERROR:", updateErr);
        return;
    }

    console.log("Success!");
}

testFullCreateBatch();
