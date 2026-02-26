const fs = require('fs');
const env = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};
const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_ANON_KEY');

async function fixEmptyEmails() {
    console.log("Fetching users with empty string emails...");
    const res = await fetch(`${url}/rest/v1/users?email=eq.&select=id,email,name`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });

    if (!res.ok) {
        console.error("Fetch failed", await res.text());
        return;
    }

    const users = await res.json();
    if (users.length === 0) {
        console.log("No users with empty string emails found. Checking for exact spacing duplicates...");
        // Just in case we missed them due to exact query
        const allRes = await fetch(`${url}/rest/v1/users?select=id,email,name`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const allUsers = await allRes.json();
        const emptyUsers = allUsers.filter(u => u.email === "");
        if (emptyUsers.length > 0) {
            console.log(`Found ${emptyUsers.length} empty string emails via manual filtering.`);
            for (const u of emptyUsers) {
                await patchToNull(u.id);
            }
        } else {
            console.log("No empty string emails found anywhere.");
        }
        return;
    }

    console.log(`Found ${users.length} users with empty string emails. Converting to NULL...`);

    for (const u of users) {
        await patchToNull(u.id);
    }

    console.log("Empty string cleanup complete!");
}

async function patchToNull(id) {
    const patchRes = await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            email: null
        })
    });
    if (patchRes.ok) {
        console.log(`  Successfully set ID ${id} email to NULL`);
    } else {
        console.error(`  Failed to update ${id}:`, await patchRes.text());
    }
}

fixEmptyEmails();
