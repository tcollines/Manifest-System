import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log('Fixing stuck workplan items...');
    
    // Find workplans that are in TL_Review
    const { data: workplans, error: wpError } = await supabase
        .from('monthly_workplans')
        .select('id')
        .eq('status', 'TL_Review');
        
    if (wpError) {
        console.error('Error fetching workplans:', wpError);
        return;
    }
    
    if (!workplans || workplans.length === 0) {
        console.log('No workplans in TL_Review found.');
        return;
    }
    
    const workplanIds = workplans.map(wp => wp.id);
    
    // Update items to ADMIN_APPROVED where they are PENDING or RESUBMITTED
    const { data: items, error: updateError } = await supabase
        .from('workplan_items')
        .update({ status: 'ADMIN_APPROVED' })
        .in('workplan_id', workplanIds)
        .in('status', ['PENDING', 'RESUBMITTED'])
        .select();
        
    if (updateError) {
        console.error('Error updating items:', updateError);
        return;
    }
    
    console.log(`Successfully updated ${items?.length || 0} stuck items to ADMIN_APPROVED.`);
}

run();
