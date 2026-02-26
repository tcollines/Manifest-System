import { supabase } from './src/supabase';

async function testQuery() {
    try {
        console.log("Testing connection...");
        const res = await supabase
            .from('ministry_events')
            .select('*', { count: 'exact' });
        // .limit(5); // test without manifest isolation

        console.log("Result lengths:", res.data?.length, "Error:", res.error, "Count:", res.count);
    } catch (e) {
        console.error("Crash:", e);
    }
}
testQuery();
