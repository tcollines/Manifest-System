
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { toUUID, logLegacyFallback } from '../src/utils/uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFallback() {
    console.log('--- Stage 3A: Fallback Logging Test ---\n');

    const legacyId = 'evt-999-synthetic'; // Non-UUID
    console.log(`Simulating lookup for non-UUID: ${legacyId}`);

    const uuid = toUUID(legacyId);
    if (!uuid) {
        logLegacyFallback('ministry_events', legacyId, 'test_manual');
    }

    // Test a second time to verify rate-limiting
    console.log(`Simulating lookup again (should be rate-limited): ${legacyId}`);
    logLegacyFallback('ministry_events', legacyId, 'test_manual');
}

testFallback();
