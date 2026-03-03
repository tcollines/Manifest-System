require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function searchGhosts() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    let allUsers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseService.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw error;

        allUsers = allUsers.concat(data.users);
        if (data.users.length < 100) {
            hasMore = false;
        } else {
            page++;
        }
    }

    const ghostEbuf = allUsers.filter(u => u.email === 'flaviamulen5@gmail.com');
    const ghostWilber = allUsers.filter(u => u.email === 'kalulewilberforce7@gmail.com');
    const ghostTl = allUsers.filter(u => u.email === 'gmawanda307@gmail.com');

    // Also log the accounts with @manifest.local for them
    const legacyEbuf = allUsers.filter(u => u.email === 'ebuflavia@manifest.local');
    const legacyWilber = allUsers.filter(u => u.email === 'kalulewilberforce7@manifest.local');

    const output = {
        totalAuthUsers: allUsers.length,
        ghostEbuf,
        ghostWilber,
        ghostTl,
        legacyEbuf,
        legacyWilber
    };

    fs.writeFileSync('ghost_search.json', JSON.stringify(output, null, 2));
    console.log("Wrote ghost_search.json");
}

searchGhosts().catch(console.error);
