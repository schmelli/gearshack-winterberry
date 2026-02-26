# Loadout Management

**Status**: ✅ Active
**Features**: 005-loadout-management, 006-ui-makeover, 047-loadout-creation-form, 048-ai-loadout-image-gen
**Primary Hook**: `hooks/useLoadouts.ts`
**Database**: `loadouts`, `loadout_items` tables

## Overview

Loadouts (also called "pack lists" or "gear configs") are curated collections of gear items for specific trips or activities. Users can:
- Create multiple loadouts for different scenarios
- Track total weight and cost
- Visualize weight distribution by category
- Generate AI hero images
- Share publicly or keep private
- Filter by season and activity type

---

## Core Concepts

### Loadout Structure

```typescript
interface Loadout {
  id: string;
  user_id: string;
  name: string;
  description?: string;

  // Context
  seasons: Season[];  // ['summer', 'fall']
  activity_types: ActivityType[];  // ['hiking', 'backpacking']
  trip_duration_days?: number;

  // Hero image
  hero_image_url?: string;
  hero_image_id?: string;  // Links to generated_images

  // Computed stats
  total_weight: number;  // grams (sum of all items * quantity)
  total_cost: number;    // sum of all items * quantity
  item_count: number;    // total items (including quantities)

  // Sharing
  is_public: boolean;
  share_token?: string;  // For public URL sharing

  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

### Loadout Item (Junction)

```typescript
interface LoadoutItem {
  id: string;
  loadout_id: string;
  gear_item_id: string;

  // Quantity and worn status
  quantity: number;        // Default: 1
  is_worn: boolean;        // Worn items don't count toward pack weight

  // Category override (can differ from item's main category)
  category?: string;

  // Notes specific to this loadout
  notes?: string;

  // Display order
  sort_order: number;

  created_at: Date;
}
```

**Key Insight**: `is_worn` flag means the item is worn on the body (shoes, clothing) and doesn't count toward **pack weight** but is included in **total weight**.

---

## Weight Calculation

### Pack Weight vs Total Weight

**Total Weight** = All items (worn + carried)
**Pack Weight** = Only carried items (excludes worn)

```typescript
function calculateWeights(items: LoadoutItemWithGear[]) {
  let totalWeight = 0;
  let packWeight = 0;

  for (const item of items) {
    const itemWeight = (item.gear_item.weight || 0) * item.quantity;
    totalWeight += itemWeight;

    if (!item.is_worn) {
      packWeight += itemWeight;
    }
  }

  return { totalWeight, packWeight };
}
```

**Example**:
```
Backpack: 850g (carried) ✓
Tent: 1200g (carried) ✓
Shoes: 600g (worn) ✗ (not in pack weight)
Jacket: 450g (worn) ✗

Total Weight: 3100g
Pack Weight: 2050g (850 + 1200)
```

### Weight by Category

Used for donut chart visualization:

```typescript
function getWeightByCategory(items: LoadoutItemWithGear[]) {
  const categories = new Map<string, number>();

  for (const item of items) {
    const category = item.category || item.gear_item.category;
    const weight = (item.gear_item.weight || 0) * item.quantity;

    categories.set(
      category,
      (categories.get(category) || 0) + weight
    );
  }

  return Array.from(categories.entries()).map(([name, weight]) => ({
    name,
    weight,
    percentage: (weight / totalWeight) * 100
  }));
}
```

---

## User Interface

### Loadouts Gallery

**Route**: `/[locale]/loadouts`

**Features**:
- Grid view of all loadouts
- Search by name
- Filter by season/activity
- Sort by weight/date/name
- Quick stats (weight, items, cost)

**Components**:
- `LoadoutsGallery.tsx` - Main gallery container
- `LoadoutCard.tsx` - Individual loadout card
- `LoadoutFilters.tsx` - Search + filters

### Loadout Detail

**Route**: `/[locale]/loadouts/[id]`

**Sections**:

1. **Hero Image** (top)
   - AI-generated or fallback
   - Action buttons (Edit, Share, Delete)

2. **Stats Bar**
   - Total weight
   - Pack weight
   - Item count
   - Total cost

3. **Weight Distribution** (Donut Chart)
   - Visual breakdown by category
   - Hover for details
   - Click to filter

4. **Items List** (Table)
   - Sortable columns
   - Quantity input
   - Worn checkbox
   - Delete button

5. **Trip Context** (Card)
   - Seasons, activities
   - Trip duration
   - Description

**Components**:
- `LoadoutDetailPage.tsx` - Page wrapper
- `LoadoutHeroImage.tsx` - Hero image section
- `LoadoutStatsBar.tsx` - Stats display
- `LoadoutWeightChart.tsx` - Donut chart (Recharts)
- `LoadoutItemsTable.tsx` - Items table
- `LoadoutContextCard.tsx` - Trip info

### Create/Edit Loadout

**Route**: `/[locale]/loadouts/new` or `/[locale]/loadouts/[id]/edit`

**Form Fields**:
```typescript
{
  name: string;             // Required
  description: string;      // Optional
  seasons: Season[];        // Multi-select
  activity_types: ActivityType[];  // Multi-select
  trip_duration_days: number;      // Optional
  is_public: boolean;       // Toggle
}
```

**Seasons**: spring, summer, fall, winter (multi-select)
**Activities**: hiking, backpacking, climbing, camping, skiing, cycling, running, ultralight, fastpacking

**Validation** (Zod):
```typescript
const loadoutSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  description: z.string().max(500).optional(),
  seasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).min(1),
  activity_types: z.array(z.string()).min(1),
  trip_duration_days: z.number().int().min(1).max(365).optional(),
  is_public: z.boolean(),
});
```

**Components**:
- `LoadoutForm.tsx` - Form with react-hook-form
- `SeasonSelector.tsx` - Multi-select for seasons
- `ActivitySelector.tsx` - Multi-select for activities

---

## State Management

### Zustand Store

**Location**: `hooks/useLoadouts.ts`

**State**:
```typescript
interface LoadoutsState {
  // Data
  loadouts: Loadout[];
  loadoutItems: Map<string, LoadoutItemWithGear[]>;  // loadoutId → items

  // UI State
  selectedLoadoutId: string | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  fetchLoadouts: () => Promise<void>;
  fetchLoadoutItems: (loadoutId: string) => Promise<void>;
  createLoadout: (data: CreateLoadoutInput) => Promise<Loadout>;
  updateLoadout: (id: string, updates: Partial<Loadout>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  addItemToLoadout: (loadoutId: string, itemId: string, quantity?: number) => Promise<void>;
  removeItemFromLoadout: (loadoutId: string, itemId: string) => Promise<void>;
  updateLoadoutItem: (id: string, updates: Partial<LoadoutItem>) => Promise<void>;
}
```

**Persistence**: Zustand persist middleware (localStorage)

### Optimistic Updates

```typescript
async function updateLoadout(id: string, updates: Partial<Loadout>) {
  // Optimistic update
  set((state) => ({
    loadouts: state.loadouts.map(l =>
      l.id === id ? { ...l, ...updates } : l
    )
  }));

  try {
    // Actual update
    const { error } = await supabase
      .from('loadouts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    // Rollback on error
    await fetchLoadouts();  // Refetch to restore correct state
    toast.error('Update failed');
    throw error;
  }
}
```

---

## Database Queries

### Fetch Loadouts with Stats

```typescript
const { data: loadouts } = await supabase
  .from('loadouts')
  .select(`
    *,
    loadout_items(
      id,
      quantity,
      is_worn,
      gear_item:gear_items(
        id,
        name,
        weight,
        price
      )
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**RLS Policy**:
```sql
CREATE POLICY "Users can view own loadouts" ON loadouts
  FOR SELECT USING (user_id = auth.uid());
```

### Add Item to Loadout

```typescript
const { error } = await supabase
  .from('loadout_items')
  .insert({
    loadout_id: loadoutId,
    gear_item_id: itemId,
    quantity: quantity || 1,
    is_worn: false,
  });
```

**Unique Constraint**: `(loadout_id, gear_item_id)` prevents duplicates

### Update Stats (Trigger)

```sql
-- Automatically update loadout stats when items change
CREATE OR REPLACE FUNCTION update_loadout_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE loadouts
  SET
    total_weight = (
      SELECT COALESCE(SUM(g.weight * li.quantity), 0)
      FROM loadout_items li
      JOIN gear_items g ON li.gear_item_id = g.id
      WHERE li.loadout_id = NEW.loadout_id
    ),
    total_cost = (
      SELECT COALESCE(SUM(g.price * li.quantity), 0)
      FROM loadout_items li
      JOIN gear_items g ON li.gear_item_id = g.id
      WHERE li.loadout_id = NEW.loadout_id
    ),
    item_count = (
      SELECT COALESCE(SUM(li.quantity), 0)
      FROM loadout_items li
      WHERE li.loadout_id = NEW.loadout_id
    ),
    updated_at = now()
  WHERE id = NEW.loadout_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loadout_stats
  AFTER INSERT OR UPDATE OR DELETE ON loadout_items
  FOR EACH ROW
  EXECUTE FUNCTION update_loadout_stats();
```

---

## AI Hero Images

**Feature**: 048-ai-loadout-image-gen
**See**: [Observational Memory docs](observational-memory.md) (AI patterns)

### Generation Process

1. **User clicks "Generate Image"**
2. **Prompt built from loadout metadata**:
   ```typescript
   const prompt = buildPrompt({
     seasons: loadout.seasons,
     activities: loadout.activity_types,
     style: user.preference || 'realistic',
   });
   // "A realistic outdoor scene for summer hiking and backpacking,
   //  featuring mountain trails and camping gear in daylight"
   ```
3. **AI generates image** (via Vercel AI SDK + AI Gateway)
4. **Upload to Cloudinary** (CDN)
5. **Analyze contrast** (WCAG AA compliance for text overlay)
6. **Save to database** (`generated_images` table)
7. **Set as hero image**

**Max 3 images per loadout** (oldest auto-deleted)

### Fallback Images

If AI generation fails or is disabled:
- **Curated images**: 24 static images (6 activities × 4 seasons)
- **Location**: `public/fallback-images/`
- **Selection**: Based on loadout's primary activity + season

---

## Sharing

### Public Loadouts

Toggle `is_public` to make loadout visible to everyone.

**Public URL**: `https://gearshack.app/[locale]/loadouts/[id]`

**RLS Policy**:
```sql
CREATE POLICY "Public loadouts visible" ON loadouts
  FOR SELECT USING (
    is_public = true OR
    user_id = auth.uid()
  );
```

### Share Token (Private Sharing)

Generate unique token for private sharing:

```typescript
async function generateShareToken(loadoutId: string) {
  const token = crypto.randomUUID();

  await supabase
    .from('loadouts')
    .update({ share_token: token })
    .eq('id', loadoutId);

  return `https://gearshack.app/share/${token}`;
}
```

**Route**: `/share/[token]` → redirects to loadout (bypasses auth)

---

## Filtering & Sorting

### Filter by Season/Activity

```typescript
function filterLoadouts(
  loadouts: Loadout[],
  filters: {
    seasons?: Season[];
    activities?: ActivityType[];
    search?: string;
  }
) {
  return loadouts.filter(loadout => {
    // Search by name
    if (filters.search) {
      const match = loadout.name.toLowerCase().includes(filters.search.toLowerCase());
      if (!match) return false;
    }

    // Filter by season (any match)
    if (filters.seasons?.length) {
      const hasSeasonMatch = filters.seasons.some(s => loadout.seasons.includes(s));
      if (!hasSeasonMatch) return false;
    }

    // Filter by activity (any match)
    if (filters.activities?.length) {
      const hasActivityMatch = filters.activities.some(a => loadout.activity_types.includes(a));
      if (!hasActivityMatch) return false;
    }

    return true;
  });
}
```

### Sort Options

```typescript
type SortOption = 'weight' | 'cost' | 'date' | 'name';

function sortLoadouts(loadouts: Loadout[], sortBy: SortOption) {
  switch (sortBy) {
    case 'weight':
      return [...loadouts].sort((a, b) => a.total_weight - b.total_weight);
    case 'cost':
      return [...loadouts].sort((a, b) => a.total_cost - b.total_cost);
    case 'date':
      return [...loadouts].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case 'name':
      return [...loadouts].sort((a, b) => a.name.localeCompare(b.name));
  }
}
```

---

## Data Visualization

### Weight Distribution Donut Chart

**Library**: Recharts
**Component**: `LoadoutWeightChart.tsx`

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={weightByCategory}
      dataKey="weight"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={100}
      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
    >
      {weightByCategory.map((entry, index) => (
        <Cell key={index} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip formatter={(value: number) => `${value}g`} />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

**Color Scheme**: Tailwind zinc palette
- `shelter`: zinc-700
- `sleep_system`: zinc-600
- `backpack`: zinc-500
- `clothing`: zinc-400
- `kitchen`: zinc-300

---

## Performance Optimization

### Lazy Loading Items

```typescript
// Only fetch items when loadout is opened
const { data: items } = await supabase
  .from('loadout_items')
  .select('*, gear_items(*)')
  .eq('loadout_id', loadoutId);
```

Don't fetch items for gallery view (only need stats).

### Memoization

```tsx
const weightByCategory = useMemo(
  () => calculateWeightByCategory(loadoutItems),
  [loadoutItems]
);

const sortedItems = useMemo(
  () => sortItems(loadoutItems, sortBy),
  [loadoutItems, sortBy]
);
```

### Virtualization (Future)

For users with 100+ loadouts, use `react-virtuoso`:
```tsx
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={loadouts}
  itemContent={(index, loadout) => <LoadoutCard loadout={loadout} />}
/>
```

---

## Best Practices

### Creating Loadouts

1. **Start with template** (copy existing loadout)
2. **Name descriptively** ("Summer Alps 2025", not "Trip 1")
3. **Add context** (seasons, activities, duration)
4. **Mark worn items** (shoes, clothing)
5. **Generate hero image** (for visual identification)

### Weight Optimization

1. **Sort by weight** (heaviest items first)
2. **Check category distribution** (donut chart)
3. **Identify heavy categories** (often shelter, sleep system)
4. **Consider alternatives** (AI assistant can suggest)
5. **Mark more items as worn** (if appropriate)

---

## Integration Points

### AI Assistant

Agent can:
- Analyze loadout weight distribution
- Suggest lighter alternatives
- Compare multiple loadouts
- Identify missing items

**Tool**: `queryUserData` with loadout queries

### GearGraph

Analytics:
- Weight trends over time
- Category distribution across all loadouts
- Brand preferences
- Cost analysis

**Tool**: `queryGearGraph`

### Shakedowns

Request expert feedback on loadout:
- Create shakedown from loadout
- Experts suggest optimizations
- Mark feedback as helpful
- Apply suggestions

**Route**: `/[locale]/community/shakedowns/new?loadout=[id]`

---

## Related Docs

- [Database Schema](../architecture/database-schema.md)
- [AI Assistant](ai-assistant.md)
- [Observational Memory](observational-memory.md)
- [Image Management](image-management.md)

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**Users**: ~500 active loadouts
