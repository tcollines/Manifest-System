
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.resolve(__dirname, '../.env');
let envConfig = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '');
            if (key && !key.startsWith('#')) {
                envConfig[key] = value;
            }
        }
    });
} catch (e) {
    console.error('Err loading .env', e.message);
}

const supabaseUrl = envConfig['SUPABASE_URL'] || process.env.SUPABASE_URL;
const supabaseKey = envConfig['SUPABASE_SERVICE_KEY'] || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Duplicates (JS) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
        if (!attendance) {
            console.log('No attendance found');
            return;
        }
        console.log(`Total Attendance: ${attendance.length}`);

        const memberIds = attendance.map(a => a.member_id);

        // Chunking
        let members = [];
        const chunkSize = 200;
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);
            const { data: chunkMembers } = await supabase
                .from('members')
                .select('id, name, phone, category')
                .in('id', chunk);
            if (chunkMembers) members = members.concat(chunkMembers);
        }

        console.log(`Resolved Members: ${members.length}`);

        const uniqueMap = new Map();
        const duplicates = [];

        members.forEach(m => {
            const name = m.name ? m.name.trim().toLowerCase() : 'unknown';
            const phone = m.phone ? m.phone.trim() : 'unknown';
            const key = `${name}|${phone}`;

            if (uniqueMap.has(key)) {
                duplicates.push({ original: uniqueMap.get(key), duplicate: m });
            } else {
                uniqueMap.set(key, m);
            }
        });

        console.log(`Duplicates Found: ${duplicates.length}`);
        console.log(`Unique Count: ${uniqueMap.size}`);

        // Categories of Unique
        let categories = {};
        for (let m of uniqueMap.values()) {
            categories[m.category] = (categories[m.category] || 0) + 1;
        }
        console.log('Unique Categories:', categories);

        // Log some duplicates
        if (duplicates.length > 0) {
            console.log('--- Sample Duplicates ---');
            duplicates.slice(0, 5).forEach(d => {
                console.log(`${d.original.name} (${d.original.phone}) - IDs: ${d.original.id} vs ${d.duplicate.id}`);
            });
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
