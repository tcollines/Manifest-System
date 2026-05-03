const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
const query = `
CREATE OR REPLACE FUNCTION public.analytics_workflow_summary(
    v_manifest_id UUID,
    v_from TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
    v_to TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
    v_workplans_pending_admin INT;
    v_workplans_finalized INT;
    v_requisitions_pending_admin INT;
    v_requisitions_awaiting_finance INT;
BEGIN
    SELECT COUNT(*) INTO v_workplans_pending_admin
    FROM public.monthly_workplans
    WHERE manifest_id = v_manifest_id
      AND status = 'ADMIN_REVIEW';

    SELECT COUNT(*) INTO v_workplans_finalized
    FROM public.monthly_workplans
    WHERE manifest_id = v_manifest_id
      AND status = 'FINALIZED';

    SELECT COUNT(*) INTO v_requisitions_pending_admin
    FROM public.requisitions
    WHERE manifest_id = v_manifest_id
      AND status = 'PENDING';

    SELECT COUNT(*) INTO v_requisitions_awaiting_finance
    FROM public.requisitions
    WHERE manifest_id = v_manifest_id
      AND status IN ('APPROVED', 'FINANCE_BATCH');

    RETURN jsonb_build_object(
        'workplans_pending_admin', COALESCE(v_workplans_pending_admin, 0),
        'workplans_finalized', COALESCE(v_workplans_finalized, 0),
        'requisitions_pending_admin', COALESCE(v_requisitions_pending_admin, 0),
        'requisitions_awaiting_finance', COALESCE(v_requisitions_awaiting_finance, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
client.connect().then(() => client.query(query)).then(() => {
    console.log('Function updated successfully');
    client.end();
}).catch(console.error);
