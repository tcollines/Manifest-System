const { createClient } = require('@supabase/supabase-js');
const url = 'https://poazorjmzswectxvakzl.supabase.co';
const providedKey = 'sb_secret_M5w-_KV6OtotRjn-KTw9Xg_6iUoezJP';

async function testKey() {
    console.log(`--- Testing provided key format ---`);
    const supabase = createClient(url, providedKey);

    const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Access Refused with provided key:", error.message);
    } else {
        console.log(`Access Granted! Found ${count} rows.`);
    }
}

testKey();
