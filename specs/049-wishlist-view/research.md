# Research: Wishlist View with Community Availability

**Feature**: 049-wishlist-view
**Date**: 2025-12-16

## Executive Summary

This research document covers four critical implementation areas for the wishlist feature: fuzzy matching for brand+model name matching, duplicate detection strategies, component reuse patterns for extending inventory cards, and state management for view switching. All decisions leverage existing patterns from the codebase (Features 042, 044, 045, 002) and align with the project's Feature-Sliced Light architecture and constitution requirements.

**Key Findings**:
1. **Fuzzy Matching**: Use existing pg_trgm similarity function (already deployed) with 0.3 threshold
2. **Duplicate Detection**: Database-level composite unique constraint on normalized brand+model
3. **Component Reuse**: Context prop pattern with conditional rendering (existing GearCard pattern)
4. **View State**: URL-based state management via search params (existing modal pattern)

---

## Research Area 1: PostgreSQL Fuzzy Matching for Brand + Model Names

### Context

The wishlist feature requires matching user wishlist items with community gear using brand + model name matching. The system must handle typos and variations (e.g., "Osprey Atmos 65" should match "Osprey Atmos 65 AG").

### Options Evaluated

| Option | Pros | Cons | Performance | Typo Tolerance |
|--------|------|------|-------------|----------------|
| **A: pg_trgm similarity()** | Already enabled, handles typos well, indexed | Requires threshold tuning | O(log n) with GIN index | Excellent (trigram-based) |
| **B: Levenshtein distance** | Precise edit distance metric | Slower at scale, not indexed | O(n) sequential scan | Good (character-level) |
| **C: Full-text search (tsvector)** | Linguistic features, stemming | Poor for brand names, no typo tolerance | O(log n) with GIN index | Poor (word-level only) |
| **D: ILIKE substring match** | Simple, no extension needed | No typo tolerance at all | O(n) sequential scan | None |

### Decision

**Use pg_trgm `similarity()` function with 0.3 threshold for fuzzy matching.**

### Rationale

1. **Already Deployed**: The `pg_trgm` extension is enabled in the codebase (Feature 042, migration `20251210_catalog_tables.sql`). The `search_brands_fuzzy()` RPC function exists and uses similarity matching.

2. **Proven Pattern**: Feature 044 uses trigram similarity for brand autocomplete with excellent results:
   ```sql
   -- From supabase/migrations/20251211_search_brands_fuzzy.sql
   WHERE similarity(b.name_normalized, lower(trim(search_query))) > 0.3
   ```

3. **Performance**: GIN indexes on trigram columns enable sub-200ms queries even at 100k+ scale (documented in Feature 042 research).

4. **Typo Tolerance**: Trigrams handle common typos naturally:
   - "Hillberg" matches "Hilleberg" (shared trigrams: "hil", "ill", "lle", "leb", "ber")
   - "Atmos 65" matches "Atmos 65 AG" (high overlap despite extra "AG")

5. **Threshold Calibration**: The 0.3 threshold is battle-tested across Features 042 and 044 for brand matching. Lower values increase false positives; higher values miss valid variations.

### Implementation

```sql
-- New migration: 20251216_wishlist_fuzzy_matching.sql
CREATE OR REPLACE FUNCTION match_community_wishlist_items(
  user_wishlist_items JSONB, -- Array of {brand, name, normalized_key}
  match_threshold FLOAT DEFAULT 0.3,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  wishlist_key TEXT,
  gear_item_id UUID,
  user_id UUID,
  brand TEXT,
  name TEXT,
  similarity FLOAT,
  is_for_sale BOOLEAN,
  can_be_borrowed BOOLEAN,
  can_be_traded BOOLEAN
) AS $$
BEGIN
  -- For each wishlist item, find community gear with similar brand+name
  RETURN QUERY
  SELECT
    wi.normalized_key,
    gi.id,
    gi.user_id,
    gi.brand,
    gi.name,
    similarity(
      lower(trim(COALESCE(gi.brand, '') || ' ' || gi.name)),
      wi.normalized_key
    )::FLOAT AS similarity,
    gi.is_for_sale,
    gi.can_be_borrowed,
    gi.can_be_traded
  FROM
    jsonb_to_recordset(user_wishlist_items) AS wi(normalized_key TEXT),
    gear_items gi
  WHERE
    gi.status = 'own'
    AND (gi.is_for_sale OR gi.can_be_borrowed OR gi.can_be_traded)
    AND similarity(
      lower(trim(COALESCE(gi.brand, '') || ' ' || gi.name)),
      wi.normalized_key
    ) > match_threshold
  ORDER BY similarity DESC, gi.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create GIN index for performance
CREATE INDEX IF NOT EXISTS idx_gear_items_brand_name_trgm
  ON gear_items USING GIN (
    (lower(trim(COALESCE(brand, '') || ' ' || name))) gin_trgm_ops
  );

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION match_community_wishlist_items TO authenticated;
```

**Client-side normalization** (reuse existing pattern from Feature 048):
```typescript
// lib/utils/matching.ts (already exists)
export function normalizeForMatch(brand: string | null, name: string): string {
  return `${brand || ''} ${name}`.toLowerCase().trim();
}
```

### Alternatives Considered

**Why not Levenshtein distance?**
- No index support → O(n) sequential scans for every query
- PostgreSQL `levenshtein()` function from `fuzzystrmatch` extension
- Useful for edit distance but not scalable for fuzzy search across all users

**Why not full-text search?**
- Designed for linguistic text (articles, descriptions)
- Poor for brand names like "MSR", "REI", "Big Agnes"
- No typo tolerance (requires exact word stems)

**Why not exact matching only?**
- User entry variations: "Atmos 65" vs "Atmos 65 AG" vs "Atmos AG 65"
- No tolerance for typos during wishlist creation
- Misses legitimate matches in community gear

### Implementation Notes

1. **Normalization Strategy**: Use `lower(trim(COALESCE(brand, '') || ' ' || name))` to create searchable key
2. **Index Requirement**: GIN index on normalized brand+name column for performance
3. **Threshold Tuning**: Start with 0.3 (proven), monitor false positives/negatives, adjust if needed
4. **ILIKE Fallback**: Include `OR name ILIKE '%query%'` for exact substring matches (bonus precision)
5. **Batch Queries**: Pass user's entire wishlist as JSONB array to minimize round trips

---

## Research Area 2: Duplicate Detection for Brand + Model Names

### Context

The system must prevent users from adding duplicate wishlist items when the same gear (brand + model) already exists in their wishlist. Matching must be case-insensitive and handle whitespace variations.

### Options Evaluated

| Option | Pros | Cons | Enforcement | Performance |
|--------|------|------|-------------|-------------|
| **A: DB unique constraint on normalized column** | Guaranteed uniqueness, no app logic | Requires trigger/generated column | Database-level | Instant (index lookup) |
| **B: Application-level check before insert** | Flexible, easy to customize | Race conditions possible | Application-level | Fast (indexed query) |
| **C: Upsert with ON CONFLICT** | Atomic, prevents duplicates | Less clear error messaging | Database-level | Instant (index + upsert) |
| **D: Client-side validation only** | No server round trip | Not secure, easily bypassed | Client-level | Instant (local check) |

### Decision

**Use database-level composite unique constraint on normalized brand + model name, enforced via generated column and unique index.**

### Rationale

1. **Data Integrity**: Database constraints are the only guaranteed way to prevent duplicates, even with concurrent requests or API abuse.

2. **Existing Pattern**: The codebase already uses database-level constraints for data integrity (RLS policies, foreign keys, check constraints in initial schema).

3. **Performance**: Unique indexes provide O(log n) lookup, negligible overhead on insert.

4. **Error Handling**: PostgreSQL unique violation errors (code 23505) are easily caught and translated to user-friendly messages in Next.js Server Actions.

5. **Case-Insensitive + Whitespace Normalization**: PostgreSQL generated columns with `LOWER(TRIM())` provide consistent normalization.

### Implementation

```sql
-- Migration: 20251216_wishlist_unique_constraint.sql

-- Add generated column for normalized brand+name key
ALTER TABLE gear_items
ADD COLUMN IF NOT EXISTS brand_name_normalized TEXT
GENERATED ALWAYS AS (
  lower(trim(COALESCE(brand, '') || ' ' || name))
) STORED;

-- Create unique partial index (only for wishlist items)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gear_items_wishlist_unique
  ON gear_items (user_id, brand_name_normalized)
  WHERE status = 'wishlist';

-- Comment
COMMENT ON INDEX idx_gear_items_wishlist_unique IS
  'Prevents duplicate wishlist items per user based on normalized brand+name';
```

**Application-level error handling** (in Server Action):
```typescript
// app/actions/wishlist.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addItemToWishlist(data: {
  name: string;
  brand: string | null;
  // ... other fields
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('gear_items')
      .insert({
        user_id: user.id,
        name: data.name,
        brand: data.brand,
        status: 'wishlist',
        // ... other fields
      });

    if (error) {
      // Detect unique constraint violation (PostgreSQL error code 23505)
      if (error.code === '23505' && error.message.includes('idx_gear_items_wishlist_unique')) {
        return {
          success: false,
          error: 'This item is already in your wishlist',
          errorCode: 'DUPLICATE_ITEM'
        };
      }
      throw error;
    }

    revalidatePath('/inventory');
    return { success: true };
  } catch (err) {
    console.error('Add to wishlist error:', err);
    return { success: false, error: 'Failed to add item to wishlist' };
  }
}
```

**Client-side optimistic validation** (for better UX):
```typescript
// hooks/useWishlist.ts
import { normalizeForMatch } from '@/lib/utils/matching';

export function useWishlist() {
  const { items } = useSupabaseStore();

  const isDuplicate = useCallback((brand: string | null, name: string): boolean => {
    const normalized = normalizeForMatch(brand, name);
    return items
      .filter(item => item.status === 'wishlist')
      .some(item => normalizeForMatch(item.brand, item.name) === normalized);
  }, [items]);

  return { isDuplicate, /* ... */ };
}
```

### Alternatives Considered

**Why not application-level check only?**
- Race condition: Two concurrent requests could both pass validation and insert duplicates
- Not enforceable if API is accessed directly (e.g., via Supabase client from browser console)
- Requires SELECT before INSERT for every operation (two queries instead of one)

**Why not upsert with ON CONFLICT?**
- Works for "add or update" semantics, but wishlist "add" should fail on duplicates
- Less clear error messaging (silent success vs explicit duplicate error)
- Could work as fallback pattern but constraint + error handling is clearer

**Why not client-side validation only?**
- Easily bypassed (browser console, Postman, etc.)
- Provides good UX but not data integrity
- Should be used in addition to database constraint, not instead of

### Implementation Notes

1. **Normalized Column**: Use `GENERATED ALWAYS AS` for automatic normalization (no app logic needed)
2. **Partial Index**: `WHERE status = 'wishlist'` ensures uniqueness only for wishlist items (owned items can have duplicates across users)
3. **User Scoping**: Include `user_id` in index to allow different users to have same item in their wishlists
4. **Error Code Detection**: Check `error.code === '23505'` and `error.message` to distinguish duplicate errors from other constraint violations
5. **Client-side Preview**: Implement `isDuplicate()` check before Server Action call to prevent unnecessary API round trips

---

## Research Area 3: Component Reuse for Extending Inventory Cards to Wishlist

### Context

The wishlist feature must reuse the existing `GearCard` component (from Feature 002) with modifications for wishlist context (show "Add to Inventory" button instead of "Edit", different styling, etc.). Per constitution, we cannot create new base components and must maintain Feature-Sliced Light architecture.

### Options Evaluated

| Pattern | Pros | Cons | Complexity | Constitution Compliance |
|---------|------|------|------------|------------------------|
| **A: Context prop with conditional rendering** | Simple, single component, clear logic | Some conditional complexity | Low | ✅ Full compliance |
| **B: Render props pattern** | Flexible, composable | High complexity, overkill for binary context | High | ⚠️ Complexity risk |
| **C: Higher-order component (HOC)** | Separation of concerns | Adds abstraction layer, harder to debug | Medium | ⚠️ Over-engineering |
| **D: Separate WishlistCard component** | Clean separation | Code duplication, violates DRY | Low | ❌ Creates new base component |
| **E: Compound component pattern** | Highly composable | Over-engineered for simple use case | High | ⚠️ Complexity risk |

### Decision

**Use context prop with conditional rendering (Pattern A) - extend existing GearCard with `context?: 'inventory' | 'wishlist'` prop.**

### Rationale

1. **Existing Pattern**: The codebase already uses this pattern extensively:
   - `GearCard` has `viewDensity` prop for conditional rendering (compact/standard/detailed)
   - `StatusIcons` component shows different icons based on item properties
   - `GearDetailModal` changes behavior based on `isMobile` prop

2. **Feature-Sliced Light Compliance**: Component remains stateless, receives data via props only, conditional rendering logic is declarative.

3. **Minimal Duplication**: Single component file, shared layout logic, context-specific sections clearly marked.

4. **Type Safety**: TypeScript discriminated unions ensure correct prop combinations:
   ```typescript
   type GearCardProps = {
     item: GearItem;
     viewDensity: ViewDensity;
     getCategoryLabel: (id: string | null) => string;
   } & (
     | { context: 'inventory'; onClick?: () => void }
     | { context: 'wishlist'; onMoveToInventory: () => Promise<void> }
   );
   ```

5. **Clear Separation**: Context-specific code is isolated in conditional blocks, easy to maintain and test.

### Implementation

**Extended GearCard component**:
```typescript
// components/inventory-gallery/GearCard.tsx (modified)

interface GearCardProps {
  item: GearItem;
  viewDensity: ViewDensity;
  getCategoryLabel: (categoryId: string | null) => string;
  context?: 'inventory' | 'wishlist'; // NEW: defaults to 'inventory'
  onClick?: () => void;
  onMoveToInventory?: () => Promise<void>; // NEW: required when context='wishlist'
}

export function GearCard({
  item,
  viewDensity,
  getCategoryLabel,
  context = 'inventory',
  onClick,
  onMoveToInventory
}: GearCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // ... existing image/weight/category logic ...

  const handleMoveToInventory = async () => {
    if (!onMoveToInventory) return;
    setIsMoving(true);
    try {
      await onMoveToInventory();
      toast.success('Moved to inventory');
    } catch (err) {
      toast.error('Failed to move item');
    } finally {
      setIsMoving(false);
    }
  };

  // Compact view (existing logic with context modifications)
  if (isCompact) {
    return (
      <Card className={cn(/* ... existing classes ... */)}>
        {/* ... existing image section ... */}

        {/* ... existing content section ... */}

        {/* ACTION BUTTON - Context-specific */}
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {context === 'inventory' ? (
            <Button asChild size="icon" variant="ghost" /* ... */>
              <Link href={`/inventory/${item.id}/edit`}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleMoveToInventory}
              disabled={isMoving}
              /* ... */
            >
              <ArrowRight className="h-4 w-4" />
              <span className="sr-only">Move to Inventory</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Standard/Detailed view (similar context-specific modifications)
  return (
    <Card /* ... */>
      {/* ... existing image section ... */}

      <div className="absolute right-2 top-2 /* ... */">
        {context === 'inventory' ? (
          <Button asChild /* ... Edit button ... */ />
        ) : (
          <Button /* ... Move to Inventory button ... */ />
        )}
      </div>

      {/* ... existing content section ... */}
    </Card>
  );
}
```

**Wishlist-specific wrapper** (optional, for additional wishlist features):
```typescript
// components/wishlist/WishlistCard.tsx
'use client';

import { GearCard } from '@/components/inventory-gallery/GearCard';
import { useStore } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';

interface WishlistCardProps {
  item: GearItem;
  viewDensity: ViewDensity;
  getCategoryLabel: (id: string | null) => string;
}

export function WishlistCard(props: WishlistCardProps) {
  const updateItem = useStore(state => state.updateItem);

  const handleMoveToInventory = async () => {
    await updateItem(props.item.id, { status: 'own' });
  };

  return (
    <GearCard
      {...props}
      context="wishlist"
      onMoveToInventory={handleMoveToInventory}
    />
  );
}
```

### Alternatives Considered

**Why not render props?**
```typescript
// Over-engineered for binary context
<GearCard
  item={item}
  renderActions={(item) => (
    context === 'inventory'
      ? <EditButton item={item} />
      : <MoveToInventoryButton item={item} />
  )}
/>
```
- Adds unnecessary complexity for a simple binary choice
- Makes props interface harder to type-check
- No clear benefit over conditional rendering

**Why not HOC?**
```typescript
// Adds indirection without benefit
const WishlistCard = withWishlistContext(GearCard);
const InventoryCard = withInventoryContext(GearCard);
```
- Extra abstraction layer makes debugging harder
- Component tree depth increases
- No reuse benefit (only two contexts)

**Why not separate WishlistCard component?**
- Violates DRY principle (duplicates 90% of GearCard code)
- Per constitution: "Do not create new base components"
- Maintenance burden: changes must be synced across two components
- Would only be acceptable if wishlist cards are fundamentally different (they're not)

### Implementation Notes

1. **Default Context**: `context = 'inventory'` ensures existing usage continues to work without changes
2. **Type Safety**: Use discriminated unions to enforce `onMoveToInventory` is provided when `context='wishlist'`
3. **Icon Choice**: Use `ArrowRight` (lucide-react) for "Move to Inventory" action
4. **Loading State**: Track `isMoving` to disable button and show loading spinner during async operation
5. **Styling Consistency**: Reuse existing button classes, only swap icon and handler
6. **Optional Wrapper**: Create `WishlistCard` wrapper component for additional wishlist-specific logic (community availability indicator, price alerts, etc.)

---

## Research Area 4: State Management for View Switching (Inventory vs Wishlist)

### Context

The inventory page must support toggling between "Owned Gear" (inventory) and "Wishlist" views. The user's last selected view should persist across page navigations and browser sessions (or at minimum, within the session).

### Options Evaluated

| Approach | Pros | Cons | Persistence | SEO | Deep Linking |
|----------|------|------|-------------|-----|--------------|
| **A: URL search params (?view=wishlist)** | Shareable URLs, back button support, SSR-friendly | URL visible, slightly verbose | Session history | ✅ Indexable | ✅ Native |
| **B: Zustand with persist middleware (localStorage)** | Hidden from URL, persistent across sessions | Not shareable, no back button | localStorage | ❌ Client-only | ❌ Requires logic |
| **C: sessionStorage via hook** | Simple, no dependencies | Not persistent, not shareable | Session only | ❌ Client-only | ❌ Requires logic |
| **D: URL path segments (/inventory vs /wishlist)** | Clean URLs, separate pages | Duplicates layout/logic, harder to share components | N/A (routing) | ✅ Indexable | ✅ Native |

### Decision

**Use URL search parameters (`?view=inventory` or `?view=wishlist`) as single source of truth, with fallback to sessionStorage for default preference.**

### Rationale

1. **Existing Pattern**: Feature 045 (Gear Detail Modal) uses URL search params (`?gear=<id>`) for state management with proven success:
   ```typescript
   // From hooks/useGearDetailModal.ts
   const gearId = searchParams.get('gear');
   const isOpen = !!gearId;
   ```

2. **Deep Linking**: Users can bookmark/share specific views (`/inventory?view=wishlist`), important for shared loadout workflows (Feature 048).

3. **Browser Integration**: Back/forward buttons work naturally, URL reflects current state.

4. **SSR Compatibility**: Next.js can read URL params during server rendering (useful for future enhancements like metadata tags).

5. **Feature-Sliced Light**: URL is the source of truth, hook derives state from it (stateless pattern).

6. **Hybrid Persistence**: URL params for current session, sessionStorage for "last viewed" preference on initial load.

### Implementation

**Custom hook for view state management**:
```typescript
// hooks/useInventoryView.ts
'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type InventoryView = 'inventory' | 'wishlist';

const VIEW_PREFERENCE_KEY = 'gearshack-inventory-view-preference';

export interface UseInventoryViewReturn {
  /** Current active view (derived from URL or sessionStorage) */
  currentView: InventoryView;
  /** Switch to a different view (updates URL) */
  setView: (view: InventoryView) => void;
  /** Whether the view is currently being switched */
  isChanging: boolean;
}

/**
 * Manages inventory/wishlist view state via URL search params.
 *
 * State precedence:
 * 1. URL param `?view=wishlist` or `?view=inventory`
 * 2. sessionStorage last preference
 * 3. Default: 'inventory'
 *
 * @example
 * ```tsx
 * const { currentView, setView } = useInventoryView();
 *
 * // Switch to wishlist
 * setView('wishlist');
 * // URL becomes: /inventory?view=wishlist
 * ```
 */
export function useInventoryView(): UseInventoryViewReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive current view from URL (source of truth)
  const urlView = searchParams.get('view') as InventoryView | null;

  // Determine current view with fallback logic
  const currentView: InventoryView = (() => {
    // 1. URL param takes precedence
    if (urlView === 'inventory' || urlView === 'wishlist') {
      return urlView;
    }

    // 2. Fallback to sessionStorage preference (client-side only)
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(VIEW_PREFERENCE_KEY) as InventoryView | null;
      if (stored === 'inventory' || stored === 'wishlist') {
        return stored;
      }
    }

    // 3. Default to inventory
    return 'inventory';
  })();

  // Sync URL with derived view on initial load (if no URL param set)
  useEffect(() => {
    if (!urlView && currentView) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', currentView);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [urlView, currentView, pathname, router, searchParams]);

  // Update sessionStorage when view changes (for future visits)
  useEffect(() => {
    if (typeof window !== 'undefined' && currentView) {
      sessionStorage.setItem(VIEW_PREFERENCE_KEY, currentView);
    }
  }, [currentView]);

  // Switch view (updates URL, which triggers re-render)
  const setView = useCallback(
    (view: InventoryView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', view);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return {
    currentView,
    setView,
    isChanging: false, // Could track router.isReady if needed
  };
}
```

**Toggle component**:
```typescript
// components/wishlist/WishlistToggle.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventoryView } from '@/hooks/useInventoryView';
import { Package, Heart } from 'lucide-react';

export function WishlistToggle() {
  const { currentView, setView } = useInventoryView();

  return (
    <Tabs value={currentView} onValueChange={(v) => setView(v as 'inventory' | 'wishlist')}>
      <TabsList>
        <TabsTrigger value="inventory" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span>Owned Gear</span>
        </TabsTrigger>
        <TabsTrigger value="wishlist" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          <span>Wishlist</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

**Page integration**:
```typescript
// app/[locale]/inventory/page.tsx (modified)
'use client';

import { useInventoryView } from '@/hooks/useInventoryView';
import { WishlistToggle } from '@/components/wishlist/WishlistToggle';

export default function InventoryPage() {
  const { currentView } = useInventoryView();
  const { items } = useSupabaseStore();

  // Filter items based on current view
  const displayItems = items.filter(item =>
    currentView === 'inventory'
      ? item.status === 'own'
      : item.status === 'wishlist'
  );

  return (
    <div>
      <WishlistToggle />

      <GalleryGrid items={displayItems} /* ... */ />
    </div>
  );
}
```

### Alternatives Considered

**Why not Zustand with localStorage?**
```typescript
// Would work but loses URL benefits
const useViewStore = create(
  persist(
    (set) => ({
      view: 'inventory',
      setView: (view) => set({ view }),
    }),
    { name: 'inventory-view' }
  )
);
```
- Pros: Persistent across sessions, hidden from URL
- Cons: Not shareable, no back button support, duplicates state (URL vs Zustand)
- Verdict: Good for global app state, but URL is better for page-specific view state

**Why not sessionStorage only?**
```typescript
// From Feature 002 (view density)
const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('viewDensity') as ViewDensity || 'standard';
  }
  return 'standard';
});
```
- Pros: Simple, no URL pollution
- Cons: Not shareable, no deep linking, not SSR-friendly
- Verdict: Acceptable for UI preferences (density), but view switching is more semantic (worthy of URL)

**Why not separate routes (/inventory vs /wishlist)?**
```typescript
// app/[locale]/inventory/page.tsx - Owned gear
// app/[locale]/wishlist/page.tsx - Wishlist
```
- Pros: Clean URLs, separate page components
- Cons: Duplicates layout/toolbar/filter logic, harder to share components, no unified "gear management" experience
- Verdict: Could work, but tab pattern with shared layout is better UX for this use case

### Implementation Notes

1. **URL Format**: Use `?view=inventory` or `?view=wishlist` (lowercase, singular)
2. **Default Behavior**: Default to `inventory` if no URL param and no stored preference
3. **Initial Load**: Sync URL with derived view on mount (via useEffect) to ensure URL always reflects state
4. **Persistence**: Use sessionStorage for "last viewed" preference across page navigations within session
5. **scroll: false**: Use `router.replace(..., { scroll: false })` to prevent scroll-to-top on view switch
6. **Tab Component**: Use shadcn/ui `Tabs` component for visual toggle (consistent with design system)
7. **Icon Choice**: `Package` for inventory, `Heart` for wishlist (lucide-react)

---

## Cross-Cutting Concerns

### Performance Considerations

1. **Fuzzy Matching**: GIN indexes on trigram columns are critical (add to migration)
2. **Batch Queries**: Pass entire wishlist as JSONB array to minimize database round trips
3. **Client-side Caching**: Consider React Query or SWR for community availability results
4. **Lazy Loading**: Defer community matching queries until "Community Availability" panel is expanded

### Error Handling

1. **Duplicate Detection**: Catch PostgreSQL error code `23505` and translate to user-friendly message
2. **Fuzzy Matching**: Handle zero results gracefully (show "No community matches found" message)
3. **Network Failures**: Implement retry logic for community matching queries (exponential backoff)
4. **Stale State**: Show loading spinner during view switches to prevent confusion

### Accessibility

1. **Keyboard Navigation**: Ensure `WishlistToggle` tabs are keyboard accessible (Tab, Arrow keys)
2. **Screen Readers**: Use semantic HTML and ARIA labels for toggle and action buttons
3. **Loading States**: Announce "Loading wishlist" via `aria-live="polite"` region

### Internationalization (i18n)

1. **View Labels**: Add translations for "Owned Gear", "Wishlist", "Move to Inventory"
2. **Error Messages**: Translate duplicate/matching error messages via next-intl
3. **URL Params**: Keep URL params in English (`?view=inventory`) for consistency, translate UI labels only

---

## Dependencies and Prerequisites

### Existing Features

| Feature | Artifact | Usage in Wishlist |
|---------|----------|-------------------|
| 002-inventory-gallery | `GearCard`, `useInventory` | Extend for wishlist context |
| 040-supabase-migration | `gear_items` table, `status` enum | Leverage `status='wishlist'` |
| 042-catalog-sync-api | `pg_trgm` extension, GIN indexes | Fuzzy matching infrastructure |
| 044-intelligence-integration | `search_brands_fuzzy()` function | Pattern reference for similarity matching |
| 045-gear-detail-modal | `useGearDetailModal` hook | Pattern reference for URL state management |
| 048-shared-loadout-enhancement | `useWishlistActions`, `normalizeForMatch()` | Reuse matching utility |

### New Migrations Required

```text
supabase/migrations/
├── 20251216_wishlist_unique_constraint.sql   # Duplicate detection
└── 20251216_wishlist_fuzzy_matching.sql      # Community matching function
```

### New Hooks Required

```text
hooks/
├── useInventoryView.ts         # URL-based view state management
├── useWishlist.ts              # Wishlist CRUD operations
└── useCommunityAvailability.ts # Fuzzy matching queries
```

### New Components Required

```text
components/wishlist/
├── WishlistToggle.tsx          # View switcher (Tabs component)
├── WishlistCard.tsx            # Wrapper for GearCard with context='wishlist'
├── CommunityAvailabilityPanel.tsx  # Shows fuzzy matches
└── MoveToInventoryButton.tsx   # Action button (or inline in GearCard)
```

---

## Testing Considerations

### Manual Test Scenarios

1. **Duplicate Detection**:
   - Try to add "Osprey Atmos 65" twice → should show error
   - Try to add "osprey atmos 65" (lowercase) after "Osprey Atmos 65" → should show error
   - Try to add "Osprey Atmos 65 AG" after "Osprey Atmos 65" → should succeed (different model)

2. **Fuzzy Matching**:
   - Add "Hilleberg Akto" to wishlist
   - Create fake user with "Hillberg Akto" (typo) in inventory marked for sale
   - Check community availability panel → should show match with ~0.8+ similarity

3. **View Switching**:
   - Switch to wishlist view → URL should update to `?view=wishlist`
   - Refresh page → should stay on wishlist view
   - Click browser back button → should return to inventory view
   - Open `/inventory?view=wishlist` in new tab → should show wishlist directly

4. **Component Reuse**:
   - Verify GearCard renders correctly in both inventory and wishlist contexts
   - Check that "Edit" button shows for inventory, "Move to Inventory" for wishlist
   - Test all three view densities (compact, standard, detailed) in both contexts

### Edge Cases

1. **Empty States**:
   - Empty wishlist → show "Add your first wishlist item" placeholder
   - No community matches → show "No matches found" message
   - All wishlist items already owned by user → still show in wishlist with note

2. **Concurrent Operations**:
   - Add item to wishlist while another tab adds same item → one succeeds, one gets duplicate error
   - Move item to inventory while viewing wishlist → item disappears from wishlist view

3. **Performance**:
   - 500 wishlist items → fuzzy matching should complete in < 3 seconds
   - Rapid view switching → no flash of wrong content, smooth transitions

---

## Future Enhancements (Out of Scope)

1. **Price Monitoring**: Stub sections added for future price alert features
2. **Advanced Matching**: Consider Levenshtein distance as secondary ranking metric
3. **Match Scoring**: Show similarity percentage to user (e.g., "85% match")
4. **Bulk Operations**: "Move all to inventory" or "Remove all" actions
5. **Wishlist Sharing**: Public/private wishlist URLs (similar to loadout sharing)
6. **Auto-match Notifications**: Email alerts when community gear matching wishlist becomes available

---

## Resolved Clarifications

All research areas have been evaluated with clear decisions. No open questions remain. Implementation can proceed to Phase 1 (data model and contracts).

**Key Takeaways**:
- ✅ Fuzzy matching: Use pg_trgm with 0.3 threshold
- ✅ Duplicate detection: Database unique constraint on normalized brand+name
- ✅ Component reuse: Context prop pattern with conditional rendering
- ✅ View state: URL search params with sessionStorage fallback

All decisions align with existing codebase patterns and constitution requirements. No new dependencies or architectural changes needed.
