require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    console.log("Fetching all passengers...");
    const { data: passengers, error } = await supabase.from('passengers').select('id, name, contact, vehicle_id, created_at').not('vehicle_id', 'is', null);
    if (error) {
        console.error("Error fetching passengers:", error);
        process.exit(1);
    }

    console.log(`Fetched ${passengers.length} passengers. Analyzing duplicates...`);
    const map = new Map();
    const toDelete = [];

    for (const p of passengers) {
        const nameKey = (p.name || '').toLowerCase().trim();
        const contactKey = (p.contact || '').trim();
        const key = `${p.vehicle_id}_${nameKey}_${contactKey}`;

        if (!map.has(key)) {
            map.set(key, p);
        } else {
            const existing = map.get(key);
            if (new Date(p.created_at) < new Date(existing.created_at)) {
                toDelete.push(existing.id);
                map.set(key, p);
            } else {
                toDelete.push(p.id);
            }
        }
    }

    console.log(`Found ${toDelete.length} duplicate passenger records to delete:`, toDelete);

    if (toDelete.length > 0) {
        const { error: deleteErr } = await supabase.from('passengers').delete().in('id', toDelete);
        if (deleteErr) {
            console.error("Failed to delete duplicate passengers:", deleteErr);
        } else {
            console.log(`✅ Successfully deleted ${toDelete.length} duplicate passenger records!`);
        }
    } else {
        console.log("No duplicate passengers found.");
    }
    process.exit(0);
})();
