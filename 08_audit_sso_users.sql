-- Audit Script to Identify Misaligned SSO Users
-- Run this in the Supabase SQL Editor to find users who will face Google Login issues.

SELECT 
    p.email AS public_email,
    p.id AS public_uid,
    a.id AS auth_uid,
    p.name,
    p.role
FROM 
    public.users p
JOIN 
    auth.users a ON LOWER(p.email) = LOWER(a.email)
WHERE 
    p.id != a.id;
