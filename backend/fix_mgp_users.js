require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixAndRestoreMGPUsers() {
    const MGP_EVENT_ID = '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4';
    console.log("Fixing event_ids and restoring Auth for MGP VIII Temp Users...");
    
    // Step 1: Find all stations belonging to MGP VIII
    const { data: stations, error: stErr } = await supabase
        .from('pickup_stations')
        .select('id, event_id')
        .eq('event_id', MGP_EVENT_ID);
        
    if (stErr || !stations) {
        console.error("Error fetching stations:", stErr);
        return;
    }
    
    const mgpStationIds = stations.map(s => s.id);
    
    // Step 2: Update users assigned to these stations to have the correct event_id
    const { data: updatedUsers, error: upErr } = await supabase
        .from('users')
        .update({ event_id: MGP_EVENT_ID })
        .in('station_id', mgpStationIds)
        .is('event_id', null)
        .select('id, name, username, email, role');
        
    console.log(`Fixed event_id for ${updatedUsers?.length || 0} temp users assigned to MGP VIII stations.`);
    
    // Step 3: Fetch ALL MGP VIII temp users to ensure their auth and passwords are restored
    const { data: mgpUsers, error: fetchErr } = await supabase
        .from('users')
        .select('id, name, username, email, role')
        .eq('event_id', MGP_EVENT_ID)
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'])
        .neq('status', 'Deleted');
        
    let restoredCount = 0;
    
    for (const u of mgpUsers) {
        // Set their public password to '123'
        await supabase.from('users').update({ password: '123' }).eq('id', u.id);
        
        // Recreate GoTrue Identity if missing
        const { data: authCheck, error: authErr } = await supabase.auth.admin.getUserById(u.id);
        if (authErr && authErr.message.includes('not found')) {
            const syntheticEmail = u.email || `${(u.username || u.name.split(' ')[0]).toLowerCase().replace(/\\s+/g, '')}@manifest.local`;
            
            const { error: createErr } = await supabase.auth.admin.createUser({
                id: u.id,
                email: syntheticEmail,
                password: '123',
                email_confirm: true,
                user_metadata: { name: u.name, role: u.role }
            });
            
            if (!createErr) restoredCount++;
        }
    }
    
    console.log(`Successfully restored Auth Vault identities and passwords for ${restoredCount} MGP VIII users.`);
}

fixAndRestoreMGPUsers();
