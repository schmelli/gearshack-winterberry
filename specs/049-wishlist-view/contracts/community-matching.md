# Community Matching Contract

**Feature**: 049-wishlist-view
**File**: `lib/supabase/community-matching.ts`
**Date**: 2025-12-16

## Overview

This contract defines the community availability matching system that finds inventory items from other users that match wishlist items. Uses PostgreSQL fuzzy matching (trigram similarity) to handle variations in brand and model names.

## Database Functions (Called by TypeScript)

### find_community_availability

**Purpose**: PostgreSQL function that finds matching inventory items for a wishlist item

**Signature**:
```sql
find_community_availability(p_user_id UUID, p_wishlist_item_id UUID)
RETURNS TABLE (
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
)
```

**Logic**:
1. Extract brand and model_number from wishlist item
2. Join with gear_items WHERE status='own' and marketplace flags true
3. Calculate fuzzy_match_gear() similarity score
4. Filter similarity_score >= 0.3 (30% match threshold)
5. Exclude items owned by requesting user
6. Join with profiles to get owner info
7. Order by similarity_score DESC
8. Limit to 10 matches

**Performance**:
- Uses GIN trigram indexes on brand and model_number
- SECURITY DEFINER allows reading others' marketplace items
- Stable function (can be cached by query planner)

---

## TypeScript Functions

### 1. fetchCommunityAvailability

**Purpose**: Fetch community availability matches for one or more wishlist items

**Signature**:
```typescript
export async function fetchCommunityAvailability(
  wishlistItemIds: string[]
): Promise<Map<string, CommunityAvailabilityMatch[]>>
```

**Implementation**:
```typescript
const results = new Map<string, CommunityAvailabilityMatch[]>();

for (const itemId of wishlistItemIds) {
  const { data, error } = await supabase
    .rpc('find_community_availability', {
      p_user_id: userId,
      p_wishlist_item_id: itemId,
    });

  if (error) {
    console.error(`Failed to fetch availability for ${itemId}:`, error);
    results.set(itemId, []);
  } else {
    results.set(itemId, data || []);
  }
}

return results;
```

**Returns**:
- `Map<itemId, CommunityAvailabilityMatch[]>` - Matches grouped by wishlist item
- Empty array if no matches found
- Empty array on error (graceful degradation)

**Caching**:
- Results cached client-side for 5 minutes
- No server-side caching (always fresh data)

---

### 2. refreshCommunityAvailability

**Purpose**: Refresh availability for a single wishlist item (force bypass cache)

**Signature**:
```typescript
export async function refreshCommunityAvailability(
  wishlistItemId: string
): Promise<CommunityAvailabilityMatch[]>
```

**Implementation**:
```typescript
const { data, error } = await supabase
  .rpc('find_community_availability', {
    p_user_id: userId,
    p_wishlist_item_id: wishlistItemId,
  });

if (error) {
  throw new Error(`Failed to refresh availability: ${error.message}`);
}

return data || [];
```

**Use Cases**:
- User manually refreshes availability
- After other user updates marketplace flags
- On-demand refresh for critical decisions

---

### 3. fetchAvailabilityForItem

**Purpose**: Get availability for single item (used by detail modal)

**Signature**:
```typescript
export async function fetchAvailabilityForItem(
  wishlistItemId: string
): Promise<CommunityAvailabilityMatch[]>
```

**Implementation**:
- Calls `find_community_availability` RPC
- Validates and transforms results with Zod schema
- Returns sorted by similarity_score DESC

**Validation**:
```typescript
import { communityAvailabilityMatchSchema } from '@/lib/validations/wishlist';

const validated = data.map(match =>
  communityAvailabilityMatchSchema.parse(match)
);
```

---

## Data Structures

### CommunityAvailabilityMatch

```typescript
export interface CommunityAvailabilityMatch {
  matchedItemId: string;        // UUID of matching inventory item
  ownerId: string;              // UUID of item owner
  ownerDisplayName: string;     // Owner's display name
  ownerAvatarUrl: string | null; // Owner's avatar URL
  itemName: string;             // Name of matched item
  itemBrand: string | null;     // Brand of matched item
  forSale: boolean;             // Available for purchase
  lendable: boolean;            // Available to lend
  tradeable: boolean;           // Available for trade
  similarityScore: number;      // Match quality (0-1)
  primaryImageUrl: string | null; // Item image
}
```

### WishlistItemAvailability

```typescript
export interface WishlistItemAvailability {
  wishlistItemId: string;
  matches: CommunityAvailabilityMatch[];
  hasMatches: boolean;
  matchCount: number;
  lastFetchedAt: Date;
  isStale: boolean; // True if > 5 minutes old
}
```

---

## Fuzzy Matching Algorithm

### Trigram Similarity

**Formula**: `similarity(text1, text2)` returns 0.0 to 1.0

**Preprocessing**:
1. Lowercase both strings
2. Concatenate brand + ' ' + model
3. Trim whitespace
4. Handle null values as empty strings

**Threshold**: 0.3 (30% similarity minimum)

**Examples**:
```
"osprey atmos 65" vs "osprey atmos 65 ag" = 0.85 (strong match)
"osprey atmos 65" vs "osprey atmos ag 65" = 0.82 (strong match)
"osprey atmos" vs "atmos 65" = 0.45 (medium match)
"osprey" vs "marmot" = 0.1 (no match, below threshold)
```

**Why Trigram**:
- Handles typos and abbreviations
- Works with partial matches
- Performance optimized with GIN indexes
- Better than exact match or LIKE patterns
- Standard PostgreSQL extension (pg_trgm)

---

## Marketplace Filter Logic

**Availability Criteria**:
```sql
WHERE
  status = 'own'  -- Only inventory items (not wishlist)
  AND (for_sale = true OR lendable = true OR tradeable = true)  -- At least one flag
  AND user_id != p_user_id  -- Exclude own items
```

**Priority Order** (UI display):
1. For Sale (primary badge)
2. Tradeable (secondary badge)
3. Lendable (tertiary badge)

---

## Usage Examples

### Fetch Availability for Multiple Items
```typescript
import { fetchCommunityAvailability } from '@/lib/supabase/community-matching';

// Get all visible wishlist item IDs
const visibleIds = wishlistItems.slice(0, 10).map(item => item.id);

// Fetch availability for all
const availability = await fetchCommunityAvailability(visibleIds);

// Render availability panels
wishlistItems.forEach(item => {
  const matches = availability.get(item.id) || [];
  console.log(`${item.name} has ${matches.length} community matches`);
});
```

### Single Item Availability (Detail Modal)
```typescript
import { fetchAvailabilityForItem } from '@/lib/supabase/community-matching';

const matches = await fetchAvailabilityForItem(wishlistItemId);

if (matches.length > 0) {
  console.log('Available from community:');
  matches.forEach(match => {
    console.log(`- ${match.ownerDisplayName}: ${match.itemName}`);
    console.log(`  Score: ${match.similarityScore.toFixed(2)}`);
    console.log(`  Flags: Sale=${match.forSale}, Lend=${match.lendable}, Trade=${match.tradeable}`);
  });
}
```

### Manual Refresh
```typescript
import { refreshCommunityAvailability } from '@/lib/supabase/community-matching';

async function handleRefresh(itemId: string) {
  setLoading(true);
  try {
    const freshMatches = await refreshCommunityAvailability(itemId);
    toast.success(`Found ${freshMatches.length} matches`);
    // Update cache
  } catch (error) {
    toast.error('Failed to refresh availability');
  } finally {
    setLoading(false);
  }
}
```

---

## Caching Strategy

### Client-Side Cache

**Structure**:
```typescript
interface AvailabilityCache {
  itemId: string;
  matches: CommunityAvailabilityMatch[];
  fetchedAt: Date;
}

const cache = new Map<string, AvailabilityCache>();
```

**TTL**: 5 minutes

**Invalidation**:
- Manual refresh via UI button
- TTL expiry
- View mode switch
- User authentication change

**Memory Management**:
- Max 100 items in cache
- LRU eviction when full
- Clear on logout

---

## Performance Optimization

### Database Level
1. **GIN Trigram Indexes**:
   - `idx_gear_items_brand_trgm` on brand
   - `idx_gear_items_model_trgm` on model_number

2. **Composite Index** for marketplace queries:
   - `idx_gear_items_marketplace` on (status, for_sale, lendable, tradeable)

3. **Query Limits**:
   - LIMIT 10 per wishlist item
   - Prevents unbounded result sets

### Application Level
1. **Lazy Loading**: Only fetch when medium/large cards visible
2. **Batch Requests**: Fetch multiple items in single loop (not single RPC call due to PostgreSQL function limits)
3. **Debouncing**: Don't refetch on rapid scroll
4. **Progressive Enhancement**: Show cards even if availability loading

---

## Error Handling

### Graceful Degradation
```typescript
// If availability fetch fails, show empty state
if (error) {
  console.error('Availability fetch failed:', error);
  return {
    matches: [],
    hasMatches: false,
    matchCount: 0,
  };
}
```

### User Feedback
- Loading spinner while fetching
- "No community matches" message if empty
- "Failed to load availability" error state
- Retry button on error

---

## Security Considerations

1. **RLS Bypass**: Function uses SECURITY DEFINER to read others' marketplace items
2. **Privacy**: Only shows items explicitly marked for marketplace (for_sale, lendable, tradeable)
3. **Exclusion**: User never sees their own items in matches
4. **Rate Limiting**: Consider adding rate limiting for RPC calls (future enhancement)

---

## Testing Checklist

- [ ] find_community_availability function exists in database
- [ ] Function returns correct schema structure
- [ ] Similarity threshold (0.3) filters weak matches
- [ ] Exact matches return similarity = 1.0
- [ ] Handles null brand/model gracefully
- [ ] Excludes own items from results
- [ ] Only returns marketplace items (flags = true)
- [ ] Only returns inventory items (status = 'own')
- [ ] Results limited to 10 per item
- [ ] Results ordered by similarity DESC
- [ ] fetchCommunityAvailability handles multiple items
- [ ] fetchCommunityAvailability gracefully handles errors
- [ ] Cache respects 5-minute TTL
- [ ] Manual refresh bypasses cache
- [ ] Zod validation catches malformed data

---

## Future Enhancements

1. **Batch RPC Call**: Modify PostgreSQL function to accept array of wishlist items
2. **Geolocation Filter**: Prefer matches from nearby users
3. **User Ratings**: Show owner reputation score
4. **Notification System**: Alert when new matches appear
5. **Price Comparison**: Show asking prices for for-sale items
6. **Request System**: Let users request to buy/borrow directly from card
