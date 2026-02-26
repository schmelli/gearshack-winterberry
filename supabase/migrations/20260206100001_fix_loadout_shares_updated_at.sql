-- Migration: Fix loadout_shares updated_at column
-- Date: 2026-02-06
--
-- Adds the missing updated_at column to loadout_shares table

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loadout_shares' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE loadout_shares ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Recreate the trigger (it was failing because the column was missing)
DROP TRIGGER IF EXISTS update_loadout_shares_updated_at ON loadout_shares;
CREATE TRIGGER update_loadout_shares_updated_at
  BEFORE UPDATE ON loadout_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
