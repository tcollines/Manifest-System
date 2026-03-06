const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://poazorjmzswectxvakzl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgxMTI2OCwiZXhwIjoyMDgyMzg3MjY4fQ.glE5WryFIWPufnm0jZziS2DCY2vfnPAiTrdpdbmc6Cw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('users').select('id, name, role, username, event_id').order('created_at', { ascending: false }).limit(5);
    if (error) console.error(error);
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
}

run();
