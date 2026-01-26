import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_CHILDREN = [
    {
        id: 'c-seed-1',
        name: 'Ethan Hunt',
        parent_name: 'Tom Cruise',
        parent_contact: '0700123456',
        age: 10,
        gender: 'Male',
        category: 'Member',
        residence: 'Naguru',
        status: 'Absent',
        joined_date: new Date().toISOString().split('T')[0],
        attended_service_ids: []
    },
    {
        id: 'c-seed-2',
        name: 'Sarah Connor',
        parent_name: 'Kyle Reese',
        parent_contact: '0700654321',
        age: 8,
        gender: 'Female',
        category: 'First Timer',
        residence: 'Kololo',
        status: 'Absent',
        joined_date: new Date().toISOString().split('T')[0],
        attended_service_ids: []
    },
    {
        id: 'c-seed-3',
        name: 'John Wick',
        parent_name: 'Helen Wick',
        parent_contact: '0755987654',
        age: 12,
        gender: 'Male',
        category: 'Member',
        residence: 'Ntinda',
        status: 'Absent',
        joined_date: new Date().toISOString().split('T')[0],
        attended_service_ids: []
    }
];

async function seed() {
    console.log('Seeding children...');
    const { error } = await supabase.from('children').insert(MOCK_CHILDREN);
    if (error) {
        console.error('Error seeding children:', error);
    } else {
        console.log('Successfully added children.');
    }
}

seed();
