
const { createClient } = require('@supabase/supabase-js');
const secret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eHh4eHh4eHh4eHh4eHh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNjY5MzYwMCwiZXhwIjoyMDIyMjY5NjAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Placeholder - I should NOT hardcode.

// I will read .env content manually using fs to avoid dotenv package issues if that is the cause
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim().replace(/"/g, ''); // Simple parse
    }
});

const supabaseUrl = envConfig['SUPABASE_URL'];
const supabaseKey = envConfig['SUPABASE_SERVICE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Failed to load Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Inspecting S378 Members ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    console.log(`Attendance Count: ${attendance ? attendance.length : 0}`);

    if (attendance && attendance.length > 0) {
        const ids = attendance.map(a => a.member_id);
        const { data: members } = await supabase.from('members').select('id, name, category, age_group').in('id', ids);

        console.log(`Members Details Found: ${members ? members.length : 0}`);

        if (members) {
            const categories = {};
            members.forEach(m => {
                categories[m.category] = (categories[m.category] || 0) + 1;
            });
            console.log('Categories:', categories);
        }
    }
}

inspect();
