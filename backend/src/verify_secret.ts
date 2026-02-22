
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.SUPABASE_JWT_SECRET;
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A';

if (!secret) {
    console.error('No secret found in env');
    process.exit(1);
}

try {
    const decoded = jwt.verify(anonKey, secret, { algorithms: ['HS256'] });
    console.log('✅ SECRET VERIFIED: matches anon key signature.');
} catch (err: any) {
    console.log('❌ SECRET MISMATCH:', err.message);
}
