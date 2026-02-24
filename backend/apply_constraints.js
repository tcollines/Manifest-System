const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://poazorjmzswectxvakzl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgxMTI2OCwiZXhwIjoyMDgyMzg3MjY4fQ.glE5WryFIWPufnm0jZziS2DCY2vfnPAiTrdpdbmc6Cw');

async function run() {
    const query = `
        -- 1. Unique Username Index
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_not_null 
        ON public.users(username) 
        WHERE username IS NOT NULL;

        -- 2. Foreign Key Constraint for Identity Integrity
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'users_id_fkey'
            ) THEN
                ALTER TABLE public.users 
                ADD CONSTRAINT users_id_fkey 
                FOREIGN KEY (id) 
                REFERENCES auth.users(id) 
                ON DELETE CASCADE;
            END IF;
        END $$;
        
        -- 3. Role Check Constraint
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'users_role_check'
            ) THEN
                ALTER TABLE public.users 
                ADD CONSTRAINT users_role_check 
                CHECK (role IN ('Super Admin', 'Administrator', 'Coordinator', 'Logistics', 'Member', 'TeamLeader'));
            END IF;
        END $$;
        
        -- 4. Set Role to NOT NULL
        ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;
    `;

    // We will use the REST API `run_sql` or an RPC to run arbitrary DDL if one exists, 
    // but standard supabase-js prevents DDL execution. 
    // Since direct PG connection via node `pg` on 6543/5432 has issues, 
    // we can create an RPC to run arbitrary SQL.
    const { data, error } = await supabase.rpc('run_sql', { sql: query });
    console.log("Result:", data, error);
}
run().catch(console.error);
