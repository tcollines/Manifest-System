require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fix() {
    console.log("Looking up Koko parity...");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: pubData } = await supabase.from('users').select('*').ilike('username', '%koko%').single();
    if (!pubData) return console.log("Koko not in public");

    console.log("Pub Koko Email:", pubData.email);
    console.log("Pub Koko ID:", pubData.id);

    const { data: authData } = await supabase.auth.admin.listUsers();
    const au = authData.users.find(u => u.email.toLowerCase() === pubData.email.toLowerCase());

    if (!au) {
        console.log("Koko NOT IN AUTH.USERS.");
        console.log("Creating correctly...");
        // Using the REST approach because admin.createUser generates random ID
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
                password: pubData.password,
                email_confirm: true,
                user_metadata: { role: pubData.role }
            })
        });
        const txt = await res.text();
        console.log(res.status, txt);
    } else {
        console.log("Auth Koko Email:", au.email);
        console.log("Auth Koko ID:", au.id);
        console.log("ID Match?", au.id === pubData.id);
        console.log("Confirmed?", au.email_confirmed_at);
        if (au.id !== pubData.id) {
            console.log("UUID MISMATCH! Koko is a Ghost! Deleting and rebuilding...");
            await supabase.auth.admin.deleteUser(au.id);
            console.log("Ghost deleted, run script again to recreate natively!");
        }
    }
}
fix().catch(console.error);
