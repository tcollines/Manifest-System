const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findAllDuplicates() {
    console.log("--- Scanning for DUPLICATES in public.users ---");
    const { data: allUsers, error } = await supabase.from('users').select('id, email, name');

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    const idMap = {};
    const emailMap = {};

    allUsers.forEach(u => {
        if (!idMap[u.id]) idMap[u.id] = [];
        idMap[u.id].push(u.email);

        if (u.email) {
            if (!emailMap[u.email]) emailMap[u.email] = [];
            emailMap[u.email].push(u.id);
        }
    });

    console.log("Duplicate IDs:");
    Object.keys(idMap).forEach(id => {
        if (idMap[id].length > 1) console.log(`ID ${id}: ${idMap[id].join(', ')}`);
    });

    console.log("\nDuplicate Emails:");
    Object.keys(emailMap).forEach(email => {
        if (emailMap[email].length > 1) console.log(`Email ${email}: ${emailMap[email].join(', ')}`);
    });

    console.log("\nScan complete.");
}

findAllDuplicates();
