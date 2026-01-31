-- DIAGNOSTIC 36: Final Verification
-- 1. Check if the e- ID still exists
SELECT * FROM ministry_events WHERE id = 'e-1766929270205';

-- 2. Test the Highlights RPC for the REAL UUID (Night of Prayer)
-- This tells us if the Backend Logic is working (should return JSON with vehicles: 11)
SELECT get_event_highlights('bde9329f-2746-40b1-b2eb-56f2fcf028ee');

-- 3. Test the Highlights RPC for Inter-Schools (Should be 20)
SELECT get_event_highlights('11324002-c401-494b-be68-179650967970');
