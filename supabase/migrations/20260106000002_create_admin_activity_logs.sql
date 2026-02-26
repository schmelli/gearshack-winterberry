-- ============================================================================
-- Migration: Create Admin Activity Logs Table
-- Feature: Admin Section Enhancement - User Management
--
-- Audit trail for admin actions (role changes, suspensions, etc.)
-- ============================================================================

-- Create admin activity logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Admin who performed the action
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Type of action performed
    action_type TEXT NOT NULL CHECK (action_type IN (
        'role_change',
        'tier_change',
        'suspend',
        'unsuspend',
        'ban',
        'unban',
        'profile_edit',
        'wiki_lock',
        'wiki_unlock',
        'report_resolve'
    )),

    -- Target of the action
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_resource_type TEXT, -- 'user', 'wiki_page', 'report', etc.
    target_resource_id UUID,

    -- Change details
    old_value JSONB,
    new_value JSONB,
    reason TEXT,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for querying by admin
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id
ON admin_activity_logs(admin_id);

-- Index for querying by target user
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_user_id
ON admin_activity_logs(target_user_id);

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action_type
ON admin_activity_logs(action_type);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at
ON admin_activity_logs(created_at DESC);

-- Composite index for filtering by admin and time
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_created
ON admin_activity_logs(admin_id, created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can SELECT activity logs
CREATE POLICY "admin_activity_logs_select_admin" ON admin_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can INSERT activity logs
CREATE POLICY "admin_activity_logs_insert_admin" ON admin_activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        AND admin_id = auth.uid()
    );

-- No one can UPDATE or DELETE logs (immutable audit trail)
-- Policies omitted intentionally to prevent modifications

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE admin_activity_logs IS 'Immutable audit trail for admin actions';
COMMENT ON COLUMN admin_activity_logs.action_type IS 'Type of admin action performed';
COMMENT ON COLUMN admin_activity_logs.old_value IS 'Previous value before the change (JSON)';
COMMENT ON COLUMN admin_activity_logs.new_value IS 'New value after the change (JSON)';
COMMENT ON COLUMN admin_activity_logs.reason IS 'Admin-provided reason for the action';
