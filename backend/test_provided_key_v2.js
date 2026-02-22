const { createClient } = require('@supabase/supabase-js');
const url = 'https://poazorjmzswectxvakzl.supabase.co';
const providedKey = 'sb_secret_M5w-_KV6OtotRjn-KTw9Xg_6iUoezJP';
const targetId = '55bbc8c5-ee4b-4869-8b83-5116e987145c';

async function testKey() {
    console.log(`--- Testing provided key visibility for ${targetId} ---`);
    const supabase = createClient(url, providedKey);

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, manifest_id')
        .eq('id', targetId)
        .maybeSingle();

    if (userError) {
        console.error("Query Error:", userError.message);
    } else if (!userData) {
        console.log("NOT FOUND: Row still missing via this key.");
    } else {
        console.log("FOUND: Row is visible!", userData);
    }
}

testKey();
