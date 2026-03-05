require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findGhost() {
    console.log("Searching GoTrue globally for isolated/ghost Manifest accounts...");
    // GoTrue listUsers is paginated, let's grab a chunk
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
        console.error("Listing failed:", error);
    } else {
        const matchingUsers = users.filter(u =>
            (u.email && u.email.includes('@manifest')) ||
            (u.user_metadata && u.user_metadata.name && u.user_metadata.name.includes('Ben'))
        );
        console.log("Potential Auth Ghosts Found:", matchingUsers.length);
        matchingUsers.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}, Meta:`, u.user_metadata));
    }
}

findGhost();
