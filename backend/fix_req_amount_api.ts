import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log("Fixing requisition amounts...");
    
    // 1. Fetch WORKPLAN requisitions
    const { data: reqs, error: reqsError } = await supabase
        .from('requisitions')
        .select('*')
        .eq('type', 'WORKPLAN')
        .in('status', ['DRAFT', 'PENDING', 'TL_APPROVAL']);

    if (reqsError) {
        console.error("Error fetching requisitions:", reqsError);
        return;
    }

    let updatedCount = 0;

    for (const req of reqs) {
        if (!req.workplan_item_id) continue;

        // Fetch corresponding workplan item
        const { data: item, error: itemError } = await supabase
            .from('workplan_items')
            .select('*')
            .eq('id', req.workplan_item_id)
            .single();

        if (itemError || !item) {
            console.error("Item fetch error for req:", req.id, itemError);
            continue;
        }

        const approvedAmt = item.approved_amount ?? item.amount ?? 0;
        const deptContrib = item.dept_contribution ?? 0;
        const expectedTotal = Math.max(0, approvedAmt - deptContrib);

        if (req.total_amount !== expectedTotal) {
            console.log(`Fixing Req ${req.requisition_number}: ${req.total_amount} -> ${expectedTotal}`);
            
            // Update requisition
            await supabase
                .from('requisitions')
                .update({ total_amount: expectedTotal })
                .eq('id', req.id);

            // Fetch and update requisition items
            const { data: riData } = await supabase
                .from('requisition_items')
                .select('*')
                .eq('requisition_id', req.id);
            
            if (riData && riData.length > 0) {
                const ri = riData[0];
                const qty = item.approved_quantity ?? item.quantity ?? 1;
                const unitCost = qty > 0 ? expectedTotal / qty : expectedTotal;

                await supabase
                    .from('requisition_items')
                    .update({ total_cost: expectedTotal, unit_cost: unitCost })
                    .eq('id', ri.id);
            }
            updatedCount++;
        }
    }

    console.log(`Successfully updated ${updatedCount} requisitions.`);
}

run();
