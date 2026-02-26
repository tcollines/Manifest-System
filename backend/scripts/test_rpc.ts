
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log('Testing exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'SELECT 1'
    });

    if (error) {
        console.error('❌ RPC Failed:', error.message);
        if (error.message.includes('function') && error.message.includes('not found')) {
            console.log('Function exec_sql does not exist.');
        }
    } else {
        console.log('✅ RPC SUCCESS! We can use exec_sql for migrations.');
        console.log('Result:', data);
    }
}

testRpc();
