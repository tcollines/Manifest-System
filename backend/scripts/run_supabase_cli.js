const { execSync } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
}

const file = process.argv[2];
try {
    console.log(`Executing ${file} via npx supabase...`);
    // Pass the file as a positional argument, not via --file
    const output = execSync(`npx supabase db execute "${file}" --db-url "${dbUrl}"`, { stdio: 'inherit' });
    console.log("Success!");
} catch (error) {
    console.error("Execution Failed.");
    process.exit(1);
}
