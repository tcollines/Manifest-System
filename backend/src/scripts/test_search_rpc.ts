import { supabase } from '../supabase';

async function testSearchRPC() {
    console.log("Calling supabase.rpc('search_members_v2')...");
    const { data, error } = await supabase.rpc('search_members_v2', {
        _manifest_id: '593fbdbb-8211-44ca-b3e2-8d999c88680c',
        _search_query: '',
        _page: 1,
        _page_size: 10
    });

    if (error) {
        console.error("❌ RPC Error:", error.message || error);
    } else {
        console.log("✅ RPC search_members_v2 returned successfully!");
        console.log("Result sample:", data?.slice(0, 2));
    }
}

testSearchRPC();
