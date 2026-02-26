const { execSync } = require('child_process');

try {
    const result = execSync(`npx supabase db execute --query "SELECT indexname FROM pg_indexes WHERE tablename = 'transactions';"`, {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: 'sbp_09fcf3dc154691016a63e5328a481089f8b3063f' }
    });
    console.log(result.toString());
} catch (error) {
    console.error("Error executing command:", error.message);
    if (error.stdout) console.log("STDOUT:", error.stdout.toString());
    if (error.stderr) console.error("STDERR:", error.stderr.toString());
}
