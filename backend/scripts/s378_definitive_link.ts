import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function definitiveLink() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    // Identity Map from Backup
    const identityMap: Record<string, any> = {};
    backup.forEach((m: any) => identityMap[m.id] = m);

    // New ID to Legacy Map
    const legMap: Record<string, string> = {};
    mapping.forEach((m: any) => legMap[m.new_id] = m.legacy_id);

    // 1. Get all attendance for S378
    const { data: att } = await supabase.from('service_attendance').select('*').eq('service_id', serviceId);
    if (!att) return;
    console.log(`Processing ${att.length} records...`);

    let linked = 0;
    let skipped = 0;
    const cache: Record<string, string> = {};

    for (const record of att) {
        // Find identity
        const legId = legMap[record.member_id] || record.member_id;
        const identity = identityMap[legId];

        if (!identity) {
            skipped++; continue;
        }

        // Find current ID in DB by normalized fields
        const key = `${identity.name_norm}|${identity.phone_last9}|${identity.residency_norm}`;
        let targetId = cache[key];

        if (!targetId) {
            const { data: matchingMems } = await supabase.from('members')
                .select('id')
                .eq('name_norm', identity.name_norm)
                .eq('phone_last9', identity.phone_last9)
                .eq('residency_norm', identity.residency_norm)
                .limit(1);

            if (matchingMems && matchingMems.length > 0) {
                targetId = matchingMems[0].id;
                cache[key] = targetId;
            }
        }

        if (targetId) {
            // Check for collision (if target already has attendance for this service)
            const { data: collision } = await supabase.from('service_attendance')
                .select('id').eq('service_id', serviceId).eq('member_id', targetId).limit(1);

            if (collision && collision.length > 0 && targetId !== record.member_id) {
                // Delete the duplicate orphan record
                await supabase.from('service_attendance').delete().eq('id', record.id);
            } else {
                // Update orphan to healthy ID
                await supabase.from('service_attendance').update({ member_id: targetId }).eq('id', record.id);
            }
            linked++;
        } else {
            skipped++;
        }
    }

    console.log(`RE-LINKING COMPLETE: Linked ${linked}, Skipped ${skipped}.`);
}

definitiveLink();
