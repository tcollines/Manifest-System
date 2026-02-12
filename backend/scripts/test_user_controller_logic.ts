
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testControllerLogic() {
    console.log('--- TESTING CONTROLLER LOGIC ---');

    // Simulate req.body from frontend
    const reqBody = {
        id: crypto.randomUUID(),
        name: 'Controller Logic Test',
        role: 'Member',
        departmentId: 'd1', // camelCase
        email: `controller_${Date.now()}@test.com`,
        contact: '256700000005',
        status: 'Pending',
        password: 'pass'
    };

    // Simulate Controller Logic
    const payload = {
        ...reqBody,
        department_id: reqBody.departmentId || (reqBody as any).department_id,
    };
    delete (payload as any).departmentId;

    console.log('Transformed Payload:', JSON.stringify(payload, null, 2));

    // Attempt Insert with Transformed Payload
    const { error } = await supabase.from('users').insert([payload]);

    if (error) {
        console.error('Insert Failed:', error.message);
    } else {
        console.log('Insert Success! Fix verified.');

        // Cleanup
        await supabase.from('users').delete().eq('id', reqBody.id);
    }
}

testControllerLogic();
