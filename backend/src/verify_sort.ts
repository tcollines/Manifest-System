
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const verifySort = async () => {
    console.log("--- VERIFYING SORT ORDER ---");
    const { data, error } = await supabase
        .from('ministry_events')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.log("Sort Failed (Column missing?):", error.message);
    } else {
        console.log("Top 3 Newest Events:");
        data.forEach((e: any) => console.log(`- ${e.title} (${e.created_at})`));
    }
};

verifySort();
