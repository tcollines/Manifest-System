const crypto = require('crypto');
const axios = require('axios');

async function testJwk() {
    const res = await axios.get('https://poazorjmzswectxvakzl.supabase.co/rest/v1/jwks'); // or /auth/v1/keys
    console.log(res.data);
}
testJwk();
