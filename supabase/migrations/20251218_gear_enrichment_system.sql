-- Migration: Gear Enrichment System
-- Feature: Background GearGraph data enrichment
-- Purpose: Periodically check GearGraph for missing gear item data and notify users
-- Date: 2025-12-18

-- ============================================================================
-- UPDATE NOTIFICATIONS TABLE - Add gear_enrichment type
-- ============================================================================

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with gear_enrichment type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'loadout_comment',
    'message_received',
    'friend_request',
    'gear_trade',
    'system',
    'gear_enrichment'
  ));

-- ============================================================================
-- GEAR_ENRICHMENT_SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS gear_enrichment_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  catalog_product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,

  -- Fields that can be enriched (null = no suggestion for this field)
  suggested_weight_grams NUMERIC,
  suggested_description TEXT,
  suggested_price_usd NUMERIC,

  -- Metadata
  match_confidence NUMERIC NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_enrichment_user_status ON gear_enrichment_suggestions(user_id, status);
CREATE INDEX idx_enrichment_gear_item ON gear_enrichment_suggestions(gear_item_id);
CREATE UNIQUE INDEX idx_enrichment_unique_pending ON gear_enrichment_suggestions(gear_item_id, catalog_product_id)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE gear_enrichment_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own enrichment suggestions
CREATE POLICY "Users view own enrichment suggestions"
  ON gear_enrichment_suggestions FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can update their own enrichment suggestions
CREATE POLICY "Users update own enrichment suggestions"
  ON gear_enrichment_suggestions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Service role can insert enrichment suggestions (cron job)
CREATE POLICY "Service role can insert enrichment suggestions"
  ON gear_enrichment_suggestions FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE gear_enrichment_suggestions IS
  'Stores suggestions to enrich gear items with data from GearGraph catalog';
COMMENT ON COLUMN gear_enrichment_suggestions.match_confidence IS
  'Confidence score (0-1) for the catalog product match';
COMMENT ON COLUMN gear_enrichment_suggestions.status IS
  'Suggestion status: pending (awaiting user action), accepted (applied), dismissed (rejected by user)';

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_gear_enrichment_suggestions_updated_at
  BEFORE UPDATE ON gear_enrichment_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
