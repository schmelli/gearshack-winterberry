-- Migration: Merchant Integration RLS Policies
-- Feature: 053-merchant-integration
-- Date: 2025-12-29
--
-- Row Level Security policies for merchant tables.

-- ============================================================================
-- Enable RLS on all merchant tables
-- ============================================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_loadout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loadout_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Merchants table policies
-- ============================================================================

-- Public can view approved merchants
CREATE POLICY "Public can view approved merchants"
  ON merchants FOR SELECT
  USING (status = 'approved');

-- Merchants can view and update own record
CREATE POLICY "Merchants can view own record"
  ON merchants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Merchants can update own record"
  ON merchants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert (apply to become merchant)
CREATE POLICY "Users can apply as merchant"
  ON merchants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage all merchants"
  ON merchants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Merchant locations policies
-- ============================================================================

-- Public can view locations of approved merchants
CREATE POLICY "Public can view merchant locations"
  ON merchant_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND status = 'approved'
    )
  );

-- Merchants can manage own locations
CREATE POLICY "Merchants can manage own locations"
  ON merchant_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- Merchant catalog items policies
-- ============================================================================

-- Public can view active items from approved merchants
CREATE POLICY "Public can view active catalog items"
  ON merchant_catalog_items FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND status = 'approved'
    )
  );

-- Merchants can view all own items
CREATE POLICY "Merchants can view own catalog items"
  ON merchant_catalog_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Merchants can manage own catalog
CREATE POLICY "Merchants can manage own catalog"
  ON merchant_catalog_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- Merchant loadouts policies
-- ============================================================================

-- Public can view published loadouts
CREATE POLICY "Public can view published loadouts"
  ON merchant_loadouts FOR SELECT
  USING (status = 'published');

-- Merchants can view all own loadouts
CREATE POLICY "Merchants can view own loadouts"
  ON merchant_loadouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Merchants can manage own loadouts
CREATE POLICY "Merchants can manage own loadouts"
  ON merchant_loadouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Admins can view pending loadouts for review
CREATE POLICY "Admins can manage all loadouts"
  ON merchant_loadouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Merchant loadout items policies
-- ============================================================================

-- Public can view items in published loadouts
CREATE POLICY "Public can view published loadout items"
  ON merchant_loadout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_loadouts
      WHERE id = loadout_id AND status = 'published'
    )
  );

-- Merchants can view own loadout items
CREATE POLICY "Merchants can view own loadout items"
  ON merchant_loadout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_loadouts ml
      JOIN merchants m ON ml.merchant_id = m.id
      WHERE ml.id = loadout_id AND m.user_id = auth.uid()
    )
  );

-- Merchants can manage own loadout items
CREATE POLICY "Merchants can manage own loadout items"
  ON merchant_loadout_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchant_loadouts ml
      JOIN merchants m ON ml.merchant_id = m.id
      WHERE ml.id = loadout_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchant_loadouts ml
      JOIN merchants m ON ml.merchant_id = m.id
      WHERE ml.id = loadout_id AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Loadout availability policies
-- ============================================================================

-- Public can view availability for published loadouts
CREATE POLICY "Public can view published loadout availability"
  ON loadout_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchant_loadouts
      WHERE id = loadout_id AND status = 'published'
    )
  );

-- Merchants can manage own loadout availability
CREATE POLICY "Merchants can manage own loadout availability"
  ON loadout_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchant_loadouts ml
      JOIN merchants m ON ml.merchant_id = m.id
      WHERE ml.id = loadout_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchant_loadouts ml
      JOIN merchants m ON ml.merchant_id = m.id
      WHERE ml.id = loadout_id AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Merchant offers policies
-- ============================================================================

-- Users can view offers sent to them
CREATE POLICY "Users can view own offers"
  ON merchant_offers FOR SELECT
  USING (user_id = auth.uid());

-- Users can update offer status (accept/decline)
CREATE POLICY "Users can respond to offers"
  ON merchant_offers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Merchants can view offers they sent
CREATE POLICY "Merchants can view sent offers"
  ON merchant_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Merchants can create offers
CREATE POLICY "Merchants can create offers"
  ON merchant_offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid() AND status = 'approved'
    )
  );

-- ============================================================================
-- User location shares policies
-- ============================================================================

-- Users can manage own location shares
CREATE POLICY "Users can manage own location shares"
  ON user_location_shares FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Merchants can view location shares (anonymized via RPC)
CREATE POLICY "Merchants can view location shares for insights"
  ON user_location_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- Conversions policies
-- ============================================================================

-- Users can view own conversions
CREATE POLICY "Users can view own conversions"
  ON conversions FOR SELECT
  USING (user_id = auth.uid());

-- Merchants can view conversions for their offers
CREATE POLICY "Merchants can view own conversions"
  ON conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Merchants can log conversions
CREATE POLICY "Merchants can log conversions"
  ON conversions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Admins can manage all conversions
CREATE POLICY "Admins can manage all conversions"
  ON conversions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Merchant transactions policies
-- ============================================================================

-- Merchants can view own transactions
CREATE POLICY "Merchants can view own transactions"
  ON merchant_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = merchant_id AND user_id = auth.uid()
    )
  );

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions"
  ON merchant_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Merchant blocks policies
-- ============================================================================

-- Users can manage own blocks
CREATE POLICY "Users can manage own merchant blocks"
  ON merchant_blocks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- COMPLETE
-- ============================================================================
