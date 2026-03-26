const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));

const rpcSql = `
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis_rpc(p_manifest_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_members int;
    v_total_souls int;
    v_next_gen int;
    v_first_timers int;
    v_first_timers_passengers int;
    v_residences int;
    v_dept_souls int;
    v_passenger_souls int;
BEGIN
    -- 1. Active Members
    SELECT count(*) INTO v_active_members
    FROM public.members
    WHERE manifest_id = p_manifest_id
      AND category NOT IN ('First Timer', 'Guest')
      AND attended_service_ids IS NOT NULL
      AND array_length(attended_service_ids, 1) > 0;

    -- 2. First Timers
    SELECT count(*) INTO v_first_timers
    FROM public.members
    WHERE manifest_id = p_manifest_id
      AND (
          category = 'First Timer' 
          OR first_timer_service_id IN (SELECT id FROM public.ministry_events WHERE manifest_id = p_manifest_id AND type = 'Service')
      );

    -- Passengers First Timers
    SELECT count(*) INTO v_first_timers_passengers
    FROM public.passengers
    WHERE manifest_id = p_manifest_id
      AND (is_first_time = 'Yes' OR is_first_time = 'true')
      AND event_id IN (SELECT id FROM public.ministry_events WHERE manifest_id = p_manifest_id AND type = 'Service');

    -- 3. Souls
    SELECT count(*) INTO v_total_souls FROM public.souls WHERE manifest_id = p_manifest_id;
    
    SELECT count(*) INTO v_passenger_souls
    FROM public.passengers 
    WHERE manifest_id = p_manifest_id AND soul_won = true;
    
    v_total_souls := coalesce(v_total_souls, 0) + coalesce(v_passenger_souls, 0);

    v_dept_souls := 0;
    
    SELECT coalesce(sum(souls_won), 0) INTO v_dept_souls FROM public.residence_outreach_reports WHERE manifest_id = p_manifest_id;
    v_total_souls := v_total_souls + v_dept_souls;
    
    SELECT coalesce(sum(souls_won), 0) INTO v_dept_souls FROM public.school_outreach_reports WHERE manifest_id = p_manifest_id;
    v_total_souls := v_total_souls + v_dept_souls;
    
    SELECT coalesce(sum(souls_won), 0) INTO v_dept_souls FROM public.campus_activities WHERE manifest_id = p_manifest_id;
    v_total_souls := v_total_souls + v_dept_souls;
    
    SELECT coalesce(sum(souls_count), 0) INTO v_dept_souls FROM public.healing_reports WHERE manifest_id = p_manifest_id;
    v_total_souls := v_total_souls + v_dept_souls;

    -- 4. Next Gen Active
    SELECT count(*) INTO v_next_gen
    FROM public.children
    WHERE manifest_id = p_manifest_id
      AND attended_service_ids IS NOT NULL
      AND array_length(attended_service_ids, 1) > 0;

    -- 5. Residences
    SELECT count(*) INTO v_residences FROM public.residences WHERE manifest_id = p_manifest_id;

    RETURN jsonb_build_object(
        'activeMembers', coalesce(v_active_members, 0),
        'totalSoulsWon', coalesce(v_total_souls, 0),
        'nextGenActive', coalesce(v_next_gen, 0),
        'totalFirstTimers', coalesce(v_first_timers, 0) + coalesce(v_first_timers_passengers, 0),
        'registeredResidences', coalesce(v_residences, 0)
    );
END;
$$;
`;

(async () => {
    const client = new Client({ connectionString: envConfig.DATABASE_URL });
    await client.connect();
    try {
        await client.query(rpcSql);
        console.log('RPC created successfully!');
    } catch(e) {
        console.error('Failed to create RPC:', e);
    } finally {
        await client.end();
    }
})();
