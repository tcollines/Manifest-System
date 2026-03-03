require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function inspect() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // We cannot use LIKE with % in standard select easily without textSearch or filters, but we can fetch them all and filter locally, 
    // or use .ilike() for each.

    const targets = ['Koko', 'Portia', 'Charis Otai', 'Moscow', 'Lilian Gimbo', 'Ntaate'];

    const { data: users, error } = await supabaseService.from('users').select('id, username, email, password, status');

    if (error) {
        console.error(error);
        return;
    }

    const filtered = users.filter(u => {
        if (!u.username) return false;
        return targets.some(t => u.username.includes(t));
    }).map(u => ({
        id: u.id,
        quoted_username: `"${u.username}"`, // wrap in quotes to expose whitespace
        email: u.email,
        status: u.status
    }));

    require('fs').writeFileSync('inspected_users.json', JSON.stringify(filtered, null, 2));
    console.log("Wrote inspected_users.json");
}

inspect().catch(console.error);
