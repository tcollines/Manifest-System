
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env Robustly
const envPath = path.resolve(__dirname, '../.env');
let envConfig = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    // console.log('Env Content Length:', envContent.length);
    const lines = envContent.split(/\r?\n/);
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            // Join rest in case value has =
            let value = parts.slice(1).join('=').trim();
            // Remove wrapping quotes
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

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
    console.error('Missing credentials. Keys found:', Object.keys(envConfig));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Duplicates (JS V2) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);

        if (!attendance || attendance.length === 0) {
            console.log('No attendance found');
            return;
        }
        console.log(`Total Attendance Records: ${attendance.length}`);

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

        console.log(`Resolved Members Details: ${members.length}`);

        const uniqueMap = new Map();
        const duplicates = [];

        members.forEach(m => {
            if (!m) return;
            const name = m.name ? m.name.trim().toLowerCase() : 'unknown_name';
            const phone = m.phone ? m.phone.replace(/\D/g, '') : 'unknown_phone'; // Normalize phone

            // Key using Name+Phone. 
            // Note: If phone is missing, we might get false positives if names are common.
            // Let's use name|phone but be careful with empty phones.
            const key = `${name}|${phone}`;

            if (uniqueMap.has(key)) {
                duplicates.push({ original: uniqueMap.get(key), duplicate: m });
            } else {
                uniqueMap.set(key, m);
            }
        });

        console.log(`Duplicates Found (Name+Phone): ${duplicates.length}`);
        console.log(`Unique Individuals: ${uniqueMap.size}`);

        // Log some duplicates
        if (duplicates.length > 0) {
            console.log('--- Top 5 Duplicates ---');
            duplicates.slice(0, 5).forEach(d => {
                const o = d.original;
                const dup = d.duplicate;
                console.log(`Duplicate Pair: "${o.name}"`);
                console.log(`  ID 1: ${o.id} (Phone: ${o.phone})`);
                console.log(`  ID 2: ${dup.id} (Phone: ${dup.phone})`);
            });
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
