ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_status VARCHAR(50) DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications(push_status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own notifications" ON notifications;
CREATE POLICY "Users can access their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
