
import { supabase } from './src/supabase';

async function checkCategory() {
    const id = "1f5f6de2-d107-4106-bedb-333d6cce8622";
    console.log(`Checking Category for ID: ${id}`);

    const { data, error } = await supabase
        .from('children')
        .select('name, category, status')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Child Data:", data);
        if (data.category === 'Member') {
            console.log("✅ SUCCESS: Category is 'Member'. Fix Verified.");
        } else {
            console.log("❌ FAIL: Category is still", data.category);
        }
    }
}

checkCategory();
