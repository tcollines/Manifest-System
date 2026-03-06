import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const { data: event, error: eventError } = await supabase.from('events').select('id, manifest_id').limit(1).single();

    if (eventError) {
        console.error("Error fetching event", eventError);
        return;
    }

    console.log("Using event id:", event.id, "manifest id:", event.manifest_id);

    // Mimic the exact object shape coming from UI to API
    const userPayload = {
        id: crypto.randomUUID(),
        name: "Debug First Last",
        role: "Vehicle Coordinator",
        username: "debugfirst",
        password: "password123",
        contact: "256770123456",
        event_id: event.id,
        manifest_id: event.manifest_id,
        department_id: "4630e48a-f97e-48fd-a901-864b591c282f"
    };

    const { data, error } = await supabase.from('users').insert([userPayload]);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert success!");
    }
}

testInsert();
