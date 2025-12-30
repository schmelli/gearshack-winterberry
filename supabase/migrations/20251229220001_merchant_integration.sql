-- Migration: Merchant Integration
-- Feature: 053-merchant-integration
-- Date: 2025-12-29
--
-- Creates tables for merchant accounts, loadouts, offers, and conversions.
-- Includes PostGIS for proximity-based wishlist brokering.

-- ============================================================================
-- 1. Enable PostGIS Extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 2. Extend profiles table with role column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'
      CHECK (role IN ('user', 'merchant', 'admin'));
  END IF;
END $$;

-- ============================================================================
-- 3. Create merchants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('local', 'chain', 'online')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  tax_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT merchants_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

-- ============================================================================
-- 4. Create merchant_locations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  location GEOGRAPHY(Point, 4326) NOT NULL,
  phone TEXT,
  hours JSONB,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_locations_merchant ON merchant_locations(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_locations_geo ON merchant_locations USING GIST(location);

-- ============================================================================
-- 5. Create merchant_catalog_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  weight_grams INTEGER,
  category_id UUID REFERENCES categories(id),
  image_url TEXT,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT merchant_catalog_items_sku_unique UNIQUE (merchant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_catalog_merchant ON merchant_catalog_items(merchant_id);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON merchant_catalog_items(category_id);

-- ============================================================================
-- 6. Create merchant_loadouts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_loadouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  trip_type TEXT,
  season TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  discount_percent DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  hero_image_url TEXT,
  view_count INTEGER DEFAULT 0,
  wishlist_add_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loadouts_merchant ON merchant_loadouts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loadouts_status ON merchant_loadouts(status);
CREATE INDEX IF NOT EXISTS idx_loadouts_slug ON merchant_loadouts(slug);
CREATE INDEX IF NOT EXISTS idx_loadouts_featured ON merchant_loadouts(is_featured, featured_until) WHERE status = 'published';

-- ============================================================================
-- 7. Create merchant_loadout_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_loadout_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loadout_id UUID NOT NULL REFERENCES merchant_loadouts(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES merchant_catalog_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  expert_note TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT merchant_loadout_items_unique UNIQUE (loadout_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_loadout_items_loadout ON merchant_loadout_items(loadout_id);
CREATE INDEX IF NOT EXISTS idx_loadout_items_catalog ON merchant_loadout_items(catalog_item_id);

-- ============================================================================
-- 8. Create loadout_availability table
-- ============================================================================

CREATE TABLE IF NOT EXISTS loadout_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loadout_id UUID NOT NULL REFERENCES merchant_loadouts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES merchant_locations(id) ON DELETE CASCADE,
  is_in_stock BOOLEAN DEFAULT true,
  stock_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loadout_availability_unique UNIQUE (loadout_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_loadout ON loadout_availability(loadout_id);

-- ============================================================================
-- 9. Create merchant_offers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES merchant_catalog_items(id) ON DELETE CASCADE,
  wishlist_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  regular_price DECIMAL(10, 2) NOT NULL,
  offer_price DECIMAL(10, 2) NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'expired', 'converted')),
  expires_at TIMESTAMPTZ NOT NULL,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  offer_fee_charged DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_merchant ON merchant_offers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_offers_user ON merchant_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON merchant_offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires ON merchant_offers(expires_at) WHERE status IN ('pending', 'viewed', 'accepted');

-- ============================================================================
-- 10. Create user_location_shares table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_location_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  granularity TEXT NOT NULL DEFAULT 'none' CHECK (granularity IN ('city', 'neighborhood', 'none')),
  location GEOGRAPHY(Point, 4326),
  city TEXT,
  neighborhood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_location_shares_unique UNIQUE (user_id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_location_shares_user ON user_location_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_merchant ON user_location_shares(merchant_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_geo ON user_location_shares USING GIST(location) WHERE granularity != 'none';

-- ============================================================================
-- 11. Create conversions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES merchant_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES merchant_catalog_items(id) ON DELETE CASCADE,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  commission_amount DECIMAL(10, 2) NOT NULL,
  is_local_pickup BOOLEAN DEFAULT false,
  pickup_location_id UUID REFERENCES merchant_locations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'refunded')),
  requires_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversions_offer ON conversions(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_merchant ON conversions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON conversions(conversion_date);
CREATE INDEX IF NOT EXISTS idx_conversions_review ON conversions(requires_review) WHERE requires_review = true;

-- ============================================================================
-- 12. Create merchant_transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('listing_fee', 'offer_fee', 'commission', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'disputed')),
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cycle ON merchant_transactions(billing_cycle_start, billing_cycle_end);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON merchant_transactions(status);

-- ============================================================================
-- 13. Create merchant_blocks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT merchant_blocks_unique UNIQUE (user_id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_user ON merchant_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_merchant ON merchant_blocks(merchant_id);

-- ============================================================================
-- 14. Extend gear_items with source attribution columns
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gear_items' AND column_name = 'source_merchant_id'
  ) THEN
    ALTER TABLE gear_items ADD COLUMN source_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gear_items' AND column_name = 'source_offer_id'
  ) THEN
    ALTER TABLE gear_items ADD COLUMN source_offer_id UUID REFERENCES merchant_offers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gear_items' AND column_name = 'source_loadout_id'
  ) THEN
    ALTER TABLE gear_items ADD COLUMN source_loadout_id UUID REFERENCES merchant_loadouts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 15. Create proximity bucket function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proximity_bucket(distance_meters FLOAT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN distance_meters <= 5000 THEN '5km'
    WHEN distance_meters <= 10000 THEN '10km'
    WHEN distance_meters <= 25000 THEN '25km'
    WHEN distance_meters <= 50000 THEN '50km'
    ELSE '100km+'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 16. Create wishlist users nearby RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_wishlist_users_nearby(
  merchant_lat DOUBLE PRECISION,
  merchant_lng DOUBLE PRECISION,
  radius_meters INTEGER,
  p_catalog_item_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  anonymous_id TEXT,
  proximity_bucket TEXT,
  added_days_ago INTEGER,
  can_send_offer BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH merchant_point AS (
    SELECT ST_Point(merchant_lng, merchant_lat)::geography AS point
  ),
  nearby_users AS (
    SELECT
      uls.user_id,
      'User ' || CHR(65 + ROW_NUMBER() OVER (ORDER BY uls.user_id)::int - 1) AS anon_id,
      ST_Distance(uls.location, mp.point) AS distance_m,
      gi.id AS wishlist_item_id,
      gi.created_at AS added_at,
      gi.catalog_product_id
    FROM user_location_shares uls
    CROSS JOIN merchant_point mp
    JOIN gear_items gi ON gi.user_id = uls.user_id AND gi.status = 'wishlist'
    WHERE uls.granularity != 'none'
      AND ST_DWithin(uls.location, mp.point, radius_meters)
      AND (p_catalog_item_id IS NULL OR gi.catalog_product_id = p_catalog_item_id)
  )
  SELECT
    nu.user_id,
    nu.anon_id::TEXT,
    get_proximity_bucket(nu.distance_m),
    EXTRACT(DAY FROM now() - nu.added_at)::INTEGER,
    NOT EXISTS (
      SELECT 1 FROM merchant_blocks mb
      WHERE mb.user_id = nu.user_id
        AND mb.merchant_id IN (SELECT m.id FROM merchants m WHERE m.user_id = auth.uid())
    ) AND NOT EXISTS (
      SELECT 1 FROM merchant_offers mo
      WHERE mo.user_id = nu.user_id
        AND mo.catalog_item_id = nu.catalog_product_id
        AND mo.created_at > now() - INTERVAL '30 days'
    )
  FROM nearby_users nu;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 17. Create merchant analytics function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_merchant_analytics(
  p_merchant_id UUID,
  p_period_days INT DEFAULT 30
)
RETURNS TABLE (
  loadout_views BIGINT,
  wishlist_adds BIGINT,
  offers_sent BIGINT,
  offers_accepted BIGINT,
  conversions BIGINT,
  revenue DECIMAL,
  conversion_rate DECIMAL
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := now() - (p_period_days || ' days')::INTERVAL;

  RETURN QUERY
  SELECT
    COALESCE(SUM(ml.view_count), 0)::BIGINT AS loadout_views,
    COALESCE(SUM(ml.wishlist_add_count), 0)::BIGINT AS wishlist_adds,
    (SELECT COUNT(*)::BIGINT FROM merchant_offers WHERE merchant_id = p_merchant_id AND created_at >= v_start_date) AS offers_sent,
    (SELECT COUNT(*)::BIGINT FROM merchant_offers WHERE merchant_id = p_merchant_id AND status = 'accepted' AND responded_at >= v_start_date) AS offers_accepted,
    (SELECT COUNT(*)::BIGINT FROM conversions WHERE merchant_id = p_merchant_id AND conversion_date >= v_start_date) AS conversions,
    COALESCE((SELECT SUM(sale_price) FROM conversions WHERE merchant_id = p_merchant_id AND conversion_date >= v_start_date), 0) AS revenue,
    CASE
      WHEN (SELECT COUNT(*) FROM merchant_offers WHERE merchant_id = p_merchant_id AND status = 'accepted' AND responded_at >= v_start_date) > 0
      THEN ROUND(
        (SELECT COUNT(*)::DECIMAL FROM conversions WHERE merchant_id = p_merchant_id AND conversion_date >= v_start_date) /
        (SELECT COUNT(*)::DECIMAL FROM merchant_offers WHERE merchant_id = p_merchant_id AND status = 'accepted' AND responded_at >= v_start_date) * 100,
        2
      )
      ELSE 0
    END AS conversion_rate
  FROM merchant_loadouts ml
  WHERE ml.merchant_id = p_merchant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 18. Create merchant loadout pricing view
-- ============================================================================

CREATE OR REPLACE VIEW merchant_loadout_pricing AS
SELECT
  ml.id AS loadout_id,
  ml.merchant_id,
  ml.name,
  ml.discount_percent,
  SUM(mci.price * mli.quantity) AS individual_total,
  SUM(mci.price * mli.quantity) * (ml.discount_percent / 100) AS discount_amount,
  SUM(mci.price * mli.quantity) * (1 - ml.discount_percent / 100) AS bundle_price,
  SUM(COALESCE(mci.weight_grams, 0) * mli.quantity) AS total_weight_grams,
  COUNT(mli.id) AS item_count
FROM merchant_loadouts ml
LEFT JOIN merchant_loadout_items mli ON ml.id = mli.loadout_id
LEFT JOIN merchant_catalog_items mci ON mli.catalog_item_id = mci.id
GROUP BY ml.id;

-- ============================================================================
-- 19. Create updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'merchants',
    'merchant_catalog_items',
    'merchant_loadouts',
    'user_location_shares'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
