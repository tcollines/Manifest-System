-- ============================================================
-- Migration 66: Push Notifications Architecture
-- ============================================================

BEGIN;

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_data JSONB NOT NULL,
    user_agent TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.user_push_subscriptions(user_id, is_active);

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workplan_updates BOOLEAN DEFAULT true,
    requisition_updates BOOLEAN DEFAULT true,
    payments BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update Existing Notifications Table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS url TEXT;

-- 4. RLS Policies

-- Allow users to manage their own push subscriptions
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
    ON public.user_push_subscriptions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push subscriptions"
    ON public.user_push_subscriptions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscriptions"
    ON public.user_push_subscriptions FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions"
    ON public.user_push_subscriptions FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Allow users to manage their own preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
    ON public.notification_preferences FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System access policies (bypassed if backend uses service_role, but good for completeness if using authenticated client)
-- Assuming the background worker uses service_role key to bypass RLS.

COMMIT;
