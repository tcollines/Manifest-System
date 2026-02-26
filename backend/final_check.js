const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function finalCheck() {
    const googleId = '55bbc8c5-ee4b-4869-8b83-5116e987145c';
    const email = 'abratumwe@gmail.com';

    console.log(`Checking for ID: ${googleId}`);
    const { data: rowById, error: err1 } = await supabase.from('users').select('*').eq('id', googleId).maybeSingle();

    console.log(`Checking for Email: ${email}`);
    const { data: rowByEmail, error: err2 } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    console.log("Row by ID results:", rowById);
    console.log("Row by Email results:", rowByEmail);
}

finalCheck();
