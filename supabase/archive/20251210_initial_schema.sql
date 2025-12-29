-- Migration: Initial Schema for Gearshack Winterberry
-- Feature: 040-supabase-migration
-- Date: 2025-12-10
-- Tasks: T005-T013
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- Or via Supabase CLI: supabase db push

-- =============================================================================
-- T005: Create PostgreSQL enums
-- =============================================================================

CREATE TYPE gear_condition AS ENUM ('new', 'used', 'worn');
CREATE TYPE gear_status AS ENUM ('own', 'wishlist', 'sold', 'lent', 'retired');
CREATE TYPE weight_unit AS ENUM ('g', 'oz', 'lb');
CREATE TYPE activity_type AS ENUM ('hiking', 'camping', 'climbing', 'skiing', 'backpacking');
CREATE TYPE season AS ENUM ('spring', 'summer', 'fall', 'winter');

-- =============================================================================
-- T006: Create profiles table with RLS policies
-- =============================================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- T007: Create categories table with public read RLS policy
-- =============================================================================

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_authenticated"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- T008: Create gear_items table with full schema and RLS policies
-- =============================================================================

CREATE TABLE gear_items (
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

CREATE INDEX idx_gear_items_user ON gear_items(user_id);
CREATE INDEX idx_gear_items_category ON gear_items(category_id);
CREATE INDEX idx_gear_items_status ON gear_items(status);
CREATE INDEX idx_gear_items_created ON gear_items(created_at DESC);

ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gear_items_select_own"
  ON gear_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gear_items_insert_own"
  ON gear_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gear_items_update_own"
  ON gear_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gear_items_delete_own"
  ON gear_items FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- T009: Create loadouts table with RLS policies
-- =============================================================================

CREATE TABLE loadouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trip_date DATE,
  activity_types activity_type[] DEFAULT '{}',
  seasons season[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_loadouts_user ON loadouts(user_id);
CREATE INDEX idx_loadouts_created ON loadouts(created_at DESC);

ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loadouts_select_own"
  ON loadouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "loadouts_insert_own"
  ON loadouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loadouts_update_own"
  ON loadouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loadouts_delete_own"
  ON loadouts FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- T010: Create loadout_items junction table with CASCADE deletes and RLS
-- =============================================================================

CREATE TABLE loadout_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loadout_id UUID REFERENCES loadouts(id) ON DELETE CASCADE NOT NULL,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  is_worn BOOLEAN DEFAULT FALSE NOT NULL,
  is_consumable BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (loadout_id, gear_item_id)
);

CREATE INDEX idx_loadout_items_loadout ON loadout_items(loadout_id);
CREATE INDEX idx_loadout_items_gear ON loadout_items(gear_item_id);

ALTER TABLE loadout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loadout_items_select_own"
  ON loadout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "loadout_items_insert_own"
  ON loadout_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "loadout_items_update_own"
  ON loadout_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

CREATE POLICY "loadout_items_delete_own"
  ON loadout_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

-- =============================================================================
-- T011: Create handle_new_user() trigger function for auto-creating profiles
-- =============================================================================

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

-- =============================================================================
-- T012: Create update_updated_at() trigger function and apply to tables
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gear_items_updated_at
  BEFORE UPDATE ON gear_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loadouts_updated_at
  BEFORE UPDATE ON loadouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- T013: Seed categories table with gear taxonomy data
-- =============================================================================

-- Level 1: Main categories
INSERT INTO categories (id, parent_id, level, label) VALUES
  ('11111111-1111-1111-1111-111111111101', NULL, 1, 'Shelter'),
  ('11111111-1111-1111-1111-111111111102', NULL, 1, 'Sleep System'),
  ('11111111-1111-1111-1111-111111111103', NULL, 1, 'Packs & Bags'),
  ('11111111-1111-1111-1111-111111111104', NULL, 1, 'Clothing'),
  ('11111111-1111-1111-1111-111111111105', NULL, 1, 'Cooking'),
  ('11111111-1111-1111-1111-111111111106', NULL, 1, 'Water'),
  ('11111111-1111-1111-1111-111111111107', NULL, 1, 'Navigation'),
  ('11111111-1111-1111-1111-111111111108', NULL, 1, 'Safety & First Aid'),
  ('11111111-1111-1111-1111-111111111109', NULL, 1, 'Electronics'),
  ('11111111-1111-1111-1111-111111111110', NULL, 1, 'Accessories');

-- Level 2: Subcategories (sample subset)
INSERT INTO categories (id, parent_id, level, label) VALUES
  -- Shelter subcategories
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 2, 'Tents'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 2, 'Tarps'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 2, 'Hammocks'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101', 2, 'Bivy Sacks'),
  -- Sleep System subcategories
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111102', 2, 'Sleeping Bags'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111102', 2, 'Quilts'),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111102', 2, 'Sleeping Pads'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111102', 2, 'Pillows'),
  -- Packs & Bags subcategories
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111103', 2, 'Backpacks'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111103', 2, 'Daypacks'),
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111103', 2, 'Stuff Sacks'),
  -- Clothing subcategories
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111104', 2, 'Base Layers'),
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111104', 2, 'Insulation'),
  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111104', 2, 'Rain Gear'),
  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111104', 2, 'Footwear'),
  ('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111104', 2, 'Headwear'),
  -- Cooking subcategories
  ('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111105', 2, 'Stoves'),
  ('22222222-2222-2222-2222-222222222218', '11111111-1111-1111-1111-111111111105', 2, 'Cookware'),
  ('22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111105', 2, 'Utensils'),
  -- Water subcategories
  ('22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111106', 2, 'Bottles & Reservoirs'),
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111106', 2, 'Filtration'),
  -- Navigation subcategories
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111107', 2, 'GPS Devices'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111107', 2, 'Compasses'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111107', 2, 'Maps'),
  -- Electronics subcategories
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111109', 2, 'Headlamps'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111109', 2, 'Power Banks'),
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111109', 2, 'Solar Chargers');
