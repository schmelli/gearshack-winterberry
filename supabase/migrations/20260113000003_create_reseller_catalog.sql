-- Migration: Create reseller catalog tables
-- Feature: 057-wishlist-pricing-enhancements
-- Purpose: Store reseller information for Trailblazer price comparison feature

-- =============================================================================
-- Enum: reseller_status
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_status') THEN
    CREATE TYPE reseller_status AS ENUM ('standard', 'vip', 'partner', 'suspended');
  END IF;
END$$;

-- =============================================================================
-- Table: resellers
-- =============================================================================

CREATE TABLE IF NOT EXISTS resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  logo_url TEXT,

  -- Classification
  reseller_type TEXT NOT NULL CHECK (reseller_type IN ('local', 'online', 'chain')),
  status reseller_status NOT NULL DEFAULT 'standard',
  countries_served TEXT[] NOT NULL DEFAULT ARRAY['DE'],

  -- Search integration
  search_url_template TEXT,  -- e.g., 'https://example.com/search?q={query}'
  affiliate_tag TEXT,

  -- Location for local resellers
  location GEOGRAPHY(Point, 4326),
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_postal_code TEXT,
  address_country TEXT,

  -- Management
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 50,  -- Higher = more prominent

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Table: reseller_price_results
-- =============================================================================

CREATE TABLE IF NOT EXISTS reseller_price_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Price data
  price_amount DECIMAL(10, 2) NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  product_url TEXT,
  product_name TEXT,
  in_stock BOOLEAN DEFAULT true,

  -- Cache management
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '6 hours'),

  -- Unique per reseller/item combination
  CONSTRAINT reseller_price_unique UNIQUE (reseller_id, gear_item_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Resellers by country
CREATE INDEX IF NOT EXISTS idx_resellers_countries
ON resellers USING GIN(countries_served);

-- Resellers by location (for local shop search)
CREATE INDEX IF NOT EXISTS idx_resellers_location
ON resellers USING GIST(location)
WHERE location IS NOT NULL;

-- Active resellers
CREATE INDEX IF NOT EXISTS idx_resellers_active
ON resellers(is_active, status, priority DESC)
WHERE is_active = true;

-- Reseller price results by item
CREATE INDEX IF NOT EXISTS idx_reseller_prices_item
ON reseller_price_results(gear_item_id, expires_at);

-- Reseller price results for cleanup
CREATE INDEX IF NOT EXISTS idx_reseller_prices_expires
ON reseller_price_results(expires_at);

-- =============================================================================
-- Trigger: Update updated_at on resellers
-- =============================================================================

CREATE OR REPLACE FUNCTION update_resellers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resellers_updated_at_trigger ON resellers;
CREATE TRIGGER resellers_updated_at_trigger
BEFORE UPDATE ON resellers
FOR EACH ROW
EXECUTE FUNCTION update_resellers_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_price_results ENABLE ROW LEVEL SECURITY;

-- Resellers: Anyone can read active resellers
CREATE POLICY "resellers_select_active"
ON resellers
FOR SELECT
TO authenticated
USING (is_active = true AND status != 'suspended');

-- Resellers: Admin can do everything
CREATE POLICY "resellers_admin_all"
ON resellers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Reseller prices: Authenticated users can read
CREATE POLICY "reseller_prices_select"
ON reseller_price_results
FOR SELECT
TO authenticated
USING (true);

-- Reseller prices: Service role can manage
CREATE POLICY "reseller_prices_service_all"
ON reseller_price_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- Documentation
-- =============================================================================

COMMENT ON TABLE resellers IS 'Outdoor gear resellers for Trailblazer price comparison feature';
COMMENT ON COLUMN resellers.status IS 'Reseller partnership status (standard, vip, partner, suspended)';
COMMENT ON COLUMN resellers.search_url_template IS 'URL template with {query} placeholder for product search';
COMMENT ON COLUMN resellers.priority IS 'Display priority (higher = shown first)';
COMMENT ON TABLE reseller_price_results IS 'Cached price results from resellers with 6-hour TTL';
