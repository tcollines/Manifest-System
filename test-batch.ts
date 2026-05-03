import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testBatch() {
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
    
    console.log("Batch Error:", batchError);
    console.log("Batch Data:", batchData);
}

testBatch();
