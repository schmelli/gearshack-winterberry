-- Migration: T003 - Create comment notification trigger
-- Feature: 048-shared-loadout-enhancement
-- Purpose: Automatically notify loadout owner when someone comments on their shared loadout
-- Date: 2025-12-14

-- Function to notify loadout owner when comment is posted
CREATE OR REPLACE FUNCTION notify_loadout_owner_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Get the owner ID from the loadout share
  SELECT owner_id INTO v_owner_id
  FROM loadout_shares
  WHERE share_token = NEW.share_token;

  -- Only notify if owner exists
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_owner_id,
      'loadout_comment',
      'loadout_comment',
      NEW.id::TEXT,
      COALESCE(NEW.author, 'Someone') || ' commented on your loadout'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION notify_loadout_owner_on_comment() IS
  'Trigger function that creates a notification when someone comments on a shared loadout';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_loadout_comment_notify ON loadout_comments;

-- Create trigger on loadout_comments insert
CREATE TRIGGER on_loadout_comment_notify
AFTER INSERT ON loadout_comments
FOR EACH ROW EXECUTE FUNCTION notify_loadout_owner_on_comment();
