-- Migration: Create shakedown triggers
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

-- ============================================================================
-- TRIGGER: Feedback count on shakedowns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shakedown_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment feedback count
    UPDATE shakedowns SET feedback_count = feedback_count + 1
    WHERE id = NEW.shakedown_id;

    -- Update reviewer's profile counter (only for top-level feedback)
    IF NEW.parent_id IS NULL THEN
      UPDATE profiles SET shakedowns_reviewed = shakedowns_reviewed + 1
      WHERE id = NEW.author_id;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement feedback count
    UPDATE shakedowns SET feedback_count = feedback_count - 1
    WHERE id = OLD.shakedown_id;

    -- Update reviewer's profile counter (only for top-level feedback)
    IF OLD.parent_id IS NULL THEN
      UPDATE profiles SET shakedowns_reviewed = GREATEST(0, shakedowns_reviewed - 1)
      WHERE id = OLD.author_id;
    END IF;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_feedback_count ON shakedown_feedback;
CREATE TRIGGER trg_feedback_count
AFTER INSERT OR DELETE ON shakedown_feedback
FOR EACH ROW EXECUTE FUNCTION update_shakedown_feedback_count();

-- ============================================================================
-- TRIGGER: Shakedown creation counter
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shakedowns_created_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET shakedowns_created = shakedowns_created + 1
    WHERE id = NEW.owner_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET shakedowns_created = GREATEST(0, shakedowns_created - 1)
    WHERE id = OLD.owner_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_shakedowns_created_count ON shakedowns;
CREATE TRIGGER trg_shakedowns_created_count
AFTER INSERT OR DELETE ON shakedowns
FOR EACH ROW EXECUTE FUNCTION update_shakedowns_created_count();

-- ============================================================================
-- FUNCTION: Check and award badges
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_badges(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  helpful_count INTEGER;
BEGIN
  SELECT shakedown_helpful_received INTO helpful_count
  FROM profiles WHERE id = user_uuid;

  -- Award badges at thresholds (10, 50, 100)
  IF helpful_count >= 10 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'shakedown_helper')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF helpful_count >= 50 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'trail_expert')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF helpful_count >= 100 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'community_legend')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Helpful votes count and badge awards
-- ============================================================================

CREATE OR REPLACE FUNCTION update_helpful_counts()
RETURNS TRIGGER AS $$
DECLARE
  feedback_author UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update feedback helpful_count
    UPDATE shakedown_feedback
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.feedback_id
    RETURNING author_id INTO feedback_author;

    -- Update author's profile reputation
    UPDATE profiles
    SET shakedown_helpful_received = shakedown_helpful_received + 1
    WHERE id = feedback_author;

    -- Check for badge awards
    PERFORM check_and_award_badges(feedback_author);

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update feedback helpful_count
    UPDATE shakedown_feedback
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = OLD.feedback_id
    RETURNING author_id INTO feedback_author;

    -- Update author's profile reputation
    UPDATE profiles
    SET shakedown_helpful_received = GREATEST(0, shakedown_helpful_received - 1)
    WHERE id = feedback_author;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_helpful_count ON shakedown_helpful_votes;
CREATE TRIGGER trg_helpful_count
AFTER INSERT OR DELETE ON shakedown_helpful_votes
FOR EACH ROW EXECUTE FUNCTION update_helpful_counts();

-- ============================================================================
-- TRIGGER: Update shakedown helpful_count aggregate
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shakedown_helpful_aggregate()
RETURNS TRIGGER AS $$
DECLARE
  v_shakedown_id UUID;
BEGIN
  -- Get the shakedown_id from the feedback
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT shakedown_id INTO v_shakedown_id
    FROM shakedown_feedback WHERE id = NEW.feedback_id;
  ELSE
    SELECT shakedown_id INTO v_shakedown_id
    FROM shakedown_feedback WHERE id = OLD.feedback_id;
  END IF;

  -- Update the shakedown's total helpful count
  UPDATE shakedowns
  SET helpful_count = (
    SELECT COALESCE(SUM(f.helpful_count), 0)
    FROM shakedown_feedback f
    WHERE f.shakedown_id = v_shakedown_id
  )
  WHERE id = v_shakedown_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_shakedown_helpful_aggregate ON shakedown_helpful_votes;
CREATE TRIGGER trg_shakedown_helpful_aggregate
AFTER INSERT OR DELETE ON shakedown_helpful_votes
FOR EACH ROW EXECUTE FUNCTION update_shakedown_helpful_aggregate();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION update_shakedown_feedback_count IS 'Maintains denormalized feedback_count on shakedowns';
COMMENT ON FUNCTION update_shakedowns_created_count IS 'Maintains shakedowns_created on profiles';
COMMENT ON FUNCTION check_and_award_badges IS 'Awards badges at reputation thresholds (10, 50, 100)';
COMMENT ON FUNCTION update_helpful_counts IS 'Maintains helpful counts and triggers badge awards';
COMMENT ON FUNCTION update_shakedown_helpful_aggregate IS 'Maintains total helpful_count on shakedowns';
