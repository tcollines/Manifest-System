const { execSync } = require('child_process');

try {
    const result = execSync(`npx supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicles';"`);
    console.log(result.toString());
} catch (error) {
    console.error("Error executing CLI:");
    if (error.stdout) console.log("STDOUT:", error.stdout.toString());
    if (error.stderr) console.error("STDERR:", error.stderr.toString());
}
