# Data Model: Price Discovery & Monitoring

**Feature**: Price Discovery & Monitoring for Wishlist Items
**Date**: 2025-12-17
**Database**: Supabase (PostgreSQL)

## Overview

This document defines the complete data model for price tracking functionality. All tables follow Supabase naming conventions (snake_case) and include Row-Level Security (RLS) policies.

---

## Entity Relationship Diagram

```
users (Supabase Auth)
  ↓
  ├─── gear_items (existing) ──→ price_tracking
  │                                 ↓
  │                                 ├─── price_results
  │                                 ├─── price_history
  │                                 └─── price_alerts
  │
  ├─── alert_preferences
  │
  └─── community_inventory (existing) ──→ community_availability (view)

partner_retailers ──→ personal_offers ──→ price_alerts
```

---

## Table Schemas

### 1. price_tracking

**Purpose**: Tracks which wishlist items have price tracking enabled

```sql
CREATE TABLE price_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Tracking status
  enabled BOOLEAN NOT NULL DEFAULT true,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Product matching
  confirmed_product_id TEXT, -- External product ID after fuzzy match confirmation
  match_confidence DECIMAL(3,2), -- 0.00-1.00 from fuzzy matching
  manual_product_url TEXT, -- User-provided product URL if fuzzy match failed

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(user_id, gear_item_id)
);

CREATE INDEX idx_price_tracking_user ON price_tracking(user_id);
CREATE INDEX idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX idx_price_tracking_last_checked ON price_tracking(last_checked_at);

-- RLS Policies
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_tracking_select ON price_tracking
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY price_tracking_insert ON price_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT COUNT(*) FROM price_tracking WHERE user_id = auth.uid() AND enabled = true) < 50
  );

CREATE POLICY price_tracking_update ON price_tracking
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY price_tracking_delete ON price_tracking
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 2. price_results

**Purpose**: Current price data from external sources

```sql
CREATE TABLE price_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('google_shopping', 'ebay', 'retailer', 'local_shop')),
  source_name TEXT NOT NULL, -- e.g., 'Bergfreunde.de', 'eBay Germany', 'Grüne Wiese Berlin'
  source_url TEXT NOT NULL, -- Direct link to product page

  -- Pricing
  price_amount DECIMAL(10,2) NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  shipping_cost DECIMAL(10,2),
  shipping_currency TEXT DEFAULT 'EUR',
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (price_amount + COALESCE(shipping_cost, 0)) STORED,

  -- Product details
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  product_condition TEXT, -- 'new', 'used', 'refurbished'

  -- Local shop specific
  is_local BOOLEAN NOT NULL DEFAULT false,
  shop_latitude DECIMAL(9,6),
  shop_longitude DECIMAL(9,6),
  distance_km DECIMAL(6,2), -- Calculated at query time, stored for sorting

  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'), -- Cache TTL

  -- Constraints
  CHECK (
    (is_local = false) OR
    (is_local = true AND shop_latitude IS NOT NULL AND shop_longitude IS NOT NULL)
  )
);

CREATE INDEX idx_price_results_tracking ON price_results(tracking_id);
CREATE INDEX idx_price_results_expires ON price_results(expires_at);
CREATE INDEX idx_price_results_source_type ON price_results(source_type);

-- RLS Policies
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_results_select ON price_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_results.tracking_id
      AND pt.user_id = auth.uid()
    )
  );

-- Only service role can insert/update/delete price results (from background jobs)
CREATE POLICY price_results_service_only ON price_results
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

###  3. price_history

**Purpose**: Historical price data for trend analysis (90-day retention)

```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Historical data point
  lowest_price DECIMAL(10,2) NOT NULL,
  highest_price DECIMAL(10,2) NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  num_sources INTEGER NOT NULL, -- How many sources returned data

  -- Snapshot metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (lowest_price <= highest_price)
);

CREATE INDEX idx_price_history_tracking ON price_history(tracking_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- Automatically purge history older than 90 days
CREATE OR REPLACE FUNCTION purge_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM price_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_history_select ON price_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_history.tracking_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY price_history_service_only ON price_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### 4. partner_retailers

**Purpose**: Verified retailers authorized to send personal price offers

```sql
CREATE TABLE partner_retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner information
  name TEXT NOT NULL UNIQUE, -- e.g., 'Bergzeit.de'
  website_url TEXT NOT NULL,
  logo_url TEXT,

  -- API credentials
  api_key TEXT NOT NULL UNIQUE,
  api_secret_hash TEXT NOT NULL, -- Hashed for security

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),

  -- Rate limiting
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_retailers_api_key ON partner_retailers(api_key);
CREATE INDEX idx_partner_retailers_status ON partner_retailers(status) WHERE status = 'active';

-- No RLS - managed by service role only
```

---

### 5. personal_offers

**Purpose**: Exclusive price offers from partner retailers

```sql
CREATE TABLE personal_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_retailer_id UUID NOT NULL REFERENCES partner_retailers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Offer details
  original_price DECIMAL(10,2) NOT NULL,
  offer_price DECIMAL(10,2) NOT NULL,
  offer_currency TEXT NOT NULL DEFAULT 'EUR',
  savings_amount DECIMAL(10,2) GENERATED ALWAYS AS (original_price - offer_price) STORED,
  savings_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    ROUND(((original_price - offer_price) / original_price * 100), 2)
  ) STORED,

  -- Product details
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image_url TEXT,

  -- Offer validity
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN GENERATED ALWAYS AS (expires_at > NOW()) STORED,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- When user marks item as purchased

  -- Constraints
  CHECK (offer_price < original_price),
  CHECK (expires_at > created_at),
  UNIQUE(partner_retailer_id, user_id, gear_item_id, created_at) -- Prevent duplicate offers
);

CREATE INDEX idx_personal_offers_user ON personal_offers(user_id);
CREATE INDEX idx_personal_offers_active ON personal_offers(is_active) WHERE is_active = true;
CREATE INDEX idx_personal_offers_expires ON personal_offers(expires_at);

-- RLS Policies
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_offers_select ON personal_offers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert (from partner API endpoint)
CREATE POLICY personal_offers_service_only ON personal_offers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### 6. price_alerts

**Purpose**: Alert history and delivery tracking

```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_id UUID REFERENCES price_tracking(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES personal_offers(id) ON DELETE SET NULL,

  -- Alert type
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_drop',
    'local_shop_available',
    'community_member_available',
    'personal_offer'
  )),

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- Deep link to relevant page

  -- Delivery status
  sent_via_push BOOLEAN NOT NULL DEFAULT false,
  sent_via_email BOOLEAN NOT NULL DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,

  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_created ON price_alerts(created_at DESC);
CREATE INDEX idx_price_alerts_tracking ON price_alerts(tracking_id);

-- RLS Policies
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_alerts_select ON price_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY price_alerts_service_only ON price_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### 7. alert_preferences

**Purpose**: User notification channel preferences

```sql
CREATE TABLE alert_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel preferences
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Alert type preferences (granular control)
  price_drop_enabled BOOLEAN NOT NULL DEFAULT true,
  local_shop_enabled BOOLEAN NOT NULL DEFAULT true,
  community_enabled BOOLEAN NOT NULL DEFAULT true,
  personal_offer_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Quiet hours (optional)
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_preferences_select ON alert_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY alert_preferences_insert ON alert_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY alert_preferences_update ON alert_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Views

### community_availability

**Purpose**: Aggregate count of users with same item in inventory

```sql
CREATE OR REPLACE VIEW community_availability AS
SELECT
  gi.id AS gear_item_id,
  gi.name AS item_name,
  COUNT(DISTINCT gi2.user_id) AS user_count,
  MIN(gi2.purchase_price) AS min_price,
  MAX(gi2.purchase_price) AS max_price,
  AVG(gi2.purchase_price) AS avg_price
FROM gear_items gi
LEFT JOIN gear_items gi2 ON
  gi2.name = gi.name AND
  gi2.status = 'inventory' AND
  gi2.user_id != gi.user_id
WHERE gi.status = 'wishlist'
GROUP BY gi.id, gi.name;

-- RLS: Inherits from gear_items table
```

---

## Database Functions

### fuzzy_search_products

**Purpose**: Fuzzy match wishlist item names to price result product names

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION fuzzy_search_products(
  search_term TEXT,
  threshold DECIMAL DEFAULT 0.3
)
RETURNS TABLE (
  product_name TEXT,
  similarity DECIMAL,
  source_name TEXT,
  source_url TEXT,
  price_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.product_name,
    SIMILARITY(pr.product_name, search_term) AS similarity,
    pr.source_name,
    pr.source_url,
    pr.price_amount
  FROM price_results pr
  WHERE SIMILARITY(pr.product_name, search_term) > threshold
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Migrations

### Migration Order

1. **20251217000001_enable_extensions.sql**
   - Enable pg_trgm extension

2. **20251217000002_price_tracking_tables.sql**
   - Create price_tracking, price_results, price_history tables

3. **20251217000003_partner_retailers.sql**
   - Create partner_retailers, personal_offers tables

4. **20251217000004_alerts.sql**
   - Create price_alerts, alert_preferences tables

5. **20251217000005_views_functions.sql**
   - Create community_availability view
   - Create fuzzy_search_products function

6. **20251217000006_rls_policies.sql**
   - Enable RLS and create policies for all tables

---

## Data Retention Policy

### Automatic Cleanup

```sql
-- Schedule daily cleanup (Vercel Cron or pg_cron)
-- Run: DELETE FROM price_history WHERE recorded_at < NOW() - INTERVAL '90 days'
-- Run: DELETE FROM price_results WHERE expires_at < NOW()
-- Run: DELETE FROM personal_offers WHERE expires_at < NOW() - INTERVAL '30 days'
-- Run: DELETE FROM price_alerts WHERE created_at < NOW() - INTERVAL '180 days'
```

---

## Performance Considerations

### Indexes

All critical query paths have indexes:
- User lookups: `user_id` indexes on all user-scoped tables
- Time-based queries: `created_at`, `expires_at`, `last_checked_at`
- Lookups: `tracking_id`, `source_type`, `api_key`

### Partitioning (Future Optimization)

If price_history grows beyond 10M rows, consider partitioning by `recorded_at`:
```sql
-- Partition by month
ALTER TABLE price_history PARTITION BY RANGE (recorded_at);
```

### Estimated Storage

- price_tracking: ~500 bytes/row × 500k items = ~250MB
- price_results: ~1KB/row × 2.5M results (5 sources × 500k items) = ~2.5GB
- price_history: ~200 bytes/row × 45M records (90 days × 500k items) = ~9GB
- **Total**: ~12GB for 500k tracked items

---

## Next Steps

1. ✅ Data model documented
2. → Create migration SQL files in `supabase/migrations/`
3. → Phase 1: Generate API contracts (OpenAPI spec)
4. → Phase 1: Generate quickstart.md
