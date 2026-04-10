const axios = require('axios');

const URL = 'https://manifest-system-lofy.onrender.com/api/admin/sql';
const query = `
  SELECT id, name, email, username, role, status 
  FROM public.users 
  WHERE email ILIKE 'tl@entebbemanifest.com' OR username ILIKE 'tl@entebbemanifest.com'
  LIMIT 5;
`;

async function fetchRecords() {
    try {
        const res = await axios.post(URL, { query });
        console.table(res.data.rows);
    } catch (e) {
        console.log('Error:', e.response?.data || e.message);
    }
}

fetchRecords();
