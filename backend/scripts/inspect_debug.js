
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading env from:', envPath);

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envConfig = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, ''); // Handle value with = and quotes
            if (key && !key.startsWith('#')) {
                envConfig[key] = value;
            }
        }
    });

    console.log('Env keys found:', Object.keys(envConfig));

    const supabaseUrl = envConfig['SUPABASE_URL'] || process.env.SUPABASE_URL;
    const supabaseKey = envConfig['SUPABASE_SERVICE_KEY'] || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Failed to load Supabase credentials. URL or Key missing.');
        if (!supabaseUrl) console.error('Missing SUPABASE_URL');
        if (!supabaseKey) console.error('Missing SUPABASE_SERVICE_KEY');
        // process.exit(1); 
        // fallback to dummy to prevent crash if just testing logic
    } else {
        console.log('Credentials loaded successfully.');
        const supabase = createClient(supabaseUrl, supabaseKey);
        inspect(supabase);
    }

} catch (err) {
    console.error('Error reading .env:', err.message);
}

async function inspect(supabase) {
    console.log('--- Inspecting S378 Members ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    const { data: attendance, error } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    if (error) {
        console.error('Supabase Error:', error);
        return;
    }
    console.log(`Attendance Count: ${attendance ? attendance.length : 0}`);

    if (attendance && attendance.length > 0) {
        const ids = attendance.map(a => a.member_id);
        const { data: members } = await supabase.from('members').select('id, name, category, age_group').in('id', ids);

        console.log(`Members Details Found: ${members ? members.length : 0}`);

        if (members) {
            const categories = {};
            members.forEach(m => {
                const c = m.category || 'Unknown';
                categories[c] = (categories[c] || 0) + 1;
            });
            console.log('Categories:', categories);

            const firstTimers = members.filter(m => m.category === 'First Timer');
            console.log(`First Timers in DB: ${firstTimers.length}`);
        }
    }

    // Check Ministry Event for manualChildrenCount
    try {
        const { data: event } = await supabase.from('ministry_events').select('*').or(`id.eq.${serviceId},id.eq.S378`);
        console.log('Event Data:', JSON.stringify(event, null, 2));
    } catch (e) {
        console.error('Error fetching event:', e);
    }
}
