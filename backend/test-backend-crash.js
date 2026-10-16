const jwt = require('jsonwebtoken');
const fetch = require('node-fetch'); // Assuming node-fetch or native fetch
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

async function run() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.log("No SUPABASE_JWT_SECRET found");
    return;
  }

  // Create a token
  const token = jwt.sign({
    id: 'f5dcdfc1-e66e-4571-aa3b-3c31ad5ff74c', // Random user ID
    role: 'Administrator',
    manifest_id: '593fbdbb-8211-44ca-b3e2-8d999c88680c' // Default manifest
  }, secret, { expiresIn: '1h' });

  console.log("Token generated. Making request...");

  try {
    const res = await globalThis.fetch('http://localhost:5000/api/members?page=1&pageSize=50', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const body = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", body);
  } catch (err) {
    console.log("FETCH ERROR:", err);
  }
}

run();
