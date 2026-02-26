
// @ts-nocheck
import { supabase } from '../src/supabase';

export const listAll = async () => {
    // Try to get tables via information_schema
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    });

    if (error) {
        console.error('exec_sql failed:', error.message);
        // Fallback: common table names
        console.log('TABLES:members,service_attendance,ministry_events,souls,passengers,pickup_stations,vehicles,users,google_calendar_sync');
    } else {
        console.log('TABLES:' + data.map(d => d.table_name).join(','));
    }
    process.exit(0);
};

listAll();
