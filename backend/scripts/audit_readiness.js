
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();

        console.log("--- DATA AUDIT ---");
        // 1. DATA AUDIT via PL/pgSQL BLOCK
        client.on('notice', (msg) => console.log('NOTICE:', msg.message));

        await client.query(`
            DO $$
            DECLARE
                users_total INT; users_valid_uuid INT; users_null INT; users_invalid_sample TEXT;
                pv_total INT; pv_valid_uuid INT; pv_null INT; pv_invalid_sample TEXT;
                uuid_regex TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            BEGIN
                -- USERS
                SELECT COUNT(*) INTO users_total FROM public.users;
                SELECT COUNT(*) INTO users_null FROM public.users WHERE id IS NULL;
                SELECT COUNT(*) INTO users_valid_uuid FROM public.users WHERE id ~* uuid_regex;
                SELECT id INTO users_invalid_sample FROM public.users WHERE id IS NOT NULL AND id !~* uuid_regex LIMIT 1;
                
                RAISE NOTICE 'USERS: Total=%, Valid=%, Null=%, InvalidSample=%', users_total, users_valid_uuid, users_null, users_invalid_sample;
                
                -- PV
                SELECT COUNT(*) INTO pv_total FROM public.personal_vehicles;
                SELECT COUNT(*) INTO pv_null FROM public.personal_vehicles WHERE id IS NULL;
                SELECT COUNT(*) INTO pv_valid_uuid FROM public.personal_vehicles WHERE id ~* uuid_regex;
                SELECT id INTO pv_invalid_sample FROM public.personal_vehicles WHERE id IS NOT NULL AND id !~* uuid_regex LIMIT 1;
                
                RAISE NOTICE 'PV: Total=%, Valid=%, Null=%, InvalidSample=%', pv_total, pv_valid_uuid, pv_null, pv_invalid_sample;
            END $$;
        `);

        // 2. SCHEMA - DEFAULTS & TYPES
        console.log('\n--- COLUMN DEFAULTS & TYPES ---');
        const colDefs = await client.query(`
            SELECT table_name, column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'personal_vehicles') AND column_name = 'id'
        `);
        console.table(colDefs.rows);

        // 3. DEPENDENCIES (Users)
        console.log('\n--- SCHEMA DEPENDENCIES (USERS) ---');
        const userDeps = await client.query(`
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users'
        `);
        console.table(userDeps.rows);

        // 4. DEPENDENCIES (Personal Vehicles)
        console.log('\n--- SCHEMA DEPENDENCIES (PERSONAL VEHICLES) ---');
        const pvDeps = await client.query(`
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'personal_vehicles'
        `);
        console.table(pvDeps.rows);

        // 5. CHECK DEPENDENCY TYPES
        let depTables = [];
        let depCols = [];

        userDeps.rows.forEach(r => { depTables.push(r.table_name); depCols.push(r.column_name); });
        pvDeps.rows.forEach(r => { depTables.push(r.table_name); depCols.push(r.column_name); });

        if (depTables.length > 0) {
            console.log('\n--- TYPE CHECK (DEPENDENCIES) ---');
            // Deduplicate tables for query efficiency, or just query all
            const uniqueTables = [...new Set(depTables)].map(t => `'${t}'`).join(',');
            const uniqueCols = [...new Set(depCols)].map(c => `'${c}'`).join(',');

            const typeCheck = await client.query(`
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name IN (${uniqueTables}) AND column_name IN (${uniqueCols})
             `);
            console.table(typeCheck.rows);
        } else {
            console.log('\n(No Dependencies Found)');
        }

    } catch (err) {
        console.error("Audit Error Full Object:", JSON.stringify(err, null, 2));
        console.error("Audit Error Message:", err.message);
    } finally {
        await client.end();
    }
}

run();
