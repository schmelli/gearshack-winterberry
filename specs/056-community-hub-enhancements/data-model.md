# Data Model: Community Hub Enhancements

**Feature**: 056-community-hub-enhancements
**Date**: 2026-01-04

## New Entities

### CommunityBanner

Promotional banner displayed in the community page carousel.

**Table**: `community_banners`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| hero_image_url | TEXT | NOT NULL | Cloudinary URL for hero image |
| cta_text | VARCHAR(200) | NOT NULL | Call-to-action headline text |
| button_text | VARCHAR(50) | NOT NULL | Button label text |
| target_url | TEXT | NOT NULL | Internal or external link URL |
| visibility_start | TIMESTAMPTZ | NOT NULL | When banner becomes visible |
| visibility_end | TIMESTAMPTZ | NOT NULL | When banner stops being visible |
| display_order | INTEGER | NOT NULL DEFAULT 0 | Manual sort order (lower = first) |
| is_active | BOOLEAN | NOT NULL DEFAULT true | Quick enable/disable toggle |
| created_by | UUID | FK profiles(id) | Admin who created the banner |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_community_banners_active` ON (visibility_start, visibility_end, is_active) WHERE is_active = true
- `idx_community_banners_order` ON (display_order, created_at)

**RLS Policies**:
- SELECT: All authenticated users (for display)
- INSERT/UPDATE/DELETE: Admin users only

**Validation Rules**:
- `visibility_end` must be after `visibility_start`
- `cta_text` length: 5-200 characters
- `button_text` length: 2-50 characters
- `target_url` must be valid URL format

### MarketplaceListing (View)

Virtual entity combining gear items with seller profile data.

**View**: `v_marketplace_listings`

```sql
CREATE VIEW v_marketplace_listings AS
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
  p.avatar_url AS seller_avatar,
  p.is_banned AS seller_is_banned
FROM gear_items gi
JOIN profiles p ON gi.user_id = p.id
WHERE
  (gi.is_for_sale = true OR gi.can_be_traded = true OR gi.can_be_borrowed = true)
  AND gi.status = 'owned'
  AND p.is_banned = false;
```

**Note**: This is a read-only view for display purposes. Actual gear item data managed through existing `gear_items` table.

## Extended Entities

### VipAccount Extension

Add featured videos array to existing `vip_accounts` table.

**Migration**: `20260104_add_vip_featured_videos.sql`

```sql
ALTER TABLE vip_accounts
ADD COLUMN featured_video_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN vip_accounts.featured_video_urls IS
  'Array of YouTube URLs for featured videos section in VIP profile modal';
```

**TypeScript Type Extension** (types/vip.ts):
```typescript
// Add to existing vipAccountSchema
featuredVideoUrls: z.array(z.string().url()).default([]),
```

## Type Definitions

### types/marketplace.ts

```typescript
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export type ListingType = 'for_sale' | 'for_trade' | 'for_borrow';
export type MarketplaceSortField = 'date' | 'price' | 'name';
export type MarketplaceSortOrder = 'asc' | 'desc';

// =============================================================================
// Schemas
// =============================================================================

export const marketplaceListingSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  condition: z.string(),
  pricePaid: z.number().nullable(),
  currency: z.string().nullable(),
  isForSale: z.boolean(),
  canBeTraded: z.boolean(),
  canBeBorrowed: z.boolean(),
  listedAt: z.string().datetime(),
  sellerId: z.string().uuid(),
  sellerName: z.string(),
  sellerAvatar: z.string().url().nullable(),
});

export const marketplaceFiltersSchema = z.object({
  type: z.enum(['all', 'for_sale', 'for_trade', 'for_borrow']).default('all'),
  sortBy: z.enum(['date', 'price', 'name']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// =============================================================================
// Types
// =============================================================================

export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
export type MarketplaceFilters = z.infer<typeof marketplaceFiltersSchema>;

export interface MarketplaceState {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  filters: MarketplaceFilters;
}

// =============================================================================
// Constants
// =============================================================================

export const MARKETPLACE_CONSTANTS = {
  ITEMS_PER_PAGE: 12,
  MAX_SEARCH_LENGTH: 100,
} as const;
```

### types/banner.ts

```typescript
import { z } from 'zod';

// =============================================================================
// Schemas
// =============================================================================

export const communityBannerSchema = z.object({
  id: z.string().uuid(),
  heroImageUrl: z.string().url(),
  ctaText: z.string().min(5).max(200),
  buttonText: z.string().min(2).max(50),
  targetUrl: z.string().url(),
  visibilityStart: z.string().datetime(),
  visibilityEnd: z.string().datetime(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createBannerSchema = communityBannerSchema.pick({
  heroImageUrl: true,
  ctaText: true,
  buttonText: true,
  targetUrl: true,
  visibilityStart: true,
  visibilityEnd: true,
  displayOrder: true,
  isActive: true,
}).refine(
  (data) => new Date(data.visibilityEnd) > new Date(data.visibilityStart),
  { message: 'End date must be after start date', path: ['visibilityEnd'] }
);

export const updateBannerSchema = createBannerSchema.partial();

// =============================================================================
// Types
// =============================================================================

export type CommunityBanner = z.infer<typeof communityBannerSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

// =============================================================================
// Constants
// =============================================================================

export const BANNER_CONSTANTS = {
  AUTO_ROTATE_INTERVAL_MS: 6000,
  MAX_ACTIVE_BANNERS: 10,
  IMAGE_ASPECT_RATIO: 21 / 9, // Cinematic banner ratio
} as const;
```

## Relationships

```
profiles (existing)
├── community_banners.created_by → profiles.id
├── gear_items.user_id → profiles.id (existing)
└── v_marketplace_listings.seller_id → profiles.id (via view)

gear_items (existing)
└── v_marketplace_listings (derived view)

vip_accounts (existing)
└── featured_video_urls[] (new column)
```

## State Transitions

### Banner Visibility State Machine

```
[Created] → [Scheduled] → [Active] → [Expired]
    │            │           │
    └────────────┴───────────┴── (is_active = false) → [Disabled]
```

- **Created**: Banner saved, visibility window in future
- **Scheduled**: `NOW() < visibility_start` AND `is_active = true`
- **Active**: `visibility_start <= NOW() <= visibility_end` AND `is_active = true`
- **Expired**: `NOW() > visibility_end`
- **Disabled**: `is_active = false` (admin toggle)

### Marketplace Listing State

Gear items become marketplace listings when any of:
- `is_for_sale = true`
- `can_be_traded = true`
- `can_be_borrowed = true`

AND `status = 'owned'` AND `owner.is_banned = false`

## Migration Scripts

See `supabase/migrations/`:
- `20260104_create_community_banners.sql`
- `20260104_add_vip_featured_videos.sql`
- `20260104_create_marketplace_view.sql`
