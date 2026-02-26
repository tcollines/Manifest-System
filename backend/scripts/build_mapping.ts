
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';

const OUT_FILE = path.join(__dirname, 'final_repair_map.json');
const UNRESOLVABLE_FILE = path.join(__dirname, 'unresolvable_orphans.json');

// Source Files
const FILES = {
    orphansToLegacy: path.join(__dirname, 'orphans_to_legacy_mapped.json'),
    repairMapV3: path.join(__dirname, 'repair_mapping_v3.json'),
    s378Identities: path.join(__dirname, 's378_identities_recovered.json'),
    backupIdentities: path.join(__dirname, 'backup_recovered_identities_final.json'),
    allOrphans: path.join(__dirname, 'all_unique_orphans.json'),
    missingEntirely: path.join(__dirname, 'orphans_missing_entirely.json')
};

async function buildMapping() {
    console.log('Building comprehensive repair mapping...');

    // 1. Load orphan list
    if (!fs.existsSync(FILES.allOrphans)) {
        console.error('Missing all_unique_orphans.json');
        return;
    }
    const orphans: string[] = JSON.parse(fs.readFileSync(FILES.allOrphans, 'utf-8'));
    console.log(`Total Unique Orphans to Repair: ${orphans.length}`);

    // 2. Load partial mappings
    const map = new Map<string, string>(); // OrphanID -> TargetUUID
    const reasons = new Map<string, string>(); // OrphanID -> Method

    // Helper to load JSON safely
    const loadJSON = (p: string) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];

    // A. Load orphans_to_legacy_mapped.json (Orphan -> Legacy -> Member lookup later)
    // Structure: { new_id: string, legacy_id: string }
    const fileA = loadJSON(FILES.orphansToLegacy);
    const orphanToLegacy = new Map<string, string>();
    fileA.forEach((i: any) => {
        if (i.new_id && i.legacy_id) orphanToLegacy.set(i.new_id.toLowerCase(), i.legacy_id);
    });
    console.log(`Loaded ${fileA.length} legacy mappings.`);

    // B. Load repair_mapping_v3.json (Orphan -> TargetUUID)
    // Structure: { orphan_id: string, target_id: string }
    const fileB = loadJSON(FILES.repairMapV3);
    fileB.forEach((i: any) => {
        if (i.orphan_id && i.target_id) {
            map.set(i.orphan_id.toLowerCase(), i.target_id);
            reasons.set(i.orphan_id.toLowerCase(), 'DIRECT_MAP_V3');
        }
    });
    console.log(`Loaded ${fileB.length} V3 mappings.`);

    // C. Load Identity Info (Orphan -> Name/Phone)
    // We will use this to search DB
    const orphanIdentities = new Map<string, { name?: string, phone?: string }>();

    // C1. s378_identities_recovered.json (member_id -> name)
    const fileC = loadJSON(FILES.s378Identities);
    fileC.forEach((i: any) => {
        if (i.member_id && i.name && i.name !== 'UNKNOWN') {
            orphanIdentities.set(i.member_id.toLowerCase(), { name: i.name });
        }
    });

    // C2. backup_recovered_identities_final.json (orphan_id -> identity: { name, phone })
    const fileD = loadJSON(FILES.backupIdentities);
    fileD.forEach((i: any) => {
        if (i.orphan_id && i.identity?.name) {
            const existing = orphanIdentities.get(i.orphan_id.toLowerCase()) || {};
            orphanIdentities.set(i.orphan_id.toLowerCase(), {
                name: i.identity.name,
                phone: i.identity.phone || existing.phone
            });
        }
    });

    // C3. orphans_missing_entirely.json (orphan_id -> identity: { name, phone })
    const fileE = loadJSON(FILES.missingEntirely);
    fileE.forEach((i: any) => {
        if (i.orphan_id && i.identity?.name) {
            const existing = orphanIdentities.get(i.orphan_id.toLowerCase()) || {};
            orphanIdentities.set(i.orphan_id.toLowerCase(), {
                name: i.identity.name,
                phone: i.identity.phone || existing.phone
            });
        }
    });

    console.log(`Loaded identities for ${orphanIdentities.size} orphans.`);


    // 3. Fetch DB Members for lookup
    console.log('Fetching matches from DB...');
    const BATCH_SIZE = 1000;
    let allMembers: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('members')
            .select('id, legacy_id, name, phone_number') // Try 'phone_number' first, fallback if error
            .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

        if (error) {
            // If phone_number fails, try 'phone'
            const { data: data2, error: error2 } = await supabase
                .from('members')
                .select('id, legacy_id, name, phone')
                .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

            if (error2) {
                console.error('Failed to fetch members:', error, error2);
                break;
            }
            if (!data2 || data2.length === 0) break;
            allMembers.push(...data2);
        } else {
            if (!data || data.length === 0) break;
            allMembers.push(...data);
        }
        page++;
        process.stdout.write('.');
    }
    console.log(`\nLoaded ${allMembers.length} active members.`);

    // Index DB Members
    const legacyMap = new Map<string, string>(); // LegacyID -> UUID
    const nameMap = new Map<string, string[]>(); // Name -> [UUIDs]
    const phoneMap = new Map<string, string>(); // Phone -> UUID

    const normalize = (s: string) => String(s).trim().toLowerCase();

    allMembers.forEach(m => {
        if (m.legacy_id) legacyMap.set(m.legacy_id, m.id);

        if (m.name) {
            const n = normalize(m.name);
            if (!nameMap.has(n)) nameMap.set(n, []);
            nameMap.get(n)?.push(m.id);
        }

        // Handle phone (could be 'phone' or 'phone_number')
        const p = m.phone_number || m.phone;
        if (p) {
            const pn = normalize(p).replace(/\D/g, ''); // Digits only
            if (pn.length > 5) phoneMap.set(pn, m.id);
        }
    });


    // 4. Resolve Orphans
    let resolvedCount = 0;

    for (const oid of orphans) {
        const oidNorm = oid.toLowerCase();

        // Already mapped by V3?
        if (map.has(oidNorm)) {
            resolvedCount++;
            continue;
        }

        // Strategy A: Legacy ID
        if (orphanToLegacy.has(oidNorm)) {
            const legId = orphanToLegacy.get(oidNorm);
            if (legId && legacyMap.has(legId)) {
                map.set(oidNorm, legacyMap.get(legId)!);
                reasons.set(oidNorm, 'LEGACY_MATCH');
                resolvedCount++;
                continue;
            }
        }

        // Strategy B: Identity Match (Name/Phone)
        const identity = orphanIdentities.get(oidNorm);
        if (identity && identity.name) {
            const n = normalize(identity.name);
            const matches = nameMap.get(n);

            if (matches && matches.length === 1) {
                // Exact unique name match
                map.set(oidNorm, matches[0]);
                reasons.set(oidNorm, 'UNIQUE_NAME_MATCH');
                resolvedCount++;
                continue;
            } else if (matches && matches.length > 1) {
                // Multiple matches, try phone
                if (identity.phone) {
                    const p = normalize(identity.phone).replace(/\D/g, '');
                    const phoneMatch = matches.find(mid => {
                        const m = allMembers.find(mem => mem.id === mid);
                        const mp = m?.phone_number || m?.phone || '';
                        return normalize(mp).replace(/\D/g, '') === p;
                    });

                    if (phoneMatch) {
                        map.set(oidNorm, phoneMatch);
                        reasons.set(oidNorm, 'NAME_AND_PHONE_MATCH');
                        resolvedCount++;
                        continue;
                    }
                }
                // Ambiguous name, no phone match. Skip.
            }
        }
    }

    // 5. Output
    const finalMapping = Array.from(map.entries()).map(([k, v]) => ({
        orphan_id: k,
        target_id: v,
        method: reasons.get(k)
    }));

    console.log(`\n\nResolved: ${finalMapping.length} / ${orphans.length}`);
    fs.writeFileSync(OUT_FILE, JSON.stringify(finalMapping, null, 2));

    const unresolvable = orphans.filter(o => !map.has(o.toLowerCase()));

    // Enrich unresolvable with identity info for report
    const unresolvableReport = unresolvable.map(o => ({
        orphan_id: o,
        identity: orphanIdentities.get(o.toLowerCase()) || 'UNKNOWN',
        reason: 'NO_MATCH_FOUND'
    }));

    if (unresolvableReport.length > 0) {
        fs.writeFileSync(UNRESOLVABLE_FILE, JSON.stringify(unresolvableReport, null, 2));
        console.log(`Unresolvable Report saved to ${UNRESOLVABLE_FILE} (${unresolvableReport.length} items)`);
    }
}

buildMapping().catch(console.error);
