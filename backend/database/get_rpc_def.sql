
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'submit_child_entry';
