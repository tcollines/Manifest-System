const axios = require('axios');

const URL = 'https://manifestsystem.onrender.com/api/admin/sql';
const query = `
  SELECT tgname, pg_get_triggerdef(oid) as def
  FROM pg_trigger
  WHERE tgrelid = 'public.children'::regclass;
`;

async function ping() {
    while (true) {
        try {
            console.log('Sending query...');
            const res = await axios.post(URL, { query }, { timeout: 10000 });
            if (res.data && res.data.rows) {
                console.log('SUCCESS!');
                console.log(JSON.stringify(res.data.rows, null, 2));
                break;
            }
        } catch (e) {
            console.log('Error:', e.response?.status || e.message);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

ping();
