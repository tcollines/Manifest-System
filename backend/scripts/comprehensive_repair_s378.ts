import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function comprehensiveRepair() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log('--- COMPREHENSIVE ATTENDANCE REPAIR ---');

    // 1. Load Data Sources
    const backupPath = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
    const mappingPath = 'd:/Manifest System/backend/migration_mapping.json';

    const backupMembers = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

    const backupById: Record<string, any> = {};
    backupMembers.forEach((m: any) => backupById[m.id] = m);

    const legacyToNew: Record<string, string> = {};
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => {
        legacyToNew[m.legacy_id] = m.new_id;
        newToLegacy[m.new_id] = m.legacy_id;
    });

    // 2. Fetch Orphans
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const distinctIds = Array.from(new Set(att?.map(a => a.member_id)));

    const { data: mems } = await supabase.from('members').select('id').in('id', distinctIds);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = distinctIds.filter(id => !memSet.has(id));

    console.log(`Processing ${orphans.length} orphans...`);

    let recoveredInBackup = 0;
    let recoveredInMapping = 0;
    let stillUnknown = 0;

    const repairPlan: { oldId: string, masterId: string }[] = [];
    const identityCache: Record<string, string> = {}; // identity -> masterId

    for (const oldId of orphans) {
        let identity: { name_norm: string, phone_last9: string, residency_norm: string } | null = null;

        // Try Backup first
        if (backupById[oldId]) {
            const m = backupById[oldId];
            identity = { name_norm: m.name_norm, phone_last9: m.phone_last9, residency_norm: m.residency_norm };
            recoveredInBackup++;
        }
        // Mapping doesn't help with identity directly, but it can help us find a legacy ID
        // If we had a LEGACY backup, we'd be good. But we don't.

        if (identity) {
            const key = `${identity.name_norm}|${identity.phone_last9}|${identity.residency_norm}`;
            if (identityCache[key]) {
                repairPlan.push({ oldId, masterId: identityCache[key] });
                continue;
            }

            // Search for master in DB
            const { data: master } = await supabase.from('members')
                .select('id')
                .eq('name_norm', identity.name_norm)
                .eq('phone_last9', identity.phone_last9)
                .eq('residency_norm', identity.residency_norm)
                .limit(1).single();

            if (master) {
                identityCache[key] = master.id;
                repairPlan.push({ oldId, masterId: master.id });
            } else {
                console.warn(`  Master not found for ${key}`);
                stillUnknown++;
            }
        } else {
            stillUnknown++;
        }
    }

    console.log(`Summary:`);
    console.log(`  Recovered from Backup: ${recoveredInBackup}`);
    console.log(`  Repair Plan size: ${repairPlan.length}`);
    console.log(`  Still Unknown: ${stillUnknown}`);

    // 3. Execution
    console.log('Executing updates...');
    let fixed = 0;
    let deleted = 0;
    for (const p of repairPlan) {
        // Check for collision
        const { data: exists } = await supabase.from('service_attendance')
            .select('*').eq('service_id', serviceId).eq('member_id', p.masterId).limit(1);

        if (exists && exists.length > 0) {
            await supabase.from('service_attendance').delete().eq('service_id', serviceId).eq('member_id', p.oldId);
            deleted++;
        } else {
            await supabase.from('service_attendance').update({ member_id: p.masterId }).eq('service_id', serviceId).eq('member_id', p.oldId);
            fixed++;
        }
        if ((fixed + deleted) % 100 === 0) console.log(`  Progress: ${fixed} fixed, ${deleted} deleted...`);
    }

    console.log(`REPAIR COMPLETE.`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Deleted (Duplicates): ${deleted}`);
}

comprehensiveRepair();
