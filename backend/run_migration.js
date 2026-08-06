const { Client } = require('pg'); 
const client = new Client({
  connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl'
}); 
client.connect().then(() => client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check; ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Member', 'Administrator', 'TeamLeader', 'Super Admin', 'Coordinator', 'Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Dept Finance', 'Finance', 'Head of Dept', 'HOD', 'Dept Admin', 'Resident Coordinator', 'Head of Event'));`)).then(() => console.log('Constraint updated')).catch(console.error).finally(() => client.end());
