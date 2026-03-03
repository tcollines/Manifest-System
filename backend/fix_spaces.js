require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixSpaces() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("Fetching users to clean spaces...");
    const { data: users, error } = await supabaseService.from('users').select('id, username');

    if (error) {
        console.error(error);
        return;
    }

    let updatedCount = 0;
    for (const u of users) {
        if (!u.username) continue;

        // JS .trim() cleans all whitespace including Unicode \u00A0
        const trimmed = u.username.trim();

        if (trimmed !== u.username) {
            console.log(`Fixing spaces on user ID ${u.id}: "${u.username}" -> "${trimmed}"`);
            const { error: updateErr } = await supabaseService.from('users').update({ username: trimmed }).eq('id', u.id);
            if (updateErr) {
                console.error("Failed to update ID " + u.id, updateErr);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Fixed spaces for ${updatedCount} users.`);
}

fixSpaces().catch(console.error);
