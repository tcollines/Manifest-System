const axios = require('axios');

const URL = 'https://manifestsystem.onrender.com/api/admin/sql';
const query = `
  SELECT id, name, parent_contact, category, is_first_timer, joined_date, created_at 
  FROM public.children 
  WHERE LOWER(parent_name) LIKE '%test%' OR LOWER(name) LIKE '%test%'
  ORDER BY created_at DESC 
  LIMIT 10;
`;

async function fetchTestRecords() {
    try {
        const res = await axios.post(URL, { query });
        console.table(res.data.rows);
    } catch (e) {
        console.log('Error:', e.response?.data || e.message);
    }
}

fetchTestRecords();
