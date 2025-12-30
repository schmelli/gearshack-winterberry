-- Migration: Create VIP Loadout Items Table
-- Feature: 052-vip-loadouts
-- Description: Individual gear items within a VIP loadout

-- =============================================================================
-- VIP Loadout Items Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vip_loadout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent loadout
  vip_loadout_id UUID NOT NULL REFERENCES vip_loadouts(id) ON DELETE CASCADE,

  -- Optional link to gear database
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,

  -- Item details (standalone or linked)
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  weight_grams INTEGER NOT NULL CHECK (weight_grams >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  notes TEXT,

  -- Organization
  category VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Loadout items lookup
CREATE INDEX IF NOT EXISTS idx_vip_loadout_items_loadout ON vip_loadout_items(vip_loadout_id);

-- Linked gear items
CREATE INDEX IF NOT EXISTS idx_vip_loadout_items_gear ON vip_loadout_items(gear_item_id)
  WHERE gear_item_id IS NOT NULL;

-- Category ordering
CREATE INDEX IF NOT EXISTS idx_vip_loadout_items_category ON vip_loadout_items(vip_loadout_id, category, sort_order);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE vip_loadout_items IS 'Individual gear items within VIP loadouts';
COMMENT ON COLUMN vip_loadout_items.gear_item_id IS 'Optional link to gear database for rich item data';
COMMENT ON COLUMN vip_loadout_items.weight_grams IS 'Weight as stated in source video (may differ from database)';
COMMENT ON COLUMN vip_loadout_items.notes IS 'Admin notes about VIP''s use of this item';
COMMENT ON COLUMN vip_loadout_items.category IS 'Gear category for grouping (shelter, sleep, kitchen, etc.)';
