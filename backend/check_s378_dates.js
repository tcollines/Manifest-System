
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const parentEnv = path.resolve(__dirname, '../.env');

let envConfig = {};

try {
    if (fs.existsSync(parentEnv)) {
        fs.readFileSync(parentEnv, 'utf8').split(/\r?\n/).forEach(line => {
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
    console.log('--- JS DATE CHECK ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    try {
        const { data: attendance } = await supabase.from('service_attendance').select('check_in_time').eq('service_id', serviceId);

        if (!attendance) return;

        const dates = {};
        attendance.forEach(a => {
            if (!a.check_in_time) {
                dates['null'] = (dates['null'] || 0) + 1;
            } else {
                const d = a.check_in_time.split('T')[0];
                dates[d] = (dates[d] || 0) + 1;
            }
        });

        console.log('DATES:');
        Object.keys(dates).forEach(d => console.log(`${d}:${dates[d]}`));

    } catch (e) {
        console.error(e.message);
    }
}

check();
