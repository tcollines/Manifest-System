const fs = require('fs');
const env = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};
const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_ANON_KEY');

async function run() {
    console.log("Fetching users...");
    const res = await fetch(`${url}/rest/v1/users?select=id,email,name,created_at`, {
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
    const emailMap = new Map();
    const toDelete = [];

    users.forEach(u => {
        if (!u.email) return;
        if (!emailMap.has(u.email)) {
            emailMap.set(u.email, []);
        }
        emailMap.get(u.email).push(u);
    });

    for (const [email, records] of emailMap.entries()) {
        if (records.length > 1) {
            console.log(`Duplicate found for ${email} (${records.length} records)`);
            // Sort: keep the one with a name, then oldest
            records.sort((a, b) => {
                if (!!a.name !== !!b.name) return !!a.name ? -1 : 1;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            const keep = records[0];
            const duplicates = records.slice(1);

            console.log(`  Keeping ID: ${keep.id}`);
            for (const d of duplicates) {
                console.log(`  Deleting duplicate ID: ${d.id}`);
                toDelete.push(d.id);
            }
        }
    }

    if (toDelete.length === 0) {
        console.log("No duplicates found to delete.");
        return;
    }

    console.log(`Attempting to delete ${toDelete.length} duplicates...`);
    // Try to hard delete. If it fails due to FK, we'll soft delete.
    for (const id of toDelete) {
        const delRes = await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        if (delRes.ok) {
            console.log(`  Successfully deleted ${id}`);
        } else {
            console.log(`  Failed to delete ${id}, maybe FK constraints. Applying Soft Delete...`);
            const patchRes = await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'Deleted',
                    email: `duplicate_deduped_${id}@manifest.local`,
                    username: `duplicate_deduped_${id}`
                })
            });
            if (patchRes.ok) {
                console.log(`  Successfully Soft Deleted ${id}`);
            } else {
                console.error(`  Failed to soft delete ${id}:`, await patchRes.text());
            }
        }
    }

    console.log("Deduplication complete!");
}

run();
