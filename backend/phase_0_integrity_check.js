const { execSync } = require('child_process');

const dataChecks = [
    "SELECT 'members' as tbl, COUNT(*) FROM members WHERE id IS NULL AND legacy_id IS NOT NULL;",
    "SELECT 'ministry_events' as tbl, COUNT(*) FROM ministry_events WHERE id IS NULL AND legacy_id IS NOT NULL;",
    "SELECT 'pickup_stations' as tbl, COUNT(*) FROM pickup_stations WHERE id IS NULL AND legacy_id IS NOT NULL;",
    "SELECT 'vehicles' as tbl, COUNT(*) FROM vehicles WHERE id IS NULL AND legacy_id IS NOT NULL;",
    "SELECT 'passengers' as tbl, COUNT(*) FROM passengers WHERE id IS NULL AND legacy_id IS NOT NULL;",
    "SELECT 'souls' as tbl, COUNT(*) FROM souls WHERE id IS NULL AND (legacy_event_id IS NOT NULL OR legacy_station_id IS NOT NULL OR legacy_vehicle_id IS NOT NULL);",
    "SELECT 'service_attendance' as tbl, COUNT(*) FROM service_attendance WHERE id IS NULL;"
];

const fkCheck = `
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND (kcu.column_name LIKE 'legacy_%' OR ccu.column_name LIKE 'legacy_%');
`;

console.log("--- PHASE 0: Data Integrity Check ---");
dataChecks.forEach(query => {
    try {
        const result = execSync(`npx supabase db query "${query}"`);
        console.log(result.toString());
    } catch (e) {
        console.error("Error checking table:", query, e.message);
    }
});

console.log("\n--- PHASE 0: Foreign Key Audit ---");
try {
    const result = execSync(`npx supabase db query "${fkCheck}"`);
    console.log(result.toString());
} catch (e) {
    console.error("Error checking Foreign Keys:", e.message);
}
