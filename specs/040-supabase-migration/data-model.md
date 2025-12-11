# Data Model: Migration from Firebase to Supabase

**Feature**: 040-supabase-migration
**Date**: 2025-12-10

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │    profiles     │
│   (Supabase)    │───────│                 │
└─────────────────┘  1:1  └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   gear_items    │───────│   categories    │
│                 │  N:1  │                 │
└─────────────────┘       └─────────────────┘
         │
         │ 1:N (CASCADE)
         ▼
┌─────────────────┐
│  loadout_items  │
│   (junction)    │
└─────────────────┘
         │
         │ N:1 (CASCADE)
         ▼
┌─────────────────┐
│    loadouts     │
│                 │
└─────────────────┘
```

## PostgreSQL Schema

### Enums

```sql
-- Gear condition enum
CREATE TYPE gear_condition AS ENUM ('new', 'used', 'worn');

-- Gear status enum (extended lifecycle per clarification)
CREATE TYPE gear_status AS ENUM ('own', 'wishlist', 'sold', 'lent', 'retired');

-- Weight display unit enum
CREATE TYPE weight_unit AS ENUM ('g', 'oz', 'lb');

-- Activity type enum for loadouts
CREATE TYPE activity_type AS ENUM ('hiking', 'camping', 'climbing', 'skiing', 'backpacking');

-- Season enum for loadouts
CREATE TYPE season AS ENUM ('spring', 'summer', 'fall', 'winter');
```

### Table: profiles

User profile information, auto-created on signup via trigger.

```sql
CREATE TABLE profiles (
  -- Primary key references Supabase auth.users
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Basic info
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for email lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Table: categories

System-defined gear categories (no RLS - public read).

```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  -- level 1 = category, level 2 = subcategory, level 3 = product_type

  -- Data
  label TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);

-- No RLS - categories are public/system-defined
-- Read access for all authenticated users via default policy
```

### Table: gear_items

Individual gear items with full field parity (~30 fields).

```sql
CREATE TABLE gear_items (
  -- Identity
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Section 1: General Info
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  brand_url TEXT,
  model_number TEXT,
  product_url TEXT,

  -- Section 2: Classification
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_type_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Section 3: Weight & Specifications
  weight_grams NUMERIC(10, 2),
  weight_display_unit weight_unit DEFAULT 'g' NOT NULL,
  length_cm NUMERIC(8, 2),
  width_cm NUMERIC(8, 2),
  height_cm NUMERIC(8, 2),

  -- Section 4: Purchase Details
  price_paid NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  purchase_date DATE,
  retailer TEXT,
  retailer_url TEXT,

  -- Section 5: Media (Cloudinary URLs)
  primary_image_url TEXT,
  gallery_image_urls TEXT[] DEFAULT '{}',
  nobg_images JSONB DEFAULT '{}',

  -- Section 6: Status & Condition
  condition gear_condition DEFAULT 'new' NOT NULL,
  status gear_status DEFAULT 'own' NOT NULL,
  notes TEXT,

  -- Section 7: Dependencies
  dependency_ids UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_gear_items_user ON gear_items(user_id);
CREATE INDEX idx_gear_items_category ON gear_items(category_id);
CREATE INDEX idx_gear_items_status ON gear_items(status);
CREATE INDEX idx_gear_items_created ON gear_items(created_at DESC);

-- RLS Policies
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON gear_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON gear_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON gear_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON gear_items FOR DELETE
  USING (auth.uid() = user_id);
```

### Table: loadouts

Named collections of gear items (packing lists).

```sql
CREATE TABLE loadouts (
  -- Identity
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  trip_date DATE,

  -- Classification (arrays for multiple selections)
  activity_types activity_type[] DEFAULT '{}',
  seasons season[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_loadouts_user ON loadouts(user_id);
CREATE INDEX idx_loadouts_created ON loadouts(created_at DESC);

-- RLS Policies
ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loadouts"
  ON loadouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loadouts"
  ON loadouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loadouts"
  ON loadouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loadouts"
  ON loadouts FOR DELETE
  USING (auth.uid() = user_id);
```

### Table: loadout_items

Junction table linking loadouts to gear items.

```sql
CREATE TABLE loadout_items (
  -- Identity
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Foreign keys (both CASCADE on delete)
  loadout_id UUID REFERENCES loadouts(id) ON DELETE CASCADE NOT NULL,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE CASCADE NOT NULL,

  -- Item state within loadout
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  is_worn BOOLEAN DEFAULT FALSE NOT NULL,
  is_consumable BOOLEAN DEFAULT FALSE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: same item can't be added twice to same loadout
  UNIQUE (loadout_id, gear_item_id)
);

-- Indexes
CREATE INDEX idx_loadout_items_loadout ON loadout_items(loadout_id);
CREATE INDEX idx_loadout_items_gear ON loadout_items(gear_item_id);

-- RLS Policies (inherit from parent loadout ownership)
ALTER TABLE loadout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loadout items"
  ON loadout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own loadout items"
  ON loadout_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own loadout items"
  ON loadout_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own loadout items"
  ON loadout_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );
```

## Triggers

### Auto-create profile on user signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Auto-update updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gear_items_updated_at
  BEFORE UPDATE ON gear_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loadouts_updated_at
  BEFORE UPDATE ON loadouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Computed Values

### Loadout total weight (computed in application)

Weight calculations happen in the application layer via hooks:

```typescript
// In useLoadouts hook
function calculateLoadoutWeight(loadout: Loadout, gearItems: GearItem[]): WeightSummary {
  const items = loadout.loadout_items.map(li => ({
    item: gearItems.find(g => g.id === li.gear_item_id),
    state: li
  }));

  const totalWeight = items.reduce((sum, { item }) =>
    sum + (item?.weight_grams ?? 0), 0);

  const wornWeight = items
    .filter(({ state }) => state.is_worn)
    .reduce((sum, { item }) => sum + (item?.weight_grams ?? 0), 0);

  const consumableWeight = items
    .filter(({ state }) => state.is_consumable)
    .reduce((sum, { item }) => sum + (item?.weight_grams ?? 0), 0);

  return {
    totalWeight,
    baseWeight: totalWeight - wornWeight - consumableWeight,
    wornWeight,
    consumableWeight,
  };
}
```

## Field Mapping: Firebase to Supabase

| Firebase Field | PostgreSQL Column | Type Change |
|----------------|-------------------|-------------|
| id | id | string → UUID |
| createdAt | created_at | Timestamp → TIMESTAMPTZ |
| updatedAt | updated_at | Timestamp → TIMESTAMPTZ |
| name | name | unchanged |
| brand | brand | unchanged |
| description | description | unchanged |
| brandUrl | brand_url | camelCase → snake_case |
| modelNumber | model_number | camelCase → snake_case |
| productUrl | product_url | camelCase → snake_case |
| categoryId | category_id | string → UUID |
| subcategoryId | subcategory_id | string → UUID |
| productTypeId | product_type_id | string → UUID |
| weightGrams | weight_grams | number → NUMERIC |
| weightDisplayUnit | weight_display_unit | string → ENUM |
| lengthCm | length_cm | number → NUMERIC |
| widthCm | width_cm | number → NUMERIC |
| heightCm | height_cm | number → NUMERIC |
| pricePaid | price_paid | number → NUMERIC |
| currency | currency | unchanged |
| purchaseDate | purchase_date | Timestamp → DATE |
| retailer | retailer | unchanged |
| retailerUrl | retailer_url | camelCase → snake_case |
| primaryImageUrl | primary_image_url | unchanged |
| galleryImageUrls | gallery_image_urls | array → TEXT[] |
| nobgImages | nobg_images | object → JSONB |
| condition | condition | string → ENUM |
| status | status | string → ENUM (expanded) |
| notes | notes | unchanged |
| dependencyIds | dependency_ids | array → UUID[] |

## TypeScript Types (Generated)

The Supabase CLI generates types from the database schema:

```bash
npx supabase gen types typescript --local > types/database.ts
```

This creates type-safe interfaces matching the PostgreSQL schema.
