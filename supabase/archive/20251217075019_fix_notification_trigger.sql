-- Feature 048: Shared Loadout Enhancement
-- Phase 9: Comment Notifications
-- Migration: Fix notification trigger to include share_token for navigation
--
-- Issue: The current trigger stores 'loadout_comment' in reference_type,
-- but we need the share_token to navigate to the shared loadout.
-- Solution: Store share_token in reference_type and comment_id in reference_id
--
-- This migration updates the trigger function to properly store the share_token.

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_loadout_comment_notify ON loadout_comments;

-- Update trigger function to store share_token in reference_type
CREATE OR REPLACE FUNCTION notify_loadout_owner_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_loadout_name TEXT;
BEGIN
  -- Get owner ID and loadout name from the share
  SELECT owner_id, (payload->'loadout'->>'name')::TEXT
  INTO v_owner_id, v_loadout_name
  FROM loadout_shares
  WHERE share_token = NEW.share_token;

  -- Only notify if owner exists
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_owner_id,
      'loadout_comment',
      NEW.share_token,           -- Store share_token for navigation
      NEW.id::TEXT,              -- Store comment_id for reference
      COALESCE(NEW.author, 'Someone') || ' commented on your loadout'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_loadout_comment_notify
AFTER INSERT ON loadout_comments
FOR EACH ROW EXECUTE FUNCTION notify_loadout_owner_on_comment();

-- Add comment explaining the field usage
COMMENT ON COLUMN notifications.reference_type IS
  'For loadout_comment type: contains the share_token for navigation. For other types: contains the entity type.';
COMMENT ON COLUMN notifications.reference_id IS
  'For loadout_comment type: contains the comment_id. For other types: contains the entity ID.';
