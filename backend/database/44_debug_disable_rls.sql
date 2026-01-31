-- DIAGNOSTIC: Disable RLS Temporarily
-- This is to confirm if "Row Level Security" is blocking the data.
-- Executing this should instantly make data visible on the frontend.

-- 1. Disable RLS on Members
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on Events
ALTER TABLE public.ministry_events DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on Users (just in case)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
