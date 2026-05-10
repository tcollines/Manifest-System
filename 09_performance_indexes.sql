-- Composite Indexes for Analytics Performance Optimization

-- 1. Index on requisitions (manifest_id, department_id, status)
CREATE INDEX IF NOT EXISTS idx_requisitions_manifest_dept_status ON requisitions (manifest_id, department_id, status);

-- 2. Index on ministry_events (manifest_id, type, date)
CREATE INDEX IF NOT EXISTS idx_ministry_events_manifest_type_date ON ministry_events (manifest_id, type, date DESC);

-- 3. Index on members (manifest_id)
CREATE INDEX IF NOT EXISTS idx_members_manifest_id ON members (manifest_id);

-- 4. Index on monthly_workplans (manifest_id, status)
CREATE INDEX IF NOT EXISTS idx_monthly_workplans_manifest_status ON monthly_workplans (manifest_id, status);

-- 5. Index on finance_transactions (manifest_id, type)
CREATE INDEX IF NOT EXISTS idx_finance_tx_manifest_type ON finance_transactions (manifest_id, type);
