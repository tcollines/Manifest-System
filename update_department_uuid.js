const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OLD_UUID = 'd1100000-0000-0000-0000-000000000000';
const NEW_UUID = 'afc0240b-0faf-48ec-a1d8-ad2f193eb891';

async function run() {
    console.log('New UUID will be:', NEW_UUID);

    const { data: oldDept } = await supabase.from('departments').select('*').eq('id', OLD_UUID).single();
    if (!oldDept) {
         console.error('Old department not found.');
         return;
    }

    // Temporarily rename slug of old department
    await supabase.from('departments').update({ slug: 'sales-old' }).eq('id', OLD_UUID);

    // Insert new department (generate new uuid for unique constraint)
    const newDeptData = { ...oldDept, id: NEW_UUID, uuid: crypto.randomUUID(), slug: 'sales' };
    const { error: insertError } = await supabase.from('departments').insert(newDeptData);
    if (insertError) {
         console.error('Failed to insert new department:', insertError);
         return;
    }

    // Reassign users
    const { error: userUpdateError } = await supabase
         .from('users')
         .update({ department_id: NEW_UUID })
         .eq('department_id', OLD_UUID);
    
    if (userUpdateError) console.error('Failed to update users:', userUpdateError);
    
    // Reassign user_roles (if any)
    const { error: roleUpdateError } = await supabase
         .from('user_roles')
         .update({ department_id: NEW_UUID })
         .eq('department_id', OLD_UUID);
         
    if (roleUpdateError) console.error('Failed to update user_roles:', roleUpdateError);

    // Delete old department
    const { error: deleteError } = await supabase.from('departments').delete().eq('id', OLD_UUID);
    if (deleteError) console.error('Failed to delete old department:', deleteError);
    else console.log('Successfully swapped UUID via insert/delete!');
}

run();
