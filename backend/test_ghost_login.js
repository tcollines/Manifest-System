require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testGhostLogin() {
    const email = 'manifest-19349c25-1eab-4dff-b040-d7904ba88c1c@manifest.local';
    console.log(`Simulating Ghost Login for ${email}...`);

    // We can't actually 'login' without the password, but we can generate a magical admin link
    // or inspect the user's raw metadata in GoTrue.
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const ben = users.find(u => u.email === email);

    if (ben) {
        console.log("Raw Auth User Object:");
        console.log(JSON.stringify(ben, null, 2));

        console.log("\nWhat happens to this data when passed through JWT logic?");
        console.log("App Metadata Role:", ben.app_metadata.role);
    } else {
        console.log("User not found.");
    }
}

testGhostLogin();
