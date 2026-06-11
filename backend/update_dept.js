require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    console.log("Running...");
    const { data, error } = await supabase
        .from('users')
        .update({ department_id: '81b8b740-6663-4179-bcfb-e3dc7524d36c' })
        .eq('role', 'Logistics');
    
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Updated temp users.");
    }
}
main();
