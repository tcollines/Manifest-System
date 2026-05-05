-- ============================================================
-- Migration: Add follow-up tracking fields to members table
-- File: 67_add_followup_fields_members.sql
-- ============================================================
-- This adds the fields required by the Follow-Up Analysis tab:
--   follow_up_status  → tracks workflow state (Pending/Contacted/Resolved)
--   follow_up_notes   → free-text comment logged by follow-up team
--   followed_up_at    → timestamp when a comment was first saved
--   followed_up_by    → user ID of the person who did the follow-up
-- ============================================================

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS follow_up_status  TEXT    NOT NULL DEFAULT 'Pending'
        CHECK (follow_up_status IN ('Pending', 'Contacted', 'Resolved')),
    ADD COLUMN IF NOT EXISTS follow_up_notes   TEXT,
    ADD COLUMN IF NOT EXISTS followed_up_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS followed_up_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast filtering in the Pending / Followed split
CREATE INDEX IF NOT EXISTS idx_members_follow_up_status
    ON members (follow_up_status);

-- Partial index: quickly fetch members that HAVE a follow-up note
CREATE INDEX IF NOT EXISTS idx_members_followed
    ON members (id)
    WHERE follow_up_notes IS NOT NULL AND follow_up_notes <> '';

-- ── Backfill: mark any existing non-empty notes as 'Contacted' ──────────────
UPDATE members
SET    follow_up_status = 'Contacted'
WHERE  follow_up_notes IS NOT NULL
  AND  follow_up_notes <> ''
  AND  follow_up_status = 'Pending';

-- ============================================================
-- RLS Policies (add if your members table uses RLS)
-- ============================================================
-- Allow authenticated users to read follow-up fields
-- (Adjust to match your existing RLS pattern)

-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "follow_up_read" ON members
--     FOR SELECT TO authenticated USING (true);

-- CREATE POLICY "follow_up_write" ON members
--     FOR UPDATE TO authenticated
--     USING (true)
--     WITH CHECK (true);
