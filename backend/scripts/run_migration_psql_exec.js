
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const PSQL_PATH = String.raw`"C:\Users\Abraham\Downloads\Compressed\postgresql-16.11-3-windows-x64-binaries\pgsql\bin\psql.exe"`; // Quoted
const DATABASE_URL = process.env.DATABASE_URL;

console.log(`Using PSQL: ${PSQL_PATH}`);

const sql = `ALTER TABLE passengers ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES pickup_stations(id); ALTER TABLE passengers ADD COLUMN IF NOT EXISTS legacy_station_id TEXT; CREATE INDEX IF NOT EXISTS idx_passengers_station_id ON passengers(station_id);`;

// Construct command carefully
// We need to pass the SQL command.
// On Windows, quoting inner SQL might be tricky.
// Better to write SQL to a temp file and run it.

const fs = require('fs');
const tempSqlFile = path.resolve(__dirname, 'temp_migration.sql');
fs.writeFileSync(tempSqlFile, sql);

const cmd = `${PSQL_PATH} "${DATABASE_URL}" -f "${tempSqlFile}"`;

console.log(`Executing: ${cmd.replace(/:[^:]*@/, ':****@')}`);

exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);

    // Cleanup
    fs.unlinkSync(tempSqlFile);
});
