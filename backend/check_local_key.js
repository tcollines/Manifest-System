require('dotenv').config();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (key) {
    console.log(`Local Service Role Key Suffix: ${key.slice(-10)}`);
} else {
    console.log("No Local Service Role Key found.");
}
