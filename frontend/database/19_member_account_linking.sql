-- Migration: Member to Account Linking
-- Adds an optional link from dept_church_members to users
-- This allows team members (who don't necessarily have a login initially) to be linked to system accounts.
-- Safe to run, does not drop or alter existing data

ALTER TABLE dept_church_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
