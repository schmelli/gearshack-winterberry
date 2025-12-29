# Quickstart: Merchant Integration (Feature 053)

This guide helps you get up and running with the Merchant Integration feature development.

## Prerequisites

- Node.js 20+ and npm
- Supabase CLI installed (`npm install -g supabase`)
- Access to GearShack Supabase project
- PostGIS extension enabled (included in Supabase by default)

## Database Setup

### 1. Enable PostGIS Extension

PostGIS is pre-installed in Supabase but may need activation:

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Apply Migrations

The feature requires new tables and extensions to existing tables. Run migrations in order:

```bash
# From project root
supabase db push
```

Key tables created:
- `merchants` - Merchant accounts and profiles
- `merchant_locations` - Physical store locations with PostGIS geography
- `merchant_catalog_items` - Products available from merchants
- `merchant_loadouts` - Curated gear bundles
- `merchant_offers` - Personalized offers to users
- `conversions` - Purchase tracking
- `user_location_shares` - User opt-in location sharing

### 3. Seed Test Data (Development)

```bash
# Seed sample merchants and products
npm run seed:merchants
```

## Environment Variables

Add to `.env.local`:

```bash
# PostGIS is available via Supabase - no additional config needed

# Feature flags
NEXT_PUBLIC_MERCHANT_PORTAL_ENABLED=true
NEXT_PUBLIC_OFFER_SYSTEM_ENABLED=true

# Billing (external for MVP)
BILLING_INVOICE_EMAIL=billing@gearshack.app
```

## Project Structure

```
app/
├── [locale]/
│   ├── merchant/                 # Merchant Portal (authenticated)
│   │   ├── page.tsx             # Dashboard
│   │   ├── loadouts/            # Loadout management
│   │   ├── offers/              # Offer management
│   │   ├── insights/            # Wishlist insights
│   │   ├── billing/             # Billing & transactions
│   │   ├── analytics/           # Conversion analytics
│   │   └── settings/            # Profile & locations
│   ├── community/
│   │   └── merchant-loadouts/   # Public loadout discovery
│   └── offers/                  # User's received offers
├── api/
│   └── cron/
│       └── expire-offers/       # Cron job for offer expiration

components/
├── merchant/                    # Merchant portal components (flat structure)
│   ├── MerchantDashboard.tsx
│   ├── LoadoutCreationWizard.tsx
│   ├── MerchantLoadoutCard.tsx
│   ├── MerchantLoadoutDetail.tsx
│   ├── WishlistInsightsPanel.tsx
│   ├── OfferCreationForm.tsx
│   ├── BillingOverview.tsx
│   ├── ConversionDashboard.tsx
│   └── wizard/                  # Loadout wizard steps
├── offers/                      # User offer components
│   ├── OfferCard.tsx
│   ├── OfferDetailSheet.tsx
│   └── OfferResponseActions.tsx
└── admin/                       # Admin components
    ├── AdminMerchantList.tsx
    └── AdminMerchantDetail.tsx

hooks/
├── merchant/                    # Merchant portal hooks
│   ├── useMerchantAuth.ts       # Merchant role verification
│   ├── useMerchantProfile.ts    # Profile CRUD
│   ├── useMerchantLoadouts.ts   # Loadout CRUD for merchants
│   ├── useMerchantLoadoutsPublic.ts # Public loadout browsing
│   ├── useMerchantCatalog.ts    # Catalog item management
│   ├── useMerchantLocations.ts  # Location management
│   ├── useWishlistInsights.ts   # Wishlist demand analytics
│   ├── useMerchantOffers.ts     # Offer management
│   ├── useMerchantBilling.ts    # Billing & invoices
│   ├── useConversionTracking.ts # Conversion analytics
│   └── useLoadoutComparison.ts  # Loadout comparison
└── user/
    ├── useUserOffers.ts         # User's received offers
    └── useLocationSharing.ts    # Location consent management

types/
├── merchant.ts                  # Merchant accounts and locations
├── merchant-loadout.ts          # Loadouts, items, pricing
├── merchant-offer.ts            # Offers and state machine
└── conversion.ts                # Conversion tracking
```

## Key Implementation Patterns

### 1. Proximity Queries with PostGIS

```typescript
// hooks/merchant/useWishlistInsights.ts
const fetchNearbyWishlistUsers = async (
  merchantLocation: { lat: number; lng: number },
  radiusKm: number
) => {
  const { data } = await supabase.rpc('get_wishlist_users_nearby', {
    merchant_lat: merchantLocation.lat,
    merchant_lng: merchantLocation.lng,
    radius_meters: radiusKm * 1000
  });
  return data;
};
```

```sql
-- Supabase function
CREATE OR REPLACE FUNCTION get_wishlist_users_nearby(
  merchant_lat DOUBLE PRECISION,
  merchant_lng DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  user_id UUID,
  proximity_bucket TEXT,
  wishlist_item_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uls.user_id,
    CASE
      WHEN ST_DWithin(uls.location, ST_Point(merchant_lng, merchant_lat)::geography, 5000) THEN '5km'
      WHEN ST_DWithin(uls.location, ST_Point(merchant_lng, merchant_lat)::geography, 10000) THEN '10km'
      WHEN ST_DWithin(uls.location, ST_Point(merchant_lng, merchant_lat)::geography, 25000) THEN '25km'
      WHEN ST_DWithin(uls.location, ST_Point(merchant_lng, merchant_lat)::geography, 50000) THEN '50km'
      ELSE '100km+'
    END as proximity_bucket,
    COUNT(gi.id)::INTEGER as wishlist_item_count
  FROM user_location_shares uls
  JOIN gear_items gi ON gi.user_id = uls.user_id AND gi.status = 'wishlist'
  WHERE ST_DWithin(uls.location, ST_Point(merchant_lng, merchant_lat)::geography, radius_meters)
    AND uls.granularity != 'none'
  GROUP BY uls.user_id, uls.location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Offer State Machine

```typescript
// types/merchant.ts
export type OfferStatus =
  | 'pending'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted';

export const VALID_OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  pending: ['viewed', 'expired'],
  viewed: ['accepted', 'declined', 'expired'],
  accepted: ['converted', 'expired'],
  declined: [],
  expired: [],
  converted: [],
};

// hooks/user/useUserOffers.ts
const transitionOffer = async (
  offerId: string,
  newStatus: OfferStatus
) => {
  const { data: offer } = await supabase
    .from('merchant_offers')
    .select('status')
    .eq('id', offerId)
    .single();

  if (!VALID_OFFER_TRANSITIONS[offer.status].includes(newStatus)) {
    throw new Error(`Invalid transition: ${offer.status} → ${newStatus}`);
  }

  return supabase
    .from('merchant_offers')
    .update({ status: newStatus, responded_at: new Date() })
    .eq('id', offerId);
};
```

### 3. Bundle Pricing Calculation

```typescript
// hooks/merchant/useMerchantLoadouts.ts
export const calculateBundlePrice = (
  items: LoadoutItem[],
  discountPercent: number
): LoadoutPricing => {
  const individualTotal = items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  const discountAmount = individualTotal * (discountPercent / 100);
  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.weightGrams * item.quantity),
    0
  );

  return {
    individualTotal,
    discountPercent,
    discountAmount,
    bundlePrice: individualTotal - discountAmount,
    totalWeightGrams,
  };
};
```

### 4. RLS Policies for Merchant Access

```sql
-- Merchants can only see their own data
CREATE POLICY "Merchants manage own loadouts"
ON merchant_loadouts FOR ALL
USING (merchant_id IN (
  SELECT id FROM merchants WHERE user_id = auth.uid()
));

-- Users can only see published loadouts
CREATE POLICY "Public view published loadouts"
ON merchant_loadouts FOR SELECT
USING (status = 'published');

-- Users can only see offers sent to them
CREATE POLICY "Users view own offers"
ON merchant_offers FOR SELECT
USING (user_id = auth.uid());
```

## Development Workflow

### 1. Start Local Development

```bash
npm run dev
```

### 2. Test Merchant Portal

Navigate to `/en/merchant` (requires merchant role):
- Dashboard with key metrics
- Loadout management (`/merchant/loadouts`)
- Wishlist insights (`/merchant/insights`)
- Offer creation/tracking (`/merchant/offers`)
- Billing & conversions (`/merchant/billing`)
- Settings & locations (`/merchant/settings`)

### 3. Test User Experience

Navigate to `/en/community/merchant-loadouts`:
- Browse merchant loadouts
- View loadout details
- Add items to wishlist (with location consent dialog)

Navigate to `/en/offers`:
- View received offers
- Accept/decline offers
- Track offer status

### 4. Test Admin Portal

Navigate to `/en/admin/merchants` (requires admin role):
- Review merchant applications
- Approve/reject merchants

## Architecture: Client-Side Hooks with Supabase

This feature uses **client-side hooks with direct Supabase queries** rather than custom API routes. This provides:
- Real-time subscriptions for instant updates
- Row-Level Security (RLS) for access control
- Simpler architecture with fewer moving parts

### Cron Jobs

| Route | Schedule | Description |
|-------|----------|-------------|
| `/api/cron/expire-offers` | Daily 3 AM UTC | Auto-expire offers past expiration date |

### Supabase RPC Functions

| Function | Description |
|----------|-------------|
| `get_wishlist_users_nearby` | Find users with wishlisted items near merchant location |
| `get_proximity_bucket` | Categorize distance into 5km/10km/25km/50km buckets |
| `get_merchant_analytics` | Aggregate merchant performance metrics |

## Testing

```bash
# Run merchant-specific tests
npm test -- --grep "merchant"

# Run integration tests
npm run test:integration -- --grep "053"
```

## Troubleshooting

### PostGIS Functions Not Found
Ensure PostGIS extension is enabled and functions are created via migrations.

### Merchant Role Access Denied
Check that user has `role: 'merchant'` in profiles table and is approved.

### Proximity Queries Slow
Ensure spatial index exists on `user_location_shares.location` column.

## Resources

- [Feature Spec](./spec.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/)
- [Research Notes](./research.md)
- [PostGIS Documentation](https://postgis.net/documentation/)
