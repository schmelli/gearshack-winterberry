-- Migration: Create Marketplace Listings View
-- Feature: 056-community-hub-enhancements
-- Purpose: Virtual entity combining gear items with seller profile data for marketplace

-- =============================================================================
-- View: v_marketplace_listings
-- =============================================================================

CREATE OR REPLACE VIEW v_marketplace_listings AS
SELECT
  gi.id,
  gi.name,
  gi.brand,
  gi.primary_image_url,
  gi.condition,
  gi.price_paid,
  gi.currency,
  gi.is_for_sale,
  gi.can_be_traded,
  gi.can_be_borrowed,
  gi.created_at AS listed_at,
  gi.user_id AS seller_id,
  p.display_name AS seller_name,
  p.avatar_url AS seller_avatar
FROM gear_items gi
JOIN profiles p ON gi.user_id = p.id
WHERE
  (gi.is_for_sale = true OR gi.can_be_traded = true OR gi.can_be_borrowed = true)
  AND gi.status = 'own';

-- Add documentation
COMMENT ON VIEW v_marketplace_listings IS
  'Read-only view combining gear items available for sale/trade/borrow with seller profile data. Only includes owned items marked for sale, trade, or borrow.';

-- =============================================================================
-- RLS for view access
-- =============================================================================

-- Grant select access to authenticated users
GRANT SELECT ON v_marketplace_listings TO authenticated;
