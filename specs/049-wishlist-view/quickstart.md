# Quick Start Guide: Wishlist Implementation

**Feature**: 049-wishlist-view
**Date**: 2025-12-16
**Target**: Developers implementing the wishlist feature

## Prerequisites

Before starting, ensure you have:
- [x] Read `spec.md` - Feature specification
- [x] Read `plan.md` - Implementation plan
- [x] Read `data-model.md` - Database schema and types
- [x] Read contracts in `contracts/` - API contracts
- [ ] Familiarized with existing inventory system
- [ ] Supabase CLI installed (for migrations)
- [ ] Development environment running (`npm run dev`)

## Implementation Order

**CRITICAL**: Follow the constitution's spec-driven development workflow:
1. Types first (`@/types/wishlist.ts`)
2. Hooks second (`hooks/useWishlist.ts`, `hooks/useCommunityAvailability.ts`)
3. UI components last (`components/wishlist/*`)

---

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Create and Run Migration

```bash
# Create migration file
touch supabase/migrations/20251216_wishlist_functions.sql
```

**File content**: Copy SQL from `data-model.md` migration section (includes trigram extension, indexes, and functions)

```bash
# Apply migration to local Supabase
supabase db reset --local

# OR apply to production
supabase db push
```

**Verify**:
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
-- Should return 1 row

SELECT proname FROM pg_proc WHERE proname LIKE '%community%';
-- Should return 'find_community_availability'
```

### Step 1.2: Test Functions

```sql
-- Test fuzzy_match_gear function
SELECT fuzzy_match_gear('Osprey', 'Atmos 65', 'Osprey', 'Atmos 65 AG');
-- Should return ~0.85 (high similarity)

-- Test find_community_availability (replace UUIDs with real ones)
SELECT * FROM find_community_availability(
  '00000000-0000-0000-0000-000000000000'::UUID,  -- your user_id
  '00000000-0000-0000-0000-000000000001'::UUID   -- a wishlist item_id
);
```

---

## Phase 2: TypeScript Types (45 minutes)

### Step 2.1: Create Wishlist Types

**File**: `types/wishlist.ts`

Copy type definitions from `data-model.md` TypeScript Interfaces section.

**Key types**:
- `WishlistItem` (extends GearItem with status='wishlist')
- `CommunityAvailabilityMatch`
- `WishlistItemAvailability`
- `InventoryViewMode`
- `UseWishlistReturn`
- `UseCommunityAvailabilityReturn`

**Test**:
```bash
npm run build
# Should compile without errors
```

### Step 2.2: Create Validation Schemas

**File**: `lib/validations/wishlist.ts`

Copy Zod schemas from `data-model.md`:
- `addToWishlistSchema`
- `communityAvailabilityMatchSchema`

---

## Phase 3: Database Query Functions (1 hour)

### Step 3.1: Wishlist Queries

**File**: `lib/supabase/wishlist-queries.ts`

Implement all functions from `contracts/wishlist-queries.md`:
1. `fetchWishlistItems()`
2. `addWishlistItem()`
3. `updateWishlistItem()`
4. `deleteWishlistItem()`
5. `moveWishlistItemToInventory()`
6. `checkWishlistDuplicate()`

**Pattern**: Follow existing `lib/supabase/*.ts` files for consistency.

**Test each function**:
```typescript
// In browser console or test file
import { fetchWishlistItems, addWishlistItem } from '@/lib/supabase/wishlist-queries';

// Test fetch (should return empty array initially)
const items = await fetchWishlistItems();
console.log('Wishlist items:', items);

// Test add
const newItem = await addWishlistItem({
  name: 'Test Tent',
  brand: 'Test Brand',
  modelNumber: 'Model 123',
});
console.log('Added item:', newItem);
```

### Step 3.2: Community Matching Queries

**File**: `lib/supabase/community-matching.ts`

Implement functions from `contracts/community-matching.md`:
1. `fetchCommunityAvailability()`
2. `refreshCommunityAvailability()`
3. `fetchAvailabilityForItem()`

**Test**:
```typescript
import { fetchCommunityAvailability } from '@/lib/supabase/community-matching';

const availability = await fetchCommunityAvailability(['item-id-1', 'item-id-2']);
console.log('Availability:', availability);
```

---

## Phase 4: Custom Hooks (1.5 hours)

### Step 4.1: useWishlist Hook

**File**: `hooks/useWishlist.ts`

**Responsibilities**:
- Fetch wishlist items from Supabase
- Manage loading/error states
- Handle add/remove/update/move operations
- Implement search/filter/sort logic (reuse from useInventory)
- Provide duplicate checking

**Pattern to follow**: Study `hooks/useInventory.ts` and replicate structure for wishlist context.

**Key state**:
```typescript
const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
const [sortOption, setSortOption] = useState<SortOption>('dateAdded');
```

**Key functions**:
```typescript
async function addToWishlist(item) {
  // Check duplicate
  const duplicate = await checkWishlistDuplicate(item.brand, item.modelNumber);
  if (duplicate) {
    toast.warning('Item already in wishlist');
    return;
  }

  // Add to database
  const newItem = await addWishlistItem(item);

  // Update local state
  setWishlistItems(prev => [newItem, ...prev]);

  // Show success
  toast.success('Added to wishlist!');
}
```

### Step 4.2: useCommunityAvailability Hook

**File**: `hooks/useCommunityAvailability.ts`

**Responsibilities**:
- Fetch community matches for wishlist items
- Implement 5-minute TTL cache
- Handle loading/error states
- Provide refresh capability

**Cache structure**:
```typescript
interface CacheEntry {
  data: WishlistItemAvailability;
  fetchedAt: Date;
}

const cache = useRef(new Map<string, CacheEntry>());
```

**TTL logic**:
```typescript
function isStale(entry: CacheEntry): boolean {
  const now = new Date();
  const age = now.getTime() - entry.fetchedAt.getTime();
  return age > 5 * 60 * 1000; // 5 minutes
}
```

---

## Phase 5: UI Components (2 hours)

### Step 5.1: Wishlist Toggle

**File**: `components/wishlist/WishlistToggle.tsx`

**Purpose**: Tab control to switch between Inventory and Wishlist views

**Component**:
```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WishlistToggleProps {
  mode: InventoryViewMode;
  onModeChange: (mode: InventoryViewMode) => void;
  inventoryCount: number;
  wishlistCount: number;
}

export function WishlistToggle({ mode, onModeChange, inventoryCount, wishlistCount }: WishlistToggleProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as InventoryViewMode)}>
      <TabsList>
        <TabsTrigger value="inventory">
          My Gear ({inventoryCount})
        </TabsTrigger>
        <TabsTrigger value="wishlist">
          Wishlist ({wishlistCount})
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

### Step 5.2: Community Availability Panel

**File**: `components/wishlist/CommunityAvailabilityPanel.tsx`

**Purpose**: Shows matching community items on medium-sized wishlist cards

**Props**:
```typescript
interface CommunityAvailabilityPanelProps {
  wishlistItemId: string;
  matches: CommunityAvailabilityMatch[];
  isLoading: boolean;
  onViewItem: (itemId: string, ownerId: string) => void;
  onMessageUser: (userId: string) => void;
}
```

**UI Structure**:
- If loading: Skeleton loader
- If no matches: "Not available in community" message
- If matches: List of availability badges with quick actions

### Step 5.3: Price Stub Indicator

**File**: `components/wishlist/PriceStubIndicator.tsx`

**Purpose**: Placeholder for future price monitoring features

**Component**:
```tsx
export function PriceStubIndicator() {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        💰 Price monitoring coming soon
      </p>
    </div>
  );
}
```

### Step 5.4: Move to Inventory Button

**File**: `components/wishlist/MoveToInventoryButton.tsx`

**Purpose**: Transfer button in wishlist detail modal

**Component**:
```tsx
import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface MoveToInventoryButtonProps {
  itemId: string;
  itemName: string;
  onMove: (itemId: string) => Promise<void>;
}

export function MoveToInventoryButton({ itemId, itemName, onMove }: MoveToInventoryButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  async function handleMove() {
    setIsMoving(true);
    try {
      await onMove(itemId);
      toast.success(`${itemName} moved to inventory!`);
    } catch (error) {
      toast.error('Failed to move item');
    } finally {
      setIsMoving(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Button onClick={() => setShowConfirm(true)}>
        Move to Inventory
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        {/* Confirmation dialog */}
      </AlertDialog>
    </>
  );
}
```

---

## Phase 6: Integration (1 hour)

### Step 6.1: Update Inventory Page

**File**: `app/[locale]/inventory/page.tsx`

**Changes**:
1. Add `useState` for view mode (inventory vs wishlist)
2. Add `WishlistToggle` component at top
3. Conditionally render inventory or wishlist based on mode
4. Pass appropriate hook data to GalleryGrid

**Pseudocode**:
```tsx
export default function InventoryPage() {
  const [viewMode, setViewMode] = useState<InventoryViewMode>('inventory');

  const inventoryHook = useInventory();
  const wishlistHook = useWishlist();

  const activeHook = viewMode === 'inventory' ? inventoryHook : wishlistHook;

  return (
    <div>
      <WishlistToggle
        mode={viewMode}
        onModeChange={setViewMode}
        inventoryCount={inventoryHook.itemCount}
        wishlistCount={wishlistHook.itemCount}
      />

      <GalleryToolbar {...activeHook} />

      <GalleryGrid
        items={activeHook.filteredItems}
        viewDensity={activeHook.viewDensity}
        mode={viewMode}  // Pass mode to customize cards
      />
    </div>
  );
}
```

### Step 6.2: Extend GearCard Component

**File**: `components/inventory-gallery/GearCard.tsx`

**Changes**:
1. Add optional `mode` prop (inventory | wishlist)
2. Conditionally hide availability markers when mode='wishlist'
3. Add CommunityAvailabilityPanel for medium cards when mode='wishlist'
4. Add PriceStubIndicator for medium cards when mode='wishlist'

---

## Phase 7: Testing (1 hour)

### Manual Testing Checklist

**Basic Functionality**:
- [ ] Add item to wishlist
- [ ] View wishlist items in all three card sizes
- [ ] Search wishlist items
- [ ] Filter wishlist items by category
- [ ] Sort wishlist items (name, category, date)
- [ ] Edit wishlist item
- [ ] Delete wishlist item
- [ ] Move item to inventory

**Community Availability**:
- [ ] Community matches appear on medium cards
- [ ] Similarity scores are reasonable
- [ ] "View Item" action opens correct item
- [ ] "Message User" action opens messaging
- [ ] No matches shows appropriate message
- [ ] Manual refresh works

**Duplicate Detection**:
- [ ] Adding duplicate item shows warning
- [ ] Duplicate detection is case-insensitive
- [ ] Can add items with different brands

**Edge Cases**:
- [ ] Empty wishlist shows appropriate message
- [ ] Loading states display correctly
- [ ] Error states are handled gracefully
- [ ] Moving item updates both views
- [ ] Stub sections are clearly marked

---

## Debugging Tips

### Common Issues

**1. Migration fails**:
```bash
# Check existing extensions
SELECT * FROM pg_extension;

# Drop and recreate if needed
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION pg_trgm;
```

**2. RPC function not found**:
```sql
-- List all functions
SELECT proname FROM pg_proc WHERE proname LIKE '%wishlist%';

-- Check function permissions
\df+ find_community_availability
```

**3. Fuzzy matching returns no results**:
```sql
-- Test similarity threshold
SELECT similarity('osprey atmos', 'osprey atmos ag');
-- If < 0.3, adjust threshold in function

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'gear_items';
```

**4. TypeScript errors**:
```bash
# Regenerate types from Supabase
npx supabase gen types typescript --local > types/supabase.ts

# Check import paths
npm run build
```

---

## Performance Verification

### Benchmarking

**Test 1: View Switching**:
```typescript
console.time('view-switch');
setViewMode('wishlist');
// Wait for render
console.timeEnd('view-switch');
// Target: < 2 seconds
```

**Test 2: Community Availability**:
```typescript
console.time('community-availability');
const matches = await fetchCommunityAvailability(itemIds);
console.timeEnd('community-availability');
// Target: < 3 seconds
```

**Test 3: Search Performance**:
```typescript
console.time('search');
setSearchQuery('osprey');
// Wait for filtered results
console.timeEnd('search');
// Target: < 2 seconds for 500 items
```

---

## Next Steps After Implementation

1. **Code Review**: Run through constitution check again
2. **Documentation**: Update CLAUDE.md with new patterns
3. **User Testing**: Get feedback on UX flows
4. **Analytics**: Add tracking for wishlist usage
5. **Future Features**: Plan price monitoring implementation

---

## Need Help?

- **Spec unclear?**: Re-read `spec.md` and `plan.md`
- **Constitution violation?**: Review constitution.md principles
- **Stuck on implementation?**: Check existing inventory code patterns
- **Database issues?**: Check Supabase logs and RLS policies
- **TypeScript errors?**: Verify all types are imported correctly
