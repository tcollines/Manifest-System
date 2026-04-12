-- Migration: Make souls.event_id nullable to support non-event soul sources
-- (e.g. Healing Dept outreach, Follow-Up ministry)
-- Run this in Supabase SQL editor

ALTER TABLE souls ALTER COLUMN event_id DROP NOT NULL;
