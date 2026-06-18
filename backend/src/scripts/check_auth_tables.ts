import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("Connected to DB via pg.");

  try {
    // 1. Search in auth.users
    const { rows: authUsers } = await client.query(
      `SELECT id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at 
       FROM auth.users 
       WHERE email ILIKE '%lukodda%' OR email ILIKE '%joseph%' OR email ILIKE '%jose%'`
    );
    console.log("=== auth.users Matches ===");
    console.log(JSON.stringify(authUsers, null, 2));

    // 2. Search in auth.identities
    const { rows: identities } = await client.query(
      `SELECT * FROM auth.identities WHERE email ILIKE '%lukodda%' OR email ILIKE '%joseph%' OR email ILIKE '%jose%'`
    );
    console.log("=== auth.identities Matches ===");
    console.log(JSON.stringify(identities, null, 2));

    // 3. Search public.users for any users with phone '+256751424629'
    const { rows: publicUsers } = await client.query(
      `SELECT id, name, role, email, username, status, event_id, department_id, password
       FROM public.users
       WHERE contact = '+256751424629' OR contact = '256751424629'`
    );
    console.log("=== public.users matching phone ===");
    console.log(JSON.stringify(publicUsers, null, 2));

    // 4. Let's see if there is any other user using his email 'jlukodda@gmail.com' in public.users
    const { rows: publicUsersEmail } = await client.query(
      `SELECT id, name, role, email, username, status, event_id, department_id
       FROM public.users
       WHERE email = 'jlukodda@gmail.com'`
    );
    console.log("=== public.users matching jlukodda@gmail.com ===");
    console.log(JSON.stringify(publicUsersEmail, null, 2));

    // 5. Let's list any active users with role coordinator/stage coordinator and event MGP VIII
    const { rows: activeMGP } = await client.query(
      `SELECT id, name, role, email, username, status, event_id, department_id
       FROM public.users
       WHERE event_id = '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4'`
    );
    console.log("=== Users under MGP VIII ===");
    console.log(JSON.stringify(activeMGP, null, 2));

  } catch (e: any) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
