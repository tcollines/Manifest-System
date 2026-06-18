import { supabase } from '../supabase';

async function run() {
  console.log("=== SCANNING FOR ALL LOGINS AND COLLISIONS ===");

  // 1. Get all public users with Lukodda's contact
  const { data: contactUsers, error: contactErr } = await supabase
    .from('users')
    .select('*')
    .or('contact.eq.+256751424629,contact.eq.256751424629,contact.eq.0751424629,contact.ilike.%751424629%');
  
  if (contactErr) console.error(contactErr);
  else console.log("Public users matching contact/phone:", JSON.stringify(contactUsers, null, 2));

  // 2. Get all public users with email containing 'lukodda' or 'jose'
  const { data: emailUsers, error: emailErr } = await supabase
    .from('users')
    .select('*')
    .or('email.ilike.%lukodda%,email.ilike.%jose%');
  
  if (emailErr) console.error(emailErr);
  else console.log("Public users matching email patterns:", JSON.stringify(emailUsers, null, 2));

  // 3. Search GoTrue Auth for any users matching the email 'jlukodda@gmail.com'
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (authErr) {
    console.error(authErr);
  } else {
    console.log("Total GoTrue users fetched:", authUsers.length);
    const byEmail = authUsers.filter(u => u.email?.toLowerCase().includes('lukodda') || u.email?.toLowerCase().includes('joseph') || u.email?.toLowerCase().includes('jose'));
    console.log("GoTrue Users matching emails:", JSON.stringify(byEmail, null, 2));
  }
}

run().catch(console.error);
