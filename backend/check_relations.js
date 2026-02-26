const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const { rows } = await pool.query("SELECT id, title, type FROM ministry_events WHERE title = 'MEN GATHER IX'");
    console.log('Event:', rows[0]);

    if (rows.length > 0) {
        const eventId = rows[0].id;
        const stations = await pool.query('SELECT id, name, event_id FROM pickup_stations WHERE event_id = $1', [eventId]);
        console.log('Stations linked to event:', stations.rows.length);
        if (stations.rows.length > 0) console.log('Sample Station:', stations.rows[0]);

        const vehicles = await pool.query('SELECT id, number_plate, station_id, event_id FROM vehicles WHERE event_id = $1', [eventId]);
        console.log('Vehicles directly linked to event:', vehicles.rows.length);
        if (vehicles.rows.length > 0) console.log('Sample Vehicle:', vehicles.rows[0]);

        // Check if vehicles are linked through stations instead of directly
        const allVehicles = await pool.query('SELECT id, number_plate, station_id, event_id FROM vehicles LIMIT 5');
        console.log('Sample all vehicles:', allVehicles.rows);
    }
    pool.end();
}
run().catch(console.error);
