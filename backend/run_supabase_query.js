const { execSync } = require('child_process');

try {
    const result = execSync(`npx supabase db query "SELECT indexname FROM pg_indexes WHERE tablename = 'transactions';"`);
    console.log("Indexes on transactions:");
    console.log(result.toString());

    const explain1 = execSync(`npx supabase db query "EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM public.transactions WHERE manifest_id = 'm1' AND event_id = 'f3976613-33e1-45bd-85c8-1a5cbb731cd9';"`);
    console.log("Finance Baseline:");
    console.log(explain1.toString());

    const explain2 = execSync(`npx supabase db query "EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM public.vehicles WHERE manifest_id = 'm1' AND (event_id = 'f3976613-33e1-45bd-85c8-1a5cbb731cd9' OR legacy_event_id = 'MEN GATHER IX');"`);
    console.log("Vehicles Baseline:");
    console.log(explain2.toString());

} catch (error) {
    console.error("Error executing CLI:");
    if (error.stdout) console.log("STDOUT:", error.stdout.toString());
    if (error.stderr) console.error("STDERR:", error.stderr.toString());
}
