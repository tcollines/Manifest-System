
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.SUPABASE_JWT_SECRET;
const anonKey = process.env.SUPABASE_KEY;

if (!secret) {
    console.error('No secret found in env');
    process.exit(1);
}

if (!anonKey) {
    console.error('SUPABASE_KEY not found in env');
    process.exit(1);
}

try {
    const decoded = jwt.verify(anonKey, secret, { algorithms: ['HS256'] });
    console.log('✅ SECRET VERIFIED: matches anon key signature.');
} catch (err: any) {
    console.log('❌ SECRET MISMATCH:', err.message);
}
