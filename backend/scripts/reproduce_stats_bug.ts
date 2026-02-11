
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function toUUID(val: any): string | null {
    if (!val || typeof val !== 'string') return null;
    if (UUID_REGEX.test(val)) return val.toLowerCase();
    return null;
}

async function reproduce() {
    console.log('--- Verifying getServiceStats Fix ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const serviceDate = '2026-02-08';

    // 1. Fetch Attendance
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id, check_in_time')
        .or(`service_id.eq.${toUUID(serviceId)},legacy_service_id.eq.${serviceId}`);

    if (attError) {
        console.error('Attendance Error:', attError.message);
        return;
    }

    const validAttendance = (attendance || []).filter(a => {
        if (!a.check_in_time) return true;
        return !a.check_in_time.startsWith('1970-01-01');
    });

    const memberIds = validAttendance.map(a => a.member_id);
    console.log(`Valid Attendance: ${memberIds.length}`);

    // 2. Fetch Members (Fixed Logic)
    let members: any[] = [];
    const chunkSize = 50; // FIXED
    for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);

        const uuids = chunk.map(toUUID).filter(Boolean);
        const legacyIds = chunk.filter(id => !toUUID(id));

        let query = '';
        if (uuids.length > 0 && legacyIds.length > 0) {
            query = `id.in.(${uuids.join(',')}),legacy_id.in.(${legacyIds.join(',')})`;
        } else if (uuids.length > 0) {
            query = `id.in.(${uuids.join(',')})`;
        } else if (legacyIds.length > 0) {
            query = `legacy_id.in.(${legacyIds.join(',')})`;
        }

        if (!query) continue;

        console.log(`Querying chunk ${i / chunkSize + 1} with ${chunk.length} IDs...`);

        const { data: chunkMembers, error: chunkError } = await supabase
            .from('members')
            .select('id, legacy_id, joined_date, category, first_timer_service_id')
            .or(query);

        if (chunkError) {
            console.error(`  Chunk error at offset ${i}:`, chunkError.message);
        } else {
            console.log(`  Found ${chunkMembers?.length || 0} members.`);
            if (chunkMembers) members = members.concat(chunkMembers);
        }
    }

    console.log(`Total Members Found: ${members.length}`);

    // Check for first timers
    const firstTimerCount = (members || []).filter(m => {
        const joinedDate = m.joined_date ? m.joined_date.split('T')[0].split(' ')[0] : null;
        if (joinedDate === serviceDate) return true;
        if (m.first_timer_service_id === toUUID(serviceId)) return true;
        return false;
    }).length;

    console.log(`First Timers: ${firstTimerCount}`);
}

reproduce();
