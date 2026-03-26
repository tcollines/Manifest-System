const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const manifestId = 'tcollines/Manifest-System'; // standard test manifest

    try {
        console.time('fastest queries');

        // Fetch just the attended_service_ids array and filter in JS
        const p1 = supabase
            .from('members')
            .select('attended_service_ids')
            .eq('manifest_id', manifestId)
            .neq('category', 'First Timer')
            .neq('category', 'Guest')
            .not('attended_service_ids', 'is', null);

        const p2 = supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('category', 'First Timer');

        const p3 = supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .in('is_first_time', ['Yes', 'true']);

        const p4 = supabase
            .from('children')
            .select('attended_service_ids')
            .eq('manifest_id', manifestId)
            .not('attended_service_ids', 'is', null);

        const p5 = supabase
            .from('souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId);

        const p6 = supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('soul_won', true);

        const p7 = supabase.from('residences').select('*', { count: 'exact', head: true }).eq('manifest_id', manifestId);

        const tbls = ['residence_outreach_reports', 'school_outreach_reports', 'campus_activities'];
        const p8_10 = tbls.map(t => supabase.from(t).select('souls_won').eq('manifest_id', manifestId));
        const p11 = supabase.from('healing_reports').select('souls_count').eq('manifest_id', manifestId);

        const results = await Promise.all([p1, p2, p3, p4, p5, p6, p7, ...p8_10, p11]);

        const activeMembersCount = (results[0].data || []).filter(m => m.attended_service_ids && m.attended_service_ids.length > 0).length;
        const totalFirstTimers = (results[1].count || 0) + (results[2].count || 0);
        const nextGenActiveCount = (results[3].data || []).filter(m => m.attended_service_ids && m.attended_service_ids.length > 0).length;
        const totalSoulsWon = (results[4].count || 0) + (results[5].count || 0) 
                            + (results[7].data || []).reduce((s, r) => s + (r.souls_won || 0), 0)
                            + (results[8].data || []).reduce((s, r) => s + (r.souls_won || 0), 0)
                            + (results[9].data || []).reduce((s, r) => s + (r.souls_won || 0), 0)
                            + (results[10].data || []).reduce((s, r) => s + (r.souls_count || 0), 0);
        const registeredResidences = results[6].count || 0;

        console.timeEnd('fastest queries');
        
        console.log({
            activeMembers: activeMembersCount,
            totalSoulsWon: totalSoulsWon,
            nextGenActive: nextGenActiveCount,
            totalFirstTimers: totalFirstTimers,
            registeredResidences: registeredResidences
        });
    } catch(e) {
        console.error('Test failed:', e);
    }
})();
