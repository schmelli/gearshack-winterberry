-- Migration: Fix infinite recursion in messaging RLS policies
-- Date: 2025-12-17
-- Issue: conversation_participants policies create circular dependencies

BEGIN;

-- Drop the problematic policies
DROP POLICY IF EXISTS "participants_select_member" ON conversation_participants;
DROP POLICY IF EXISTS "participants_insert_self_or_admin" ON conversation_participants;
DROP POLICY IF EXISTS "participants_delete_admin" ON conversation_participants;

-- ✅ FIX: Simple policy - users can see their own participation records
CREATE POLICY "participants_select_member"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ✅ FIX: Users can only insert themselves as participants
-- Admins adding others should be handled at application level
CREATE POLICY "participants_insert_self"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ✅ FIX: Simplified admin delete - check role directly
CREATE POLICY "participants_delete_admin"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (
    -- Can delete own participation OR
    -- Can delete if you're an admin in this conversation
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
        AND cp.user_id != conversation_participants.user_id  -- Can't query self
    )
  );

COMMIT;
