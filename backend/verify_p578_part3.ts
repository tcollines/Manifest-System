import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://poazorjmzswectxvakzl.supabase.co';
const SUPABASE_KEY = 'sb_secret_M5w-_KV6OtotRjn-KTw9Xg_6iUoezJP';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        const eventId = '480d37e6-ad32-4b59-abbc-0944977b00b2'; // P578

        // Let's get ALL members and check their attended_service_ids
        console.log("Fetching members with P578...");
        
        const { data: allMembers } = await supabase
            .from('members')
            .select('id, attended_service_ids');
            
        let membersCount = 0;
        let childrenCount = 0;

        if (allMembers) {
            allMembers.forEach(member => {
                if (member.attended_service_ids && Array.isArray(member.attended_service_ids)) {
                    if (member.attended_service_ids.includes(eventId)) {
                        membersCount++;
                    }
                }
            });
        }
        
        console.log(`Members with P578 in attended_service_ids: ${membersCount}`);

        const { data: allChildren } = await supabase
            .from('children')
            .select('id, attended_service_ids');
            
        if (allChildren) {
            allChildren.forEach(child => {
                if (child.attended_service_ids && Array.isArray(child.attended_service_ids)) {
                    if (child.attended_service_ids.includes(eventId)) {
                        childrenCount++;
                    }
                }
            });
        }
        
        console.log(`Children with P578 in attended_service_ids: ${childrenCount}`);
        console.log(`Total explicitly tagged: ${membersCount + childrenCount}`);
    } catch (e) {
        console.error(e);
    }
}
main();
