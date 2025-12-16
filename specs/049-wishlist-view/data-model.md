# Data Model: Wishlist View with Community Availability

**Feature**: 049-wishlist-view
**Date**: 2025-12-16
**Spec**: [spec.md](./spec.md)

## Overview

The wishlist feature leverages the existing `gear_items` table with `status='wishlist'` to store wishlist items. No new tables are required for core wishlist functionality. Community availability matching is computed via PostgreSQL fuzzy matching functions on existing data.

## Entities

### Wishlist Item

**Source**: Existing `gear_items` table with `status = 'wishlist'`

**Key Attributes**:
- All standard gear_item fields (name, brand, model_number, description, categoryId, weight, images, etc.)
- `status`: MUST be 'wishlist' (enum constraint)
- Excludes marketplace flags (for_sale, lendable, tradeable) as user doesn't own these items yet

**Relationships**:
- Belongs to User (via user_id foreign key)
- References Category hierarchy (via category_id, subcategory_id, product_type_id)

**Constraints**:
- `user_id` NOT NULL
- `name` NOT NULL
- `status` = 'wishlist'
- Duplicate prevention via application logic (brand + model case-insensitive match)

**State Transitions**:
```
[New] → create with status='wishlist'
[Wishlist] → update status='own' (Move to Inventory action)
[Wishlist] → DELETE (Remove from wishlist action)
```

### Community Availability Match

**Type**: Computed result (not persisted table)

**Structure**:
```typescript
interface CommunityAvailabilityMatch {
  matchedItemId: string;        // gear_items.id of matching inventory item
  ownerId: string;              // user_id of owner
  ownerDisplayName: string;     // From profiles table
  ownerAvatarUrl: string | null;
  itemName: string;             // Name of matched item
  itemBrand: string | null;
  forSale: boolean;             // Marketplace availability flags
  lendable: boolean;
  tradeable: boolean;
  similarityScore: number;      // Fuzzy match score (0-1)
  primaryImageUrl: string | null;
}
```

**Query Logic**:
- Join gear_items (wishlist) with gear_items (inventory) on fuzzy match
- Filter for status='own' AND (for_sale=true OR lendable=true OR tradeable=true)
- Exclude matches where owner_id = current user
- Use PostgreSQL trigram similarity on LOWER(brand) + ' ' + LOWER(model_number)
- Rank by similarity score descending
- Limit to top 10 matches per wishlist item

**Performance Considerations**:
- Add GIN index on brand and model_number for trigram matching
- Cache results for 5 minutes per wishlist item
- Lazy load availability data (not on initial page load)

## Database Schema Extensions

### Existing Tables (No Changes Required)

**gear_items** - Already supports wishlist via status enum
```sql
-- Existing status enum includes 'wishlist'
status gear_status DEFAULT 'own' NOT NULL
  -- Enum values: 'own', 'wishlist', 'sold', 'lent', 'retired'

-- Existing marketplace flags for community availability
for_sale BOOLEAN DEFAULT false
lendable BOOLEAN DEFAULT false
tradeable BOOLEAN DEFAULT false
```

### New Database Functions

**Function: fuzzy_match_gear(wishlist_brand TEXT, wishlist_model TEXT)**
```sql
-- Returns similarity score (0-1) for brand + model matching
-- Uses pg_trgm extension for trigram similarity
-- Example: fuzzy_match_gear('Osprey', 'Atmos 65') matches 'Osprey' + 'Atmos 65 AG'
```

**Function: find_community_availability(user_id UUID, wishlist_item_id UUID)**
```sql
-- Returns array of CommunityAvailabilityMatch records
-- Performs fuzzy matching against all community inventory items
-- Filters for marketplace availability flags
-- Ranks by similarity score
```

### New Indexes

```sql
-- Trigram index for fuzzy brand matching
CREATE INDEX idx_gear_items_brand_trgm ON gear_items USING GIN (brand gin_trgm_ops);

-- Trigram index for fuzzy model matching
CREATE INDEX idx_gear_items_model_trgm ON gear_items USING GIN (model_number gin_trgm_ops);

-- Composite index for marketplace queries
CREATE INDEX idx_gear_items_marketplace ON gear_items (status, for_sale, lendable, tradeable)
  WHERE status = 'own' AND (for_sale = true OR lendable = true OR tradeable = true);
```

## TypeScript Interfaces

### Wishlist-Specific Types

**File**: `types/wishlist.ts`

```typescript
import type { GearItem } from './gear';

/**
 * Wishlist item extends GearItem with wishlist-specific constraints
 * Enforces status='wishlist' at type level
 */
export type WishlistItem = GearItem & {
  status: 'wishlist'; // Narrow status type
};

/**
 * Community availability match result from database query
 */
export interface CommunityAvailabilityMatch {
  matchedItemId: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  itemName: string;
  itemBrand: string | null;
  forSale: boolean;
  lendable: boolean;
  tradeable: boolean;
  similarityScore: number;
  primaryImageUrl: string | null;
}

/**
 * Grouped availability matches for a single wishlist item
 */
export interface WishlistItemAvailability {
  wishlistItemId: string;
  matches: CommunityAvailabilityMatch[];
  hasMatches: boolean;
  matchCount: number;
}

/**
 * View mode for inventory page (inventory or wishlist)
 */
export type InventoryViewMode = 'inventory' | 'wishlist';

/**
 * Hook return type for useWishlist
 */
export interface UseWishlistReturn {
  // Data
  wishlistItems: WishlistItem[];
  filteredItems: WishlistItem[];
  isLoading: boolean;

  // Actions
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  moveToInventory: (itemId: string) => Promise<void>;

  // Filters (reuse from useInventory)
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;

  // Derived state
  itemCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;

  // Duplicate detection
  checkDuplicate: (brand: string | null, modelNumber: string | null) => WishlistItem | null;
}

/**
 * Hook return type for useCommunityAvailability
 */
export interface UseCommunityAvailabilityReturn {
  // Data
  availability: Map<string, WishlistItemAvailability>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAvailability: (wishlistItemIds: string[]) => Promise<void>;
  refreshAvailability: (wishlistItemId: string) => Promise<void>;

  // Helpers
  getAvailability: (wishlistItemId: string) => WishlistItemAvailability | null;
  hasAvailability: (wishlistItemId: string) => boolean;
}
```

### Zod Validation Schemas

**File**: `lib/validations/wishlist.ts`

```typescript
import { z } from 'zod';
import { gearItemSchema } from './gear'; // Existing schema

/**
 * Schema for adding item to wishlist
 * Same fields as gear item but enforces status='wishlist'
 */
export const addToWishlistSchema = gearItemSchema.extend({
  status: z.literal('wishlist'),
});

/**
 * Schema for community availability match from database
 */
export const communityAvailabilityMatchSchema = z.object({
  matchedItemId: z.string().uuid(),
  ownerId: z.string().uuid(),
  ownerDisplayName: z.string(),
  ownerAvatarUrl: z.string().url().nullable(),
  itemName: z.string(),
  itemBrand: z.string().nullable(),
  forSale: z.boolean(),
  lendable: z.boolean(),
  tradeable: z.boolean(),
  similarityScore: z.number().min(0).max(1),
  primaryImageUrl: z.string().url().nullable(),
});
```

## Data Flow Diagrams

### Add to Wishlist Flow
```
User clicks "Add to Wishlist"
  → Open GearItemEditor modal (mode='wishlist')
  → User fills form fields
  → Submit validates with Zod schema
  → Check duplicate (brand + model case-insensitive)
  → If duplicate: Show warning toast, prevent save
  → If unique: INSERT into gear_items with status='wishlist'
  → Refresh useWishlist hook data
  → Show success toast
  → Close modal
```

### Community Availability Flow
```
User views medium-sized wishlist cards
  → useCommunityAvailability.fetchAvailability([itemIds])
  → For each wishlist item:
    → Query find_community_availability(user_id, item_id)
    → Returns CommunityAvailabilityMatch[]
    → Store in Map<itemId, availability>
  → Render CommunityAvailabilityPanel on each card
  → If matches.length > 0: Show availability badges
  → If matches.length === 0: Show "Not available in community"
```

### Move to Inventory Flow
```
User clicks "Move to Inventory" in detail modal
  → Show confirmation dialog
  → User confirms
  → UPDATE gear_items SET status='own' WHERE id=itemId
  → Refresh both useWishlist and useInventory hooks
  → Show success toast ("Item moved to inventory")
  → Navigate to inventory view
  → Highlight newly moved item
```

## Caching Strategy

**Wishlist Items**:
- Client-side: Zustand store with persist middleware
- Server-side: No caching (always fresh from Supabase)
- Invalidation: On add/remove/move actions

**Community Availability**:
- Client-side: In-memory Map with 5-minute TTL
- Server-side: No caching (always fresh query)
- Invalidation: On manual refresh or TTL expiry
- Lazy loading: Only fetch when medium/large cards visible

**Category Labels**:
- Reuse existing useInventory category caching
- No changes needed

## Migration Plan

**Migration**: `20251216_wishlist_functions.sql`

```sql
-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy brand/model matching
CREATE INDEX IF NOT EXISTS idx_gear_items_brand_trgm
  ON gear_items USING GIN (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_gear_items_model_trgm
  ON gear_items USING GIN (model_number gin_trgm_ops);

-- Create composite index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_gear_items_marketplace
  ON gear_items (status, for_sale, lendable, tradeable)
  WHERE status = 'own' AND (for_sale = true OR lendable = true OR tradeable = true);

-- Function: Compute similarity score for brand + model
CREATE OR REPLACE FUNCTION fuzzy_match_gear(
  wishlist_brand TEXT,
  wishlist_model TEXT,
  inventory_brand TEXT,
  inventory_model TEXT
) RETURNS NUMERIC AS $$
DECLARE
  wishlist_text TEXT;
  inventory_text TEXT;
BEGIN
  -- Normalize and concatenate brand + model
  wishlist_text := LOWER(COALESCE(wishlist_brand, '') || ' ' || COALESCE(wishlist_model, ''));
  inventory_text := LOWER(COALESCE(inventory_brand, '') || ' ' || COALESCE(inventory_model, ''));

  -- Return trigram similarity (0-1)
  RETURN similarity(wishlist_text, inventory_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Find community availability for wishlist item
CREATE OR REPLACE FUNCTION find_community_availability(
  p_user_id UUID,
  p_wishlist_item_id UUID
) RETURNS TABLE (
  matched_item_id UUID,
  owner_id UUID,
  owner_display_name TEXT,
  owner_avatar_url TEXT,
  item_name TEXT,
  item_brand TEXT,
  for_sale BOOLEAN,
  lendable BOOLEAN,
  tradeable BOOLEAN,
  similarity_score NUMERIC,
  primary_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.id AS matched_item_id,
    gi.user_id AS owner_id,
    p.display_name AS owner_display_name,
    p.avatar_url AS owner_avatar_url,
    gi.name AS item_name,
    gi.brand AS item_brand,
    gi.for_sale,
    gi.lendable,
    gi.tradeable,
    fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) AS similarity_score,
    gi.primary_image_url
  FROM gear_items gi
  JOIN profiles p ON gi.user_id = p.id
  WHERE
    gi.status = 'own'
    AND (gi.for_sale = true OR gi.lendable = true OR gi.tradeable = true)
    AND gi.user_id != p_user_id
    AND fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) >= 0.3  -- Minimum similarity threshold
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fuzzy_match_gear TO authenticated;
GRANT EXECUTE ON FUNCTION find_community_availability TO authenticated;
```

## Data Integrity Rules

1. **Wishlist Status Enforcement**:
   - Application level: Only create gear_items with status='wishlist' via addToWishlist
   - Database level: Use existing enum constraint (status gear_status)

2. **Duplicate Prevention**:
   - Application level: checkDuplicate() in useWishlist before save
   - Normalization: LOWER(TRIM(brand)) + LOWER(TRIM(model_number))
   - User feedback: Toast warning if duplicate detected

3. **Move to Inventory Integrity**:
   - Atomic UPDATE status='wishlist' → status='own'
   - No data loss on transfer
   - All fields preserved including images, notes, dependencies

4. **Community Matching Exclusions**:
   - Exclude own items: WHERE user_id != current_user
   - Exclude non-marketplace items: WHERE for_sale OR lendable OR tradeable
   - Exclude wishlist items: WHERE status='own'

5. **Row Level Security** (Existing policies apply):
   - Users can only SELECT/UPDATE/DELETE their own wishlist items
   - Community availability uses SECURITY DEFINER function to read others' marketplace items

## Performance Benchmarks

**Target Performance** (from success criteria):
- View switching: < 2 seconds
- Community availability: < 3 seconds
- Search/filter: < 2 seconds for 500 items

**Optimization Strategies**:
- Trigram GIN indexes for fuzzy matching
- Composite index for marketplace queries
- Limit community matches to top 10 per item
- Lazy load availability (not on page load)
- Client-side caching with 5-minute TTL
- Debounced search queries (300ms)
