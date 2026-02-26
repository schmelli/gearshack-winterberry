# Inventory Gallery

**Status**: ✅ Active
**Features**: 002-inventory-gallery, 046-inventory-sorting, 049-wishlist-view, 045-gear-detail-modal
**Primary Hook**: `hooks/useInventory.ts`, `hooks/useGearItems.ts`
**Database**: `gear_items` table

## Overview

Das Inventory Gallery ist die zentrale Ansicht für die Gear-Sammlung des Benutzers. Es bietet eine visuelle Galerie zum Durchsuchen, Filtern, Sortieren und Verwalten von Gear Items.

### Core Features
- Visuelle Galerie-Ansicht mit Karten-Layout
- Dual-View-Modus: Inventory (eigene Items) & Wishlist (gewünschte Items)
- Flexible View Density (Compact, Standard, Detailed)
- Suche nach Name und Marke (case-insensitive)
- Kategorie-basierte Filterung
- 5 Sortier-Optionen mit visuellen Gruppierungen
- Gear Detail Modal mit YouTube-Reviews und GearGraph-Insights
- Real-time Updates (optional)
- Session Storage Persistenz für View-Einstellungen

---

## Core Concepts

### Gear Item Structure

```typescript
interface GearItem {
  // Identity
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Section 1: General Info
  name: string;
  brand: string | null;
  description: string | null;
  brandUrl: string | null;
  modelNumber: string | null;
  productUrl: string | null;

  // Section 2: Classification (Cascading Category Refactor)
  productTypeId: string | null;  // Level 3 (Product Type)

  // Section 3: Weight & Specifications
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;  // 'g' | 'oz' | 'lb'
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  size: string | null;            // For clothing, footwear
  color: string | null;
  volumeLiters: number | null;    // For packs, bags
  materials: string | null;
  tentConstruction: string | null;

  // Section 4: Purchase Details
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  retailerUrl: string | null;
  manufacturerPrice: number | null;
  manufacturerCurrency: string | null;

  // Section 5: Media
  primaryImageUrl: string | null;
  galleryImageUrls: string[];
  nobgImages?: NobgImages;       // Processed images (background removed)

  // Section 6: Status & Condition
  condition: 'new' | 'used' | 'worn';
  status: 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';
  notes: string | null;
  quantity: number;               // Default: 1
  isFavourite: boolean;
  isForSale: boolean;
  canBeBorrowed: boolean;
  canBeTraded: boolean;

  // Section 7: Merchant Source Attribution (Feature 053)
  sourceMerchantId: string | null;
  sourceOfferId: string | null;
  sourceLoadoutId: string | null;

  // Section 8: VIP Source Attribution (Feature 052)
  sourceAttribution?: {
    type: string;
    url?: string;
    checkedAt?: string;
  } | null;

  // Section 9: Dependencies (Feature 037)
  dependencyIds: string[];        // Related gear IDs
}
```

**Key Insight**: `productTypeId` ist die einzige gespeicherte Kategorie-Referenz (Level 3). Parent-Kategorien (Level 1: Category, Level 2: Subcategory) werden client-seitig über `getParentCategoryIds()` abgeleitet (Cascading Category Refactor).

### Nobg Images (Background Removal)

Processed images from Cloud Functions (Feature 019-image-perfection):

```typescript
interface NobgImage {
  png: string;      // PNG URL (required)
  webp?: string;    // WebP URL (optional, future optimization)
}

interface NobgImages {
  [size: string]: NobgImage;  // e.g., { "512": { png: "..." }, "1024": { png: "..." } }
}
```

---

## User Interface

### Main Layout

**Route**: `/[locale]/inventory`

**Structure**:
```
Header (fixed)
  ├─ Search Bar
  ├─ View Mode Toggle (Inventory / Wishlist)
  └─ Action Buttons (Add Item, Filters, Sort, Density)

Gallery Grid
  ├─ Category Groups (when sorting by category/brand/productType)
  │   ├─ Group Header (e.g., "Shelter")
  │   └─ Item Cards
  └─ Flat List (when sorting by name/dateAdded)

Gear Detail Modal (Sheet on mobile)
  ├─ Image Gallery
  ├─ Specifications
  ├─ YouTube Reviews
  ├─ GearGraph Insights
  └─ Actions (Edit, Delete, Move to Wishlist)
```

### View Density Options

**3 Density-Stufen** (Feature 002):

```typescript
type ViewDensity = 'compact' | 'standard' | 'detailed';
```

**Compact**:
- Image, Brand, Name only
- Minimal information
- Quick scanning (50% more items visible)

**Standard** (Default):
- + Category, Weight, Status Badge
- Balanced view
- Best for most users

**Detailed**:
- + Notes snippet (first 60 characters)
- Maximum information
- Best for detailed analysis

**Persistence**: Session Storage (`gearshack-view-density`)

### Dual View Mode

**Inventory View** (`status='own'`):
- Gear items you currently own
- Full CRUD operations
- Default view

**Wishlist View** (`status='wishlist'`, Feature 049):
- Gear items you want to buy
- Can be moved to inventory (one-click purchase)
- Limited sorting options (name, category, dateAdded)

**Switching**:
```tsx
<Tabs value={viewMode} onValueChange={setViewMode}>
  <TabsList>
    <TabsTrigger value="inventory">Inventory ({inventoryCount})</TabsTrigger>
    <TabsTrigger value="wishlist">Wishlist ({wishlistCount})</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## Filtering & Search

### Search Functionality

**Case-insensitive fuzzy search** on:
- Item name (`item.name`)
- Brand name (`item.brand`)

```typescript
const matchesSearch =
  !searchQuery ||
  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.brand?.toLowerCase().includes(searchQuery.toLowerCase());
```

**UI**: Search input with debounce (300ms) for performance.

### Category Filter

**Filter by Level 1 Category** (e.g., "Shelter", "Sleep System", "Backpack"):

```typescript
const matchesCategory = !categoryFilter || (() => {
  if (!item.productTypeId) return false;

  // Get parent categoryId (Level 1) from productTypeId (Level 3)
  const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
  return categoryId === categoryFilter;
})();
```

**UI**: Dropdown mit allen Level 1 Kategorien + "All Categories" Option.

**Note**: Verwendet Cascading Category Refactor - nur `productTypeId` ist gespeichert, parent IDs werden client-seitig berechnet.

---

## Sorting (Feature 046)

### Sort Options

```typescript
type SortOption = 'name' | 'category' | 'brand' | 'productType' | 'dateAdded';
```

**5 Sortier-Optionen**:

1. **Name** (`name`):
   - Alphabetisch A-Z
   - Flat list (keine Gruppen)
   - Use case: "Ich suche mein Zelt"

2. **Category** (`category`):
   - Gruppiert nach Level 1 Kategorie
   - Visuelle Separatoren zwischen Gruppen
   - Items innerhalb der Gruppe alphabetisch
   - Use case: "Wie viele Shelter-Items habe ich?"

3. **Brand** (`brand`):
   - Gruppiert nach Marke
   - Items ohne Marke am Ende ("No Brand")
   - Items innerhalb der Gruppe alphabetisch
   - Use case: "Welche Zpacks-Produkte besitze ich?"

4. **Product Type** (`productType`):
   - Gruppiert nach Level 3 Product Type
   - Visuelle Separatoren zwischen Gruppen
   - Items innerhalb der Gruppe alphabetisch
   - Use case: "Zeige mir alle Tents (nicht Tarps)"

5. **Date Added** (`dateAdded`, Default):
   - Neueste zuerst
   - Flat list (keine Gruppen)
   - Use case: "Was habe ich zuletzt hinzugefügt?"

**Persistence**: Session Storage (`gearshack-sort-option`)

### Grouped Display

**Wenn `sortOption` in `['category', 'brand', 'productType']`**, werden Items in Gruppen dargestellt:

```tsx
{groupedItems.map((group) => (
  <div key={group.categoryId}>
    <h3>{group.categoryLabel}</h3>  {/* Group Header */}
    <div className="grid">
      {group.items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  </div>
))}
```

**Algorithmus**:
1. Filtern (search + category)
2. Sortieren nach gewählter Option
3. Gruppieren (nur bei category/brand/productType)
4. Gruppen alphabetisch sortieren (uncategorized/no brand am Ende)

---

## State Management

### Zustand Store (`useSupabaseStore`)

**Location**: `hooks/useSupabaseStore.ts`

**Structure**:
```typescript
interface SupabaseState {
  // Gear Items
  items: GearItem[];
  addItem: (item: Partial<GearItem>) => Promise<string>;
  updateItem: (id: string, updates: Partial<GearItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Sync State
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
}
```

**Key Features**:
- Optimistic updates (UI sofort, Rollback bei Fehler)
- Supabase Real-time subscriptions (optional)
- Offline-ready (future: PersistMiddleware)

### useInventory Hook (View Logic)

**Location**: `hooks/useInventory.ts`

**Responsibilities**:
- View Density State (sessionStorage persistence)
- Sort Option State (sessionStorage persistence)
- Filter State (search query, category filter)
- Filtered + Sorted Items (computed)
- Grouped Items (computed, nur bei category/brand/productType)
- Auto-retry logic für Category Loading (exponential backoff: 1s, 2s, 4s)

**Return Type**:
```typescript
interface UseInventoryReturn {
  // Data
  items: GearItem[];
  filteredItems: GearItem[];
  isLoading: boolean;

  // View Density
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  clearFilters: () => void;

  // Sorting
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  groupedItems: CategoryGroup[];  // Only populated when sorted by category/brand/productType

  // Derived State
  hasActiveFilters: boolean;
  itemCount: number;
  filteredCount: number;

  // Category utilities
  getCategoryLabel: (categoryId: string | null) => string;
  categoryOptions: CategoryOption[];
  refreshCategories: () => Promise<void>;

  // Error state
  categoriesError: string | null;
}
```

**Performance Optimization**:
- `useMemo` für filtered/sorted/grouped items
- Session Storage für persistence (kein unnecessary re-render)
- Lazy loading von Categories (nur wenn benötigt)

---

## CRUD Operations

### Create (useGearEditor)

**Flow**:
1. User klickt "Add Item"
2. Navigate to `/inventory/new`
3. Form ausfüllen (react-hook-form + Zod validation)
4. **Image Import** (falls externe URL):
   - Upload zu Cloudinary via `uploadToCloudinary()`
   - Server-side fetch (bypasses CORS)
   - Toast feedback ("Importing image...")
5. **Duplicate Detection** (Feature XXX):
   - Check name + brand gegen existierende Items
   - Dialog zeigen bei >70% Ähnlichkeit
   - Option: "Increase Quantity" statt neues Item
6. **Save**:
   - `addItem(itemData)` → Optimistic Update
   - Supabase INSERT
   - Fire-and-forget Contribution Tracking
7. Navigate back to `/inventory`

**Validation** (Zod):
```typescript
const gearItemFormSchema = z.object({
  name: z.string().min(1, 'Name required').max(200),
  brand: z.string().max(100).optional(),
  weightValue: z.string().optional(),
  // ... 30+ fields
});
```

### Read (useGearItems)

**Fetch all items**:
```typescript
const { data } = await supabase
  .from('gear_items')
  .select('*')  // Explicit column list (86 lines!)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Transformer** (`gearItemFromDb`):
- Converts snake_case DB columns → camelCase TypeScript
- Parses JSON columns (`nobgImages`, `sourceAttribution`)
- Converts timestamps → Date objects

**Optional Real-time**:
```typescript
const { items } = useGearItems(userId, { realtime: true });
```

→ Auto-subscribes zu `postgres_changes` via Supabase Realtime
→ Updates local state bei INSERT/UPDATE/DELETE events

### Update (useGearEditor)

**Flow**:
1. User klickt Item Card → Gear Detail Modal
2. Klick "Edit" → Navigate to `/inventory/{id}/edit`
3. Form prefilled mit existierenden Daten
4. Änderungen vornehmen
5. **Save**:
   - `updateItem(id, updates)` → Optimistic Update
   - Supabase UPDATE (mit `user_id` safety check)
   - Fire-and-forget Contribution Tracking
6. Navigate back to `/inventory`

**Optimistic Update Pattern**:
```typescript
async function updateItem(id: string, updates: Partial<GearItem>) {
  // 1. Optimistic UI update
  set((state) => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  }));

  try {
    // 2. Actual DB update
    const { error } = await supabase
      .from('gear_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    // 3. Rollback on error
    await fetchItems();  // Refetch to restore correct state
    toast.error('Update failed');
    throw error;
  }
}
```

### Delete (useGearEditor)

**Flow**:
1. User klickt "Delete" in Gear Detail Modal oder Edit Page
2. Confirmation Dialog: "Are you sure?"
3. **Delete**:
   - `deleteItem(id)` → Optimistic Remove
   - Supabase DELETE (mit `user_id` safety check)
4. Toast: "Item deleted"
5. Navigate back to `/inventory`

**Safety**:
- Confirmation required
- Extra `user_id` check (RLS policy + app-level)
- Optimistic removal mit Rollback bei Fehler

---

## Gear Detail Modal (Feature 045)

### Overview

**Modal (Desktop) / Sheet (Mobile)** zur Anzeige voller Item-Details inkl. YouTube-Reviews und GearGraph-Insights.

**Route**: `/inventory?modal={itemId}`
**State**: URL-basiert (via `useSearchParams`)

### Structure

```
[Hero Image]

[Specifications Grid]
- Weight, Volume, Materials, etc.

[YouTube Reviews Section]
- 3 relevante Videos
- "Show all reviews" → erweiterte Suche

[GearGraph Insights]
- Similar Items von anderen Usern
- Weight comparison
- Price comparison
- "Add to Wishlist" / "Add to Inventory"

[Actions]
- Edit | Delete | Share | Move to Wishlist
```

### YouTube Reviews Hook

**Location**: `hooks/useYouTubeReviews.ts`

**Suche nach**:
```typescript
const query = `${brand} ${name} review`;  // e.g., "Zpacks Duplex review"
```

**Features**:
- Max 3 videos (default)
- Quota tracking (10,000 units/day)
- Retry mechanism bei Fehler
- Graceful degradation (kein Blocking bei API-Fehler)

**Quota Exhaustion**:
→ Zeige "YouTube API quota exhausted. Try again tomorrow." Message
→ User kann weiterhin Modal nutzen (nur Videos fehlen)

### GearGraph Insights Hook

**Location**: `hooks/useGearInsights.ts`

**Query**:
```typescript
const { insights } = useGearInsights({
  productTypeId: item.productTypeId,
  brand: item.brand,
  name: item.name,
  enabled: modalOpen && !!item,
});
```

**Insights Types**:
1. **Similar Items** - Andere User mit gleichen/ähnlichen Items
2. **Weight Comparison** - Ist mein Item leichter/schwerer als Durchschnitt?
3. **Price Comparison** - Ist mein Preis gut?
4. **Alternatives** - Leichtere/billigere Alternativen

**Dismissal**:
- User kann Insights dauerhaft dismissen
- Gespeichert in `dismissed_insights` table

---

## Database Schema

### gear_items Table

**Core Columns** (simplified):
```sql
CREATE TABLE gear_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- General Info
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  brand_url TEXT,
  model_number TEXT,
  product_url TEXT,

  -- Classification (Cascading Category Refactor)
  product_type_id TEXT,  -- Level 3 (Product Type), e.g., "tent", "sleeping_bag"

  -- Weight & Specs
  weight_grams NUMERIC,
  weight_display_unit TEXT DEFAULT 'g',  -- 'g' | 'oz' | 'lb'
  length_cm NUMERIC,
  width_cm NUMERIC,
  height_cm NUMERIC,
  size TEXT,
  color TEXT,
  volume_liters NUMERIC,
  materials TEXT,
  tent_construction TEXT,

  -- Purchase Details
  price_paid NUMERIC,
  currency TEXT,
  purchase_date DATE,
  retailer TEXT,
  retailer_url TEXT,
  manufacturer_price NUMERIC,
  manufacturer_currency TEXT,

  -- Media
  primary_image_url TEXT,
  gallery_image_urls TEXT[],
  nobg_images JSONB,

  -- Status & Condition
  condition TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'used' | 'worn'
  status TEXT NOT NULL DEFAULT 'own',     -- 'own' | 'wishlist' | 'sold' | 'lent' | 'retired'
  notes TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_favourite BOOLEAN NOT NULL DEFAULT false,
  is_for_sale BOOLEAN NOT NULL DEFAULT false,
  can_be_borrowed BOOLEAN NOT NULL DEFAULT false,
  can_be_traded BOOLEAN NOT NULL DEFAULT false,

  -- Source Attribution
  source_merchant_id UUID,
  source_offer_id UUID,
  source_loadout_id UUID,

  -- Dependencies
  dependency_ids UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Indexes
CREATE INDEX idx_gear_items_user_id ON gear_items(user_id);
CREATE INDEX idx_gear_items_status ON gear_items(status);
CREATE INDEX idx_gear_items_product_type_id ON gear_items(product_type_id);
CREATE INDEX idx_gear_items_created_at ON gear_items(created_at DESC);

-- Updated At Trigger
CREATE TRIGGER update_gear_items_updated_at
  BEFORE UPDATE ON gear_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
-- Users can only view their own items
CREATE POLICY "Users can view own gear items" ON gear_items
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own items
CREATE POLICY "Users can insert own gear items" ON gear_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own items
CREATE POLICY "Users can update own gear items" ON gear_items
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own items
CREATE POLICY "Users can delete own gear items" ON gear_items
  FOR DELETE USING (user_id = auth.uid());
```

---

## Performance Optimization

### Filtering & Sorting Performance

**Challenge**: Mit 1000+ Items kann Filtering/Sorting langsam werden.

**Solution**: `useMemo` für alle computed values:
```typescript
const filteredItems = useMemo(() => {
  // Filter logic
}, [items, searchQuery, categoryFilter, categoriesLoading, categoriesError, categories]);

const groupedItems = useMemo<CategoryGroup[]>(() => {
  // Grouping logic
}, [filteredItems, sortOption, getLabelById, categories]);
```

**Debounce**: Search input mit 300ms debounce.

### Image Loading

**Cloudinary Optimization**:
- Automatic format conversion (WebP für moderne Browser)
- Responsive image sizes via `c_scale`
- Lazy loading mit `loading="lazy"`

**Example**:
```tsx
<Image
  src={item.primaryImageUrl}
  alt={item.name}
  width={300}
  height={300}
  className="object-cover"
  loading="lazy"
/>
```

### Virtual Scrolling (Future)

Für User mit 1000+ Items:
- Use `react-virtuoso` für windowing
- Nur sichtbare Items rendern
- Geschätzte Render-Zeit: 16ms statt 800ms

---

## Real-time Subscriptions (Optional)

### Activation

```typescript
const { items } = useGearItems(userId, { realtime: true });
```

### Implementation

**Pattern**: Supabase Real-time Channels

```typescript
const channel = supabase
  .channel(`gear_items:${userId}`)
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'gear_items',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      switch (eventType) {
        case 'INSERT':
          setItems((prev) => [gearItemFromDb(newRow), ...prev]);
          break;
        case 'UPDATE':
          setItems((prev) =>
            prev.map((item) =>
              item.id === newRow.id ? gearItemFromDb(newRow) : item
            )
          );
          break;
        case 'DELETE':
          setItems((prev) => prev.filter((item) => item.id !== oldRow.id));
          break;
      }
    }
  )
  .subscribe();
```

**Use Cases**:
- Multi-device editing (sync between devices)
- Team-based gear management (future feature)

**Trade-offs**:
- ✅ Instant updates (0-200ms latency)
- ✅ No manual refresh needed
- ❌ Extra database connections (pooler required)
- ❌ Slightly more complex cleanup logic

**Current Status**: Disabled by default (Performance > Instant sync)

---

## Error Handling

### Category Loading Errors

**Problem**: Categories are essential für Filtering/Sorting. Wenn sie nicht laden, ist die UI broken.

**Solution**: Auto-retry mit exponential backoff

```typescript
const retryCountRef = useRef(0);
const MAX_RETRIES = 3;

useEffect(() => {
  if (categoriesError && retryCountRef.current < MAX_RETRIES) {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

    const timerId = setTimeout(() => {
      refreshCategories();
      retryCountRef.current += 1;
    }, delay);

    return () => clearTimeout(timerId);  // Cleanup
  }

  // Reset retry count on success
  if (!categoriesError && !categoriesLoading) {
    retryCountRef.current = 0;
  }
}, [categoriesError, categoriesLoading, refreshCategories]);
```

**User Experience**:
- Retry 1: 1s Delay → "Retrying..." (silent)
- Retry 2: 2s Delay → "Retrying..." (silent)
- Retry 3: 4s Delay → "Retrying..." (silent)
- After 3 retries: Toast "Failed to load categories. Please refresh."

### Image Import Errors

**Problem**: Externe Images (z.B. von Serper) können CORS-Fehler verursachen.

**Solution**: Server-side proxy via Cloudinary

```typescript
try {
  const cloudinaryUrl = await uploadToCloudinary(externalUrl, {
    userId: user.uid,
    itemId: item.id,
  });
  data.primaryImageUrl = cloudinaryUrl;
  toast.success('Image imported successfully');
} catch (error) {
  console.error('Image import failed:', error);
  toast.error(`Failed to import image: ${error.message}`);
  return;  // Don't proceed with save if import fails
}
```

**User Experience**:
- Show "Importing image..." toast während Upload
- Bei Fehler: Clear error message + don't save
- User kann manuell andere URL probieren oder hochladen

### Duplicate Detection Errors

**Problem**: Beim Speichern kann es sein, dass ein Item bereits existiert (z.B. gleicher Name + Brand).

**Solution**: Client-side fuzzy matching vor dem Save

```typescript
const hasDuplicates = duplicateDetection.checkForDuplicates(
  formData,
  initialItem?.id  // Exclude current item when editing
);

if (hasDuplicates) {
  // Show dialog with options:
  // 1. Save anyway
  // 2. Increase quantity of existing item
  // 3. Cancel
  return;
}
```

**Algorithmus**:
- Levenshtein distance für Name (threshold: 0.7)
- Exact match für Brand
- Bei >70% Ähnlichkeit → Dialog

---

## Integration Points

### AI Assistant

Der AI Assistant hat Zugriff auf das Inventory via `queryUserData` Tool:

**Example Queries**:
```
"Zeige mir alle meine Shelter-Items"
"Wie schwer ist mein gesamtes Inventory?"
"Welche Marken habe ich am meisten?"
"Ich habe ein Zelt mit 1200g Gewicht und brauche ein leichteres"
```

**Tool**: `queryUserData({ source: 'gear_items', filter: '...' })`

### GearGraph Analytics

Inventory-Daten fließen in GearGraph für:
- Weight trends über Zeit
- Brand preferences
- Price analysis
- Category distribution

**Tool**: `queryGearGraph({ query: '...' })`

### Loadouts

Gear Items können zu Loadouts hinzugefügt werden:

```typescript
await addItemToLoadout(loadoutId, gearItemId, { quantity: 1, isWorn: false });
```

→ Erstellt Junction in `loadout_items` table
→ Updates Loadout `total_weight` und `item_count`

### Shakedowns (Community)

Loadouts können für Expert-Feedback geteilt werden:
→ Erstellt Shakedown Request
→ Community gibt Feedback
→ Vorgeschlagene Optimierungen direkt anwendbar

**Route**: `/community/shakedowns/new?loadout={loadoutId}`

---

## Accessibility

### Keyboard Navigation

- `Tab`: Navigate durch Items
- `Enter`: Open Gear Detail Modal
- `Esc`: Close Modal
- `Arrow Keys`: Navigate in Modal

### Screen Reader Support

**Live Region Announcements**:
```tsx
<div
  role="status"
  aria-live={announcement.politeness}
  aria-atomic="true"
  className="sr-only"
>
  {announcement.message}
</div>
```

**Announcements**:
- "Filter applied: 12 items found" (polite)
- "Item deleted" (assertive)
- "Item added to wishlist" (polite)

### Focus Management

**Modal Open**:
1. Focus trappt in Modal (react-focus-lock)
2. First focusable element = Close button
3. `Tab` cycle nur innerhalb Modal

**Modal Close**:
1. Focus kehrt zurück zum Trigger (Item Card)

---

## Future Improvements

- [ ] **Virtual Scrolling** für 1000+ Items
- [ ] **Bulk Operations** (multi-select delete, category change)
- [ ] **Offline Support** (Service Worker + IndexedDB)
- [ ] **Advanced Filters** (weight range, price range, condition, status)
- [ ] **Custom Sort Orders** (user-defined via drag-drop)
- [ ] **Quick Actions** (swipe to delete, long-press for context menu)
- [ ] **Export** (CSV, JSON, PDF)
- [ ] **Import** (CSV, Lighterpack, GearLab)
- [ ] **Image Gallery** (fullscreen slideshow)
- [ ] **Voice Search** (speech-to-text für Search)

---

## Best Practices

### Creating Items

1. **Use Product Search** (Serper API) für auto-fill statt manuelle Eingabe
2. **Add Image** früh (visuelles Browsing essentiell)
3. **Classify correctly** (wähle spezifischsten Product Type)
4. **Add Weight** (wichtig für Loadouts)
5. **Save before closing** (unsaved changes warning)

### Organizing Inventory

1. **Archive sold items** (status: 'sold') statt löschen
2. **Use Favourite** für häufig verwendete Items
3. **Add Notes** für wichtige Details (Baujahr, Garantie, etc.)
4. **Link Dependencies** (z.B. Paddel + Packraft)
5. **Update regularly** (Condition, Weight nach Nutzung)

---

## Related Docs

- [Database Schema](../architecture/database-schema.md)
- [Tech Stack](../architecture/tech-stack.md)
- [Loadout Management](loadout-management.md)
- [AI Assistant](ai-assistant.md)
- [Wishlist View](wishlist-view.md)

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**Users**: ~800 active users, ~12,000 total items tracked
**Performance**: Average page load <200ms, 95th percentile <500ms
