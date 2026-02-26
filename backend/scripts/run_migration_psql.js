
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const PSQL_PATH = String.raw`C:\Users\Abraham\Downloads\Compressed\postgresql-16.11-3-windows-x64-binaries\pgsql\bin\psql.exe`;
const DATABASE_URL = process.env.DATABASE_URL;

console.log(`Using PSQL: ${PSQL_PATH}`);
console.log(`Target DB: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`); // log masked

const sql = `
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES pickup_stations(id);
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS legacy_station_id TEXT;
CREATE INDEX IF NOT EXISTS idx_passengers_station_id ON passengers(station_id);
`;

const psql = spawn(PSQL_PATH, [DATABASE_URL, '-c', sql]);

psql.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

psql.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

psql.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
