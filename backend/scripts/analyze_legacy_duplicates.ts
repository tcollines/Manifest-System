import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function analyzeDuplicates() {
    console.log('Analyzing Legacy Members for Identity Collisions...');

    // Fetch all m- members
    const { data: members, error } = await supabase
        .from('members')
        .select('id, name, phone, residency, name_norm, phone_last9, residency_norm')
        .ilike('id', 'm-%');

    if (error) { console.error(error); return; }

    console.log(`Total Legacy Members: ${members.length}`);

    const groups: Record<string, any[]> = {};
    members.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}|${m.residency_norm}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    let collisionCount = 0;
    let totalRowsInCollisions = 0;

    Object.keys(groups).forEach(key => {
        if (groups[key].length > 1) {
            collisionCount++;
            totalRowsInCollisions += groups[key].length;
            // console.log(`Collision [${key}]: ${groups[key].length} members`);
        }
    });

    console.log(`Found ${collisionCount} unique identity groups with multiple members.`);
    console.log(`Affecting ${totalRowsInCollisions} total rows.`);
}

analyzeDuplicates();
