-- Add category-specific specification fields to gear_items table
-- Feature: Category-specific specs (size, color, volume, materials, tent construction)

ALTER TABLE gear_items
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS volume_liters NUMERIC,
  ADD COLUMN IF NOT EXISTS materials TEXT,
  ADD COLUMN IF NOT EXISTS tent_construction TEXT;

-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_gear_items_size ON gear_items(size);
CREATE INDEX IF NOT EXISTS idx_gear_items_color ON gear_items(color);

-- Add comments
COMMENT ON COLUMN gear_items.size IS 'Item size (e.g., M, L, 42, 10.5) - for clothing, footwear';
COMMENT ON COLUMN gear_items.color IS 'Item color (e.g., Blue, Red/Black) - for clothing, tents, etc.';
COMMENT ON COLUMN gear_items.volume_liters IS 'Volume in liters - for packs and bags';
COMMENT ON COLUMN gear_items.materials IS 'Materials and fabrics used (e.g., Dyneema, Silnylon, Cuben Fiber)';
COMMENT ON COLUMN gear_items.tent_construction IS 'Tent construction type (e.g., freestanding, tunnel, dome, tarp)';
