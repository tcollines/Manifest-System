import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sql = `
CREATE OR REPLACE FUNCTION run_explain_analyze(q text) 
RETURNS TABLE(plan json) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || q;
END;
$$;
`;

async function setup() {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
        console.error("Failed to create run_explain_analyze:", error);
    } else {
        console.log("Created run_explain_analyze successfully.");

        // Test it on the transactions KPI query
        const query = "SELECT * FROM transactions WHERE manifest_id = 'm1' AND event_id = 'e1';";
        const { data, error: runError } = await supabase.rpc('run_explain_analyze', { q: query });
        if (runError) {
            console.error("Failed to run explain:", runError);
        } else {
            console.log("Query Plan:");
            console.log(JSON.stringify(data, null, 2));
        }
    }
}
setup();
