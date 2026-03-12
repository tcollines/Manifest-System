require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndPrompt() {
    console.log("Checking if cognito_submitted_at exists...");

    // We try to select the column. If it fails with 'column cognito_submitted_at does not exist', we know we need to add it.
    const { error } = await supabase.from('vehicles').select('cognito_submitted_at').limit(1);

    if (error && error.message.includes('cognito_submitted_at')) {
        console.log("==================================================");
        console.log("ACTION REQUIRED: PLEASE RUN THIS IN SUPABASE SQL EDITOR:");
        console.log("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cognito_submitted_at TIMESTAMP WITH TIME ZONE;");
        console.log("==================================================");
    } else if (!error) {
        console.log("Column 'cognito_submitted_at' already exists. We are good to go!");
    } else {
        console.error("Unexpected error:", error.message);
    }
}

checkAndPrompt();
