const fs = require('fs');
const { Client } = require('pg');

const match = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8').match(/DATABASE_URL=(.*)/);
if (match) {
    const url = match[1].trim();
    const pwdInfo = url.match(/:([^:@]+)@/);
    if (!pwdInfo) {
        console.error("Could not parse password");
        process.exit(1);
    }
    const pwd = pwdInfo[1];
    const direct = `postgres://postgres:${pwd}@db.poazorjmzswectxvakzl.supabase.co:5432/postgres`;
    const client = new Client({ connectionString: direct, ssl: { rejectUnauthorized: false } });

    client.connect().then(() =>
        client.query(`
      SELECT tgname, pg_get_triggerdef(oid) as def
      FROM pg_trigger
      WHERE tgrelid = 'public.children'::regclass;
    `)
    ).then(res => {
        console.log(JSON.stringify(res.rows, null, 2));
        client.end();
    }).catch(e => console.log('ERROR:', e.message));
}
