const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://poazorjmzswectxvakzl.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPolicies() {
    const { data, error } = await supabase.rpc('run_sql', { sql: "SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public';" });
    if (error) {
        console.error("Failed to fetch policies:", error);
    } else {
        const offendingPolicies = data.filter(p => {
            const lowerQual = (p.qual || '').toLowerCase();
            const lowerCheck = (p.with_check || '').toLowerCase();
            return lowerQual.includes('jwt') || lowerCheck.includes('jwt') || lowerQual.includes('raw_user_meta_data') || lowerCheck.includes('raw_user_meta_data');
        });

        console.log("Total policies:", data.length);
        console.log("Offending policies (depending on JWT):", offendingPolicies.length);
        console.log(JSON.stringify(offendingPolicies, null, 2));
    }
}
checkPolicies();
