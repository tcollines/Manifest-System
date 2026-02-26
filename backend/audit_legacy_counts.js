const { execSync } = require('child_process');

const queries = [
    "SELECT 'ministry_events' as table, COUNT(*) as legacy_count FROM ministry_events WHERE legacy_id IS NOT NULL;",
    "SELECT 'members' as table, COUNT(*) as legacy_count FROM members WHERE legacy_id IS NOT NULL;",
    "SELECT 'pickup_stations' as table, COUNT(*) as legacy_count FROM pickup_stations WHERE legacy_id IS NOT NULL;",
    "SELECT 'vehicles' as table, COUNT(*) as legacy_count FROM vehicles WHERE legacy_id IS NOT NULL;",
    "SELECT 'passengers' as table, COUNT(*) as legacy_count FROM passengers WHERE legacy_id IS NOT NULL;",
    "SELECT 'souls' as table, COUNT(*) as legacy_count FROM souls WHERE legacy_id IS NOT NULL OR legacy_event_id IS NOT NULL OR legacy_station_id IS NOT NULL OR legacy_vehicle_id IS NOT NULL;",
    "SELECT 'service_attendance' as table, COUNT(*) as legacy_count FROM service_attendance WHERE legacy_service_id IS NOT NULL OR legacy_member_id IS NOT NULL;",
    "SELECT 'personal_vehicles' as table, COUNT(*) as legacy_count FROM personal_vehicles WHERE current_service_id IS NOT NULL AND current_service_id_uuid IS NULL;",
    "SELECT 'children' as table, COUNT(*) as legacy_count FROM children WHERE legacy_id IS NOT NULL;"
];

console.log("Auditing Legacy Column Data...");

queries.forEach(query => {
    try {
        const result = execSync(`npx supabase db query "${query}"`);
        console.log(result.toString());
    } catch (error) {
        console.error(`Error executing query for ${query}:`);
        if (error.stdout) console.log(error.stdout.toString());
        if (error.stderr) console.error(error.stderr.toString());
    }
});
