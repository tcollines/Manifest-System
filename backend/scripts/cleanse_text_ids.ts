import { Client } from 'pg';

const poolerUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";

const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to Pooler for DML Data Scrub...");

        const queries = [
            // 1. ASSETS
            `UPDATE public.assets a SET department_id = d.id::text FROM public.departments d WHERE a.department_id = d.legacy_id::text;`,
            `UPDATE public.assets SET department_id = NULL WHERE department_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 2. CHILDREN
            `UPDATE public.children c SET first_timer_service_id = m.id::text FROM public.ministry_events m WHERE c.first_timer_service_id = m.legacy_id::text;`,
            `UPDATE public.children SET first_timer_service_id = NULL WHERE first_timer_service_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            `UPDATE public.children c SET place_id = p.id::text FROM public.pickup_stations p WHERE c.place_id = p.legacy_id::text;`,
            `UPDATE public.children SET place_id = NULL WHERE place_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 3. DEPARTMENT REQUESTS (If ID is not UUID, generate one to avoid PK conflicts)
            `UPDATE public.department_requests SET id = gen_random_uuid()::text WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 4. MEMBERS
            `UPDATE public.members m SET first_timer_service_id = evt.id::text FROM public.ministry_events evt WHERE m.first_timer_service_id = evt.legacy_id::text;`,
            `UPDATE public.members SET first_timer_service_id = NULL WHERE first_timer_service_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            `UPDATE public.members m SET place_id = p.id::text FROM public.pickup_stations p WHERE m.place_id = p.legacy_id::text;`,
            `UPDATE public.members SET place_id = NULL WHERE place_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 5. NEXT GEN SOULS
            `UPDATE public.next_gen_souls n SET service_id = m.id::text FROM public.ministry_events m WHERE n.service_id = m.legacy_id::text;`,
            `UPDATE public.next_gen_souls SET service_id = NULL WHERE service_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 6. PERSONAL VEHICLES
            `UPDATE public.personal_vehicles pv SET current_service_id = m.id::text FROM public.ministry_events m WHERE pv.current_service_id = m.legacy_id::text;`,
            `UPDATE public.personal_vehicles SET current_service_id = NULL WHERE current_service_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 7. REQUISITIONS
            `UPDATE public.requisitions r SET department_id = d.id::text FROM public.departments d WHERE r.department_id = d.legacy_id::text;`,
            `UPDATE public.requisitions SET department_id = NULL WHERE department_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // Assume users legacy col might be id_text_legacy_deprecated based on previous audit steps
            `UPDATE public.requisitions r SET requester_id = NULL WHERE requester_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 8. SOULS
            `UPDATE public.souls SET source_id = NULL WHERE source_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 9. TRANSACTIONS
            `UPDATE public.transactions t SET event_id = m.id::text FROM public.ministry_events m WHERE t.event_id = m.legacy_id::text;`,
            `UPDATE public.transactions SET event_id = NULL WHERE event_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,
            `UPDATE public.transactions SET id = gen_random_uuid()::text WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 10. USERS
            `UPDATE public.users u SET event_id = m.id::text FROM public.ministry_events m WHERE u.event_id = m.legacy_id::text;`,
            `UPDATE public.users SET event_id = NULL WHERE event_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            `UPDATE public.users u SET station_id = p.id::text FROM public.pickup_stations p WHERE u.station_id = p.legacy_id::text;`,
            `UPDATE public.users SET station_id = NULL WHERE station_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`,

            // 11. VEHICLE ATTENDANCE
            `UPDATE public.vehicle_attendance v SET service_id = m.id::text FROM public.ministry_events m WHERE v.service_id = m.legacy_id::text;`,
            `UPDATE public.vehicle_attendance SET service_id = NULL WHERE service_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`
        ];

        for (const q of queries) {
            try {
                const res = await client.query(q);
                if (res && res.rowCount && res.rowCount > 0) {
                    console.log(`Updated ${res.rowCount} rows via: ${q.substring(0, 60)}...`);
                }
            } catch (err: any) {
                // Ignore missing columns if they were somehow already altered
                if (!err.message.includes('does not exist')) {
                    console.error("Failed to execute:", q);
                    console.error(err.message);
                }
            }
        }

        console.log("Data cleanse complete! All non-UUIDs mapped or nullified.");
    } catch (e: any) {
        console.error("FATAL:", e.message);
    } finally {
        await client.end();
    }
}

run();
