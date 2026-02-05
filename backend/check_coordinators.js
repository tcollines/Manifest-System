
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCoordinators() {
    try {
        console.log('--- USER DATA AUDIT ---');

        // 1. Get all events to map IDs to titles
        const { data: events, error: eErr } = await supabase.from('events').select('id, title');
        if (eErr) throw eErr;
        const eventMap = events.reduce((acc, e) => ({ ...acc, [e.id]: e.title }), {});

        // 2. Get all users
        const { data: users, error: uErr } = await supabase.from('users').select('*');
        if (uErr) throw uErr;

        console.log(`Total users found: ${users.length}`);

        // 3. Filter for coordinators or similar roles
        const coordinators = users.filter(u =>
            u.role.toLowerCase().includes('coord') ||
            u.role.toLowerCase().includes('transport')
        );

        console.log(`Potential coordinators found: ${coordinators.length}\n`);

        coordinators.forEach(u => {
            const eventTitle = u.event_id ? eventMap[u.event_id] || 'UNKNOWN_EVENT_ID' : 'GLOBAL (NULL)';
            console.log(`User: ${u.name.padEnd(20)} | Role: ${u.role.padEnd(15)} | Event: ${eventTitle} (${u.event_id})`);
        });

        // 4. Check specific events mentioned by user
        const targetEvents = ['The Inter-Schools Conference 2026', 'Night Of Prayer'];
        console.log('\n--- TARGET EVENT CHECK ---');
        targetEvents.forEach(title => {
            const event = events.find(e => e.title.includes(title));
            if (event) {
                const eventCoords = users.filter(u => u.event_id === event.id);
                console.log(`Event: ${title} (id: ${event.id}) | Found ${eventCoords.length} associated users.`);
            } else {
                console.log(`Event: ${title} | NOT FOUND in DB.`);
            }
        });

    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

checkCoordinators();
