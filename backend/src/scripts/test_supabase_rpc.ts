import { supabase } from '../supabase';

async function testRPC() {
    console.log("Testing Supabase Service Role connection...");
    const { data: members, error } = await supabase.from('members').select('id, name').limit(1);
    if (error) {
        console.error("❌ Members query error:", error);
    } else {
        console.log("✅ Service role connection verified! Sample member:", members);
    }
}

testRPC();
