require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('--- A. COUNT PARITY ---');
    // Using Supabase client pointing auth schema
    const authQuery = await supabase.auth.admin.listUsers();
    console.log('Auth Users Count:', authQuery.data?.users?.length || 0);

    let { count: publicCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    console.log('Public Users Count:', publicCount);

    console.log('\\n--- B. USERNAME COLLISION ---');
    // We fetch all usernames and JS side check
    let { data: users } = await supabase.from('users').select('username').not('username', 'is', null);

    if (users) {
        const counts = {};
        const collisions = [];
        users.forEach(u => {
            counts[u.username] = (counts[u.username] || 0) + 1;
            if (counts[u.username] === 2) collisions.push(u.username);
        });
        console.log('Collisions found:', collisions.length > 0 ? collisions : 'None (0)');
    }

    console.log('\\n--- C. JWT ROLE LEAKAGE ---');
    if (authQuery.data?.users) {
        const leaks = authQuery.data.users.filter(u => u.user_metadata && u.user_metadata.role);
        console.log('Users with JWT role metadata leaked:', leaks.length > 0 ? leaks.map(u => u.id) : 'None (0)');
    }
}
run();
