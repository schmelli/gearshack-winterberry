# Data Model: Merchant Integration

**Feature**: 053-merchant-integration
**Date**: 2025-12-29

## Entity Relationship Overview

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   profiles  │────<│      merchants       │────<│ merchant_locations  │
│  (existing) │  1:1│  (verified business) │  1:N│   (store addresses) │
└─────────────┘     └──────────────────────┘     └─────────────────────┘
                              │
                              │ 1:N
                              ▼
                    ┌──────────────────────┐
                    │ merchant_catalog_items│
                    │    (product inventory)│
                    └──────────────────────┘
                              │
                              │ N:M (via loadout_items)
                              ▼
                    ┌──────────────────────┐     ┌─────────────────────┐
                    │  merchant_loadouts   │────<│ loadout_availability│
                    │  (curated packages)  │  1:N│ (store stock status)│
                    └──────────────────────┘     └─────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────┐     ┌──────────────────────┐
│ gear_items  │<───>│   merchant_offers    │
│  (wishlist) │  N:M│ (personalized deals) │
└─────────────┘     └──────────────────────┘
                              │
                              │ 1:1
                              ▼
                    ┌──────────────────────┐     ┌─────────────────────┐
                    │    conversions       │────>│merchant_transactions│
                    │  (purchase records)  │  N:1│   (billing records) │
                    └──────────────────────┘     └─────────────────────┘

┌─────────────────────┐
│ user_location_shares│  (per-merchant location consent)
└─────────────────────┘

┌─────────────────────┐
│  merchant_blocks    │  (user blocks merchant offers)
└─────────────────────┘
```

---

## Entities

### merchants

Verified business accounts with portal access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique merchant identifier |
| user_id | UUID | FK → profiles.id, UNIQUE, NOT NULL | Associated user account |
| business_name | TEXT | NOT NULL | Display name for business |
| business_type | TEXT | CHECK IN ('local', 'chain', 'online') | Merchant category |
| status | TEXT | CHECK IN ('pending', 'approved', 'suspended', 'rejected'), DEFAULT 'pending' | Account status |
| verified_at | TIMESTAMPTZ | NULLABLE | When admin approved |
| verified_by | UUID | FK → profiles.id, NULLABLE | Admin who approved |
| contact_email | TEXT | NOT NULL | Business contact email |
| contact_phone | TEXT | NULLABLE | Business phone |
| website | TEXT | NULLABLE | Business website URL |
| logo_url | TEXT | NULLABLE | Cloudinary URL for logo |
| description | TEXT | NULLABLE | Business description |
| tax_id | TEXT | NULLABLE | VAT/tax identification |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last modification |

**Indexes**:
- `idx_merchants_user_id` on `user_id`
- `idx_merchants_status` on `status`

**RLS Policies**:
- Public: Can view approved merchants
- Merchant: Can view/update own record
- Admin: Full access

---

### merchant_locations

Physical store locations for merchants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique location identifier |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Parent merchant |
| name | TEXT | NOT NULL | Location name (e.g., "Berlin Steglitz") |
| address_line1 | TEXT | NOT NULL | Street address |
| address_line2 | TEXT | NULLABLE | Additional address |
| city | TEXT | NOT NULL | City name |
| postal_code | TEXT | NOT NULL | Postal/ZIP code |
| country | TEXT | NOT NULL, DEFAULT 'DE' | ISO country code |
| location | GEOGRAPHY(Point, 4326) | NOT NULL | PostGIS point for proximity |
| phone | TEXT | NULLABLE | Location-specific phone |
| hours | JSONB | NULLABLE | Operating hours |
| is_primary | BOOLEAN | DEFAULT false | Primary location flag |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |

**Indexes**:
- `idx_merchant_locations_merchant` on `merchant_id`
- `idx_merchant_locations_geo` USING GIST on `location`

---

### merchant_catalog_items

Products in merchant's inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique item identifier |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Owning merchant |
| sku | TEXT | NOT NULL | Merchant's SKU |
| name | TEXT | NOT NULL | Product name |
| brand | TEXT | NULLABLE | Brand name |
| description | TEXT | NULLABLE | Product description |
| price | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Current price (EUR) |
| weight_grams | INTEGER | NULLABLE | Weight in grams |
| category_id | UUID | FK → categories.id, NULLABLE | Product category |
| image_url | TEXT | NULLABLE | Cloudinary image URL |
| external_url | TEXT | NULLABLE | Link to product page |
| is_active | BOOLEAN | DEFAULT true | Available for loadouts |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last modification |

**Indexes**:
- `idx_catalog_merchant` on `merchant_id`
- `idx_catalog_merchant_sku` UNIQUE on `(merchant_id, sku)`
- `idx_catalog_category` on `category_id`

**Constraints**:
- UNIQUE `(merchant_id, sku)` - SKU unique per merchant

---

### merchant_loadouts

Curated gear packages created by merchants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique loadout identifier |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Owning merchant |
| name | TEXT | NOT NULL | Loadout name |
| slug | TEXT | NOT NULL | URL-friendly slug |
| description | TEXT | NULLABLE | Loadout description |
| trip_type | TEXT | NULLABLE | Trip category |
| season | TEXT[] | NULLABLE | Applicable seasons |
| status | TEXT | CHECK IN ('draft', 'pending_review', 'published', 'archived'), DEFAULT 'draft' | Lifecycle state |
| discount_percent | DECIMAL(5,2) | CHECK >= 0 AND <= 100, DEFAULT 0 | Bundle discount |
| is_featured | BOOLEAN | DEFAULT false | Premium placement |
| featured_until | TIMESTAMPTZ | NULLABLE | Featured expiration |
| hero_image_url | TEXT | NULLABLE | Cover image URL |
| view_count | INTEGER | DEFAULT 0 | Total views |
| wishlist_add_count | INTEGER | DEFAULT 0 | Times added to wishlists |
| published_at | TIMESTAMPTZ | NULLABLE | First publish date |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last modification |

**Indexes**:
- `idx_loadouts_merchant` on `merchant_id`
- `idx_loadouts_status` on `status`
- `idx_loadouts_slug` UNIQUE on `slug`
- `idx_loadouts_featured` on `is_featured, featured_until` WHERE `status = 'published'`

**State Transitions**:
- draft → pending_review (merchant submits)
- pending_review → published (admin approves)
- pending_review → draft (admin requests changes)
- published → archived (merchant unpublishes)
- archived → draft (merchant wants to re-edit)

---

### merchant_loadout_items

Items within a merchant loadout.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique record identifier |
| loadout_id | UUID | FK → merchant_loadouts.id, NOT NULL | Parent loadout |
| catalog_item_id | UUID | FK → merchant_catalog_items.id, NOT NULL | Product reference |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | Item quantity |
| expert_note | TEXT | NULLABLE | Merchant's recommendation note |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |

**Indexes**:
- `idx_loadout_items_loadout` on `loadout_id`
- `idx_loadout_items_catalog` on `catalog_item_id`

**Constraints**:
- UNIQUE `(loadout_id, catalog_item_id)` - Item appears once per loadout

---

### loadout_availability

Store availability for loadouts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique record identifier |
| loadout_id | UUID | FK → merchant_loadouts.id, NOT NULL | Parent loadout |
| location_id | UUID | FK → merchant_locations.id, NOT NULL | Store location |
| is_in_stock | BOOLEAN | DEFAULT true | Full loadout available |
| stock_note | TEXT | NULLABLE | Availability notes |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last stock update |

**Indexes**:
- `idx_availability_loadout` on `loadout_id`

**Constraints**:
- UNIQUE `(loadout_id, location_id)`

---

### merchant_offers

Personalized discount offers sent to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique offer identifier |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Sending merchant |
| user_id | UUID | FK → profiles.id, NOT NULL | Recipient user |
| catalog_item_id | UUID | FK → merchant_catalog_items.id, NOT NULL | Offered product |
| wishlist_item_id | UUID | FK → gear_items.id, NULLABLE | Related wishlist item |
| regular_price | DECIMAL(10,2) | NOT NULL | Original price |
| offer_price | DECIMAL(10,2) | NOT NULL | Discounted price |
| message | TEXT | NULLABLE | Personalized message |
| status | TEXT | CHECK IN ('pending', 'viewed', 'accepted', 'declined', 'expired', 'converted'), DEFAULT 'pending' | Offer state |
| expires_at | TIMESTAMPTZ | NOT NULL | Offer expiration |
| viewed_at | TIMESTAMPTZ | NULLABLE | When user first viewed |
| responded_at | TIMESTAMPTZ | NULLABLE | When user accepted/declined |
| offer_fee_charged | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Fee charged to merchant |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |

**Indexes**:
- `idx_offers_merchant` on `merchant_id`
- `idx_offers_user` on `user_id`
- `idx_offers_status` on `status`
- `idx_offers_expires` on `expires_at` WHERE `status IN ('pending', 'viewed', 'accepted')`

**RLS Policies**:
- User: Can view own offers, update status (accept/decline)
- Merchant: Can view offers they sent, cannot modify after sent

---

### user_location_shares

Per-merchant location sharing consent.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique record identifier |
| user_id | UUID | FK → profiles.id, NOT NULL | User granting permission |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Merchant receiving access |
| granularity | TEXT | CHECK IN ('city', 'neighborhood', 'none'), DEFAULT 'none' | Sharing level |
| location | GEOGRAPHY(Point, 4326) | NULLABLE | User's location (if shared) |
| city | TEXT | NULLABLE | City name (if city+ sharing) |
| neighborhood | TEXT | NULLABLE | Neighborhood (if neighborhood sharing) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last modification |

**Indexes**:
- `idx_location_shares_user` on `user_id`
- `idx_location_shares_merchant` on `merchant_id`
- `idx_location_shares_geo` USING GIST on `location` WHERE `granularity != 'none'`

**Constraints**:
- UNIQUE `(user_id, merchant_id)` - One setting per user-merchant pair

---

### conversions

Records of wishlist items purchased via merchant offers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique conversion identifier |
| offer_id | UUID | FK → merchant_offers.id, NOT NULL | Related offer |
| user_id | UUID | FK → profiles.id, NOT NULL | Purchasing user |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Selling merchant |
| catalog_item_id | UUID | FK → merchant_catalog_items.id, NOT NULL | Purchased product |
| gear_item_id | UUID | FK → gear_items.id, NULLABLE | Created inventory item |
| sale_price | DECIMAL(10,2) | NOT NULL | Final sale price |
| commission_percent | DECIMAL(5,2) | NOT NULL, DEFAULT 5.00 | Commission rate |
| commission_amount | DECIMAL(10,2) | NOT NULL | Calculated commission |
| is_local_pickup | BOOLEAN | DEFAULT false | Picked up vs shipped |
| pickup_location_id | UUID | FK → merchant_locations.id, NULLABLE | Pickup store |
| requires_review | BOOLEAN | DEFAULT false | Flagged for fraud review |
| review_reason | TEXT | NULLABLE | Why flagged |
| reviewed_by | UUID | FK → profiles.id, NULLABLE | Admin who reviewed |
| reviewed_at | TIMESTAMPTZ | NULLABLE | Review timestamp |
| conversion_date | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When marked purchased |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |

**Indexes**:
- `idx_conversions_offer` on `offer_id`
- `idx_conversions_merchant` on `merchant_id`
- `idx_conversions_user` on `user_id`
- `idx_conversions_date` on `conversion_date`
- `idx_conversions_review` on `requires_review` WHERE `requires_review = true`

---

### merchant_transactions

Billing records for merchant fees and commissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique transaction identifier |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Billed merchant |
| type | TEXT | CHECK IN ('listing_fee', 'offer_fee', 'commission', 'adjustment') | Transaction type |
| amount | DECIMAL(10,2) | NOT NULL | Transaction amount (EUR) |
| description | TEXT | NULLABLE | Transaction description |
| reference_id | UUID | NULLABLE | Related entity (loadout, offer, conversion) |
| reference_type | TEXT | NULLABLE | Entity type for reference |
| billing_cycle_start | DATE | NOT NULL | Billing period start |
| billing_cycle_end | DATE | NOT NULL | Billing period end |
| status | TEXT | CHECK IN ('pending', 'invoiced', 'paid', 'disputed'), DEFAULT 'pending' | Payment status |
| invoice_number | TEXT | NULLABLE | Invoice reference |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |

**Indexes**:
- `idx_transactions_merchant` on `merchant_id`
- `idx_transactions_cycle` on `billing_cycle_start, billing_cycle_end`
- `idx_transactions_status` on `status`

---

### merchant_blocks

User blocks for merchant offers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique record identifier |
| user_id | UUID | FK → profiles.id, NOT NULL | Blocking user |
| merchant_id | UUID | FK → merchants.id, NOT NULL | Blocked merchant |
| reason | TEXT | NULLABLE | User's reason |
| created_at | TIMESTAMPTZ | DEFAULT now() | When blocked |

**Indexes**:
- `idx_blocks_user` on `user_id`
- `idx_blocks_merchant` on `merchant_id`

**Constraints**:
- UNIQUE `(user_id, merchant_id)`

---

## Existing Table Extensions

### gear_items (existing)

Add columns for merchant attribution:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| source_merchant_id | UUID | FK → merchants.id, NULLABLE | Merchant if purchased via offer |
| source_offer_id | UUID | FK → merchant_offers.id, NULLABLE | Originating offer |
| source_loadout_id | UUID | FK → merchant_loadouts.id, NULLABLE | Originating loadout |

### profiles (existing)

Add merchant role:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role | TEXT | CHECK IN ('user', 'merchant', 'admin'), DEFAULT 'user' | User role |

### notifications (existing)

Add merchant notification types - no schema change needed, just new `type` values.

---

## Validation Rules

### Merchant Loadouts
- `discount_percent` must be 0-100
- `status` transitions must follow state machine
- At least one `merchant_loadout_item` required for publishing
- At least one `loadout_availability` required for publishing

### Merchant Offers
- `offer_price` must be less than `regular_price`
- `expires_at` must be in the future when created
- Cannot send offer if user has blocked merchant
- Cannot send duplicate offer for same item within 30 days

### Conversions
- `sale_price` should match or be less than `offer_price`
- `conversion_date` must be after `offer.responded_at`
- Flag if `conversion_date` is > 30 days after offer acceptance

---

## Calculated Fields (Views/Functions)

### merchant_loadout_pricing (view)
```sql
CREATE VIEW merchant_loadout_pricing AS
SELECT
  ml.id AS loadout_id,
  SUM(mci.price * mli.quantity) AS individual_total,
  ml.discount_percent,
  SUM(mci.price * mli.quantity) * (ml.discount_percent / 100) AS discount_amount,
  SUM(mci.price * mli.quantity) * (1 - ml.discount_percent / 100) AS bundle_price,
  SUM(mci.weight_grams * mli.quantity) AS total_weight_grams
FROM merchant_loadouts ml
JOIN merchant_loadout_items mli ON ml.id = mli.loadout_id
JOIN merchant_catalog_items mci ON mli.catalog_item_id = mci.id
GROUP BY ml.id;
```

### merchant_analytics (function)
```sql
CREATE FUNCTION get_merchant_analytics(p_merchant_id UUID, p_period_days INT DEFAULT 30)
RETURNS TABLE (
  loadout_views BIGINT,
  wishlist_adds BIGINT,
  offers_sent BIGINT,
  offers_accepted BIGINT,
  conversions BIGINT,
  revenue DECIMAL,
  conversion_rate DECIMAL
);
```

### proximity_bucket (function)
```sql
CREATE FUNCTION get_proximity_bucket(distance_meters FLOAT)
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
$$ LANGUAGE plpgsql;
```
