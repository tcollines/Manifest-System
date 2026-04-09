const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, 'backend', '.env')));
const directUrl = envConfig.DATABASE_URL.replace('6543', '5432').split('?')[0];

const sql = postgres(directUrl, { ssl: { rejectUnauthorized: false }, max: 1 });

const ALTER_SQL = `
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN (
    'Super Admin','Administrator','TeamLeader',
    'Head of Dept','HOD','Dept Admin','Dept Finance','Member',
    'Logistics','Coordinator','Resident Coordinator','Reg. Admin'
));
`;

async function run() {
    try {
        console.log('Applying role constraint migration...');
        await sql.unsafe(ALTER_SQL);
        console.log('SUCCESS: Dept Finance is now a valid role in the users table.');
    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

run();
