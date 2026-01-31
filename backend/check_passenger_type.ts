
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function testPassengerId() {
    const testId = `p-test-${Date.now()}`;
    // Attempt to select with a bad ID type cast invocation to see if it throws
    // or try a dry-run insert if possible. 
    // Safest is to just query information schema again but nicely.

    // Let's try to query a non-existent UUID to see if input sanitizer complains
    const { error } = await supabase.from('passengers').select('*').eq('id', testId);

    if (error) {
        console.log(`Querying passengers with '${testId}' returned error:`, error.message);
        if (error.message.includes('invalid input syntax for type uuid')) {
            console.log("CONCLUSION: passengers.id is UUID type. Frontend 'p-new-' will CRASH.");
        } else {
            console.log("CONCLUSION: Unknown error, possibly text type?");
        }
    } else {
        console.log("CONCLUSION: passengers.id accepts text (or query didn't fail). Likely TEXT type.");
    }

    // Double check users
    const { error: userError } = await supabase.from('users').select('*').eq('id', 'u-test');
    if (userError && userError.message.includes('uuid')) {
        console.log("CONCLUSION: users.id is UUID.");
    } else {
        console.log("CONCLUSION: users.id is likely TEXT.");
    }
}

testPassengerId();
