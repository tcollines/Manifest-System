
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const parentEnv = path.resolve(__dirname, '../.env');

let envConfig = {};

try {
    // 1. Try Parent .env
    if (fs.existsSync(parentEnv)) {
        console.log('Reading parent .env');
        const envContent = fs.readFileSync(parentEnv, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let value = parts.slice(1).join('=').trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (key && !key.startsWith('#')) envConfig[key] = value;
            }
        });
    }

    // 2. Try Current .env (overwrite)
    if (fs.existsSync(envPath)) {
        console.log('Reading local .env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let value = parts.slice(1).join('=').trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (key && !key.startsWith('#')) envConfig[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Env Error:', e.message);
}

const supabaseUrl = envConfig['SUPABASE_URL'] || process.env.SUPABASE_URL;
const supabaseKey = envConfig['SUPABASE_SERVICE_KEY'] || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Duplicates (Final) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);

        if (!attendance || attendance.length === 0) { console.log('Zero attendance'); return; }
        console.log(`Raw Attendance Records: ${attendance.length}`);

        const memberIds = attendance.map(a => a.member_id);

        let members = [];
        const chunkSize = 200;
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);
            const { data: chk, error } = await supabase.from('members').select('id, name, phone, category, joined_date').in('id', chunk);
            if (chk) members = members.concat(chk);
            if (error) console.error(error.message);
        }

        console.log(`Resolved Members: ${members.length}`);

        const uniqueMap = new Map();
        const duplicates = [];

        members.forEach(m => {
            if (!m) return;
            const name = m.name ? m.name.trim().toLowerCase() : '';
            const phone = m.phone ? m.phone.replace(/\D/g, '') : '';

            if (!name) return; // Skip if no name

            // Key: Name + Phone
            // If phone is empty, maybe just name? No, risky. 
            // Let's use name|phone but treat empty phone as unique unless name is very unique?
            // For now, simple strict key.
            const key = `${name}|${phone}`;

            if (uniqueMap.has(key)) {
                duplicates.push({ original: uniqueMap.get(key), duplicate: m });
            } else {
                uniqueMap.set(key, m);
            }
        });

        console.log(`Duplicates (Name+Phone): ${duplicates.length}`);
        console.log(`Unique Individuals: ${uniqueMap.size}`);

        // Calculate First Timers count
        let uniqueFT = 0;
        let rawFT = 0;
        const serviceDate = '2026-02-08';

        members.forEach(m => {
            // Check by Category
            if (m.category === 'First Timer') rawFT++;

            // Check by Joined Date
            if (m.joined_date && m.joined_date.startsWith(serviceDate)) {
                // Logic from getServiceStats
            }
        });

        for (let m of uniqueMap.values()) {
            if (m.category === 'First Timer') uniqueFT++;
        }

        console.log(`First Timers (Raw Category): ${rawFT}`);
        console.log(`First Timers (Unique Category): ${uniqueFT}`);

    } catch (e) {
        console.error(e.message);
    }
}

check();
