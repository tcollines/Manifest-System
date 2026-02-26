
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function repro() {
    console.log('--- REPRODUCING USER INSERT MAPPING ---');

    const testId1 = crypto.randomUUID();
    const testId2 = crypto.randomUUID();

    // Test 1: camelCase departmentId
    console.log(`Test 1: Inserting verify_camel (departmentId: 'd1')`);
    const { error: err1 } = await supabase.from('users').insert([{
        id: testId1,
        name: 'Verify Camel',
        role: 'Member',
        departmentId: 'd1', // camelCase
        email: `camel_${Date.now()}@test.com`,
        contact: '256700000001',
        status: 'Pending',
        password: 'pass'
    }]);
    if (err1) console.error('Error 1:', err1.message);

    // Test 2: snake_case department_id
    console.log(`Test 2: Inserting verify_snake (department_id: 'd1')`);
    const { error: err2 } = await supabase.from('users').insert([{
        id: testId2,
        name: 'Verify Snake',
        role: 'Member',
        department_id: 'd1', // snake_case
        email: `snake_${Date.now()}@test.com`,
        contact: '256700000002',
        status: 'Pending',
        password: 'pass'
    }]);
    if (err2) console.error('Error 2:', err2.message);

    // Verify
    const { data: users } = await supabase.from('users').select('name, department_id').in('id', [testId1, testId2]);

    users?.forEach(u => {
        console.log(`User: ${u.name} -> Dept ID: ${u.department_id}`);
    });

    // Cleanup
    await supabase.from('users').delete().in('id', [testId1, testId2]);
}

repro();
