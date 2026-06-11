require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findIan() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Ian%');

  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Found Ian data:", JSON.stringify(data, null, 2));
  }
}

findIan();
