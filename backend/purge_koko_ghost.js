require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fix() {
    console.log("Locating the true Koko Public ID...");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: pubData } = await supabase.from('users').select('*').ilike('username', '%koko%').single();
    if (!pubData) return console.log("Missing public record");

    console.log("Public Koko UUID:", pubData.id);

    console.log("Hunting down Ghost in auth.users via paginated brute-force iteration...");
    let ghostId = null;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (pageData.users.length === 0) break;

        const hostagetaker = pageData.users.find(u => u.email && u.email.toLowerCase() === pubData.email.toLowerCase());
        if (hostagetaker) {
            console.log("FOUND THE GHOST!", hostagetaker.id);
            ghostId = hostagetaker.id;
            break;
        }
        page++;
    }

    if (ghostId) {
        console.log("Purging Ghost UUID:", ghostId);
        await supabase.auth.admin.deleteUser(ghostId);
        console.log("Ghost erased.");
    } else {
        console.log("No ghosts found. Free to create.");
    }

    console.log("Force recreating Koko natively with explicit UUID parity...");
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: pubData.id,
            email: pubData.email,
            password: 'Isaiah40:31',
            email_confirm: true,
            user_metadata: { role: pubData.role }
        })
    });

    console.log("Creation Status:", res.status);
    console.log("Creation Body:", await res.text());

    console.log("Testing exact Proxy path right now...");
    const pRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Koko', password: 'Isaiah40:31' })
    });
    console.log("Proxy Result HTTP:", pRes.status, await pRes.text());
}

fix().catch(console.error);
