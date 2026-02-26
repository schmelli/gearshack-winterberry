# Database Schema

**Database**: Supabase PostgreSQL 15
**Extensions**: pgvector, pg_trgm, uuid-ossp, postgis
**Total Tables**: 50+
**Total Migrations**: 84

## Overview

Gearshack uses Supabase PostgreSQL with advanced extensions for vector search (pgvector), fuzzy matching (pg_trgm), and geospatial queries (postgis).

### Database Extensions

```sql
-- Vector similarity search for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Fuzzy text matching for search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Geospatial queries for merchant locations
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Table Groups

Tables are organized into logical domains:

1. **Core** - Users, profiles, authentication
2. **Gear Management** - Items, loadouts, categories
3. **Social** - Following, friends, activity
4. **Community** - Shakedowns, marketplace, bulletin board
5. **VIP** - Verified influencer profiles
6. **AI/Memory** - Mastra agent memory, embeddings
7. **Catalog** - Product database, brands, resellers
8. **Admin** - Feature flags, moderation, analytics
9. **Messaging** - Direct messages, conversations
10. **Media** - Images, generated content

---

## 1. Core Tables

### `profiles`

User profiles with privacy settings and preferences.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,

  -- OAuth provider data
  avatar_provider TEXT CHECK (avatar_provider IN ('google', 'custom')),

  -- Privacy settings
  privacy_level TEXT DEFAULT 'friends'
    CHECK (privacy_level IN ('public', 'friends', 'private')),
  show_online_status BOOLEAN DEFAULT true,

  -- Preferences
  preferred_weight_unit TEXT DEFAULT 'g' CHECK (preferred_weight_unit IN ('g', 'kg', 'oz', 'lb')),
  preferred_currency TEXT DEFAULT 'EUR',
  preferred_language TEXT DEFAULT 'en',
  start_page TEXT DEFAULT 'inventory'
    CHECK (start_page IN ('inventory', 'loadouts', 'community')),

  -- Account status
  account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted')),
  suspension_reason TEXT,
  suspension_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_account_status ON profiles(account_status);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles: read if public or user is friend
CREATE POLICY "Public profiles visible" ON profiles
  FOR SELECT USING (
    privacy_level = 'public' OR
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = profiles.id)
         OR (user_id = profiles.id AND friend_id = auth.uid())
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

**Relationships:**
- `id` → `auth.users.id` (Supabase Auth)
- Referenced by: `gear_items`, `loadouts`, `friendships`, `user_follows`, etc.

**Privacy Levels:**
- `public`: Profile visible to everyone
- `friends`: Only friends can see profile
- `private`: Only user can see their own profile

---

### `user_preferences`

Extended user preferences (separate from profiles for cleaner schema).

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Regional settings
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),

  -- Feature preferences
  enable_notifications BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT false,
  enable_ai_assistant BOOLEAN DEFAULT true,

  -- UI preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  compact_view BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. Gear Management Tables

### `gear_items`

Core inventory table for all gear items.

```sql
CREATE TABLE gear_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT NOT NULL,

  -- Physical properties
  weight REAL, -- in grams
  price REAL,
  currency TEXT DEFAULT 'EUR',

  -- Status
  status TEXT DEFAULT 'inventory'
    CHECK (status IN ('inventory', 'wishlist', 'sold', 'gifted', 'lost')),
  condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor')),

  -- Dates
  purchase_date DATE,
  warranty_until DATE,

  -- Images
  image_url TEXT,
  nobg_image_url TEXT, -- Background-removed version

  -- Rich data
  notes TEXT,
  specifications JSONB, -- Flexible spec storage
  tags TEXT[],

  -- Catalog linking
  catalog_item_id UUID REFERENCES catalog_items(id),

  -- Import tracking
  import_source TEXT, -- 'manual', 'url', 'catalog'
  import_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_gear_items_user_id ON gear_items(user_id);
CREATE INDEX idx_gear_items_status ON gear_items(status);
CREATE INDEX idx_gear_items_category ON gear_items(category);
CREATE INDEX idx_gear_items_brand_trgm ON gear_items USING gin(brand gin_trgm_ops);
CREATE INDEX idx_gear_items_name_trgm ON gear_items USING gin(name gin_trgm_ops);

-- RLS Policies
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gear" ON gear_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own gear" ON gear_items
  FOR ALL USING (user_id = auth.uid());
```

**Key Features:**
- **Flexible specs**: JSONB column for any product specifications
- **Fuzzy search**: Trigram indexes on brand/name for typo-tolerant search
- **Multi-status**: Inventory, wishlist, sold, etc.
- **Background removal**: Stores both original and nobg versions
- **Catalog linking**: Can reference official product catalog

---

### `loadouts`

Pack configurations ("loadouts") with seasonal/activity metadata.

```sql
CREATE TABLE loadouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  seasons TEXT[] DEFAULT ARRAY['summer'], -- spring, summer, fall, winter
  activity_types TEXT[] DEFAULT ARRAY['hiking'], -- hiking, backpacking, climbing, etc.
  trip_duration_days INTEGER,

  -- Hero image
  hero_image_url TEXT,
  hero_image_id UUID REFERENCES generated_images(id),

  -- Stats (computed from items)
  total_weight REAL, -- grams
  total_cost REAL,
  item_count INTEGER DEFAULT 0,

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE, -- For public URL sharing

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_loadouts_user_id ON loadouts(user_id);
CREATE INDEX idx_loadouts_is_public ON loadouts(is_public) WHERE is_public = true;
CREATE INDEX idx_loadouts_share_token ON loadouts(share_token);
CREATE INDEX idx_loadouts_seasons ON loadouts USING gin(seasons);
CREATE INDEX idx_loadouts_activity_types ON loadouts USING gin(activity_types);
```

**Seasons**: spring, summer, fall, winter (array, multiple allowed)
**Activities**: hiking, backpacking, climbing, camping, skiing, cycling, running, ultralight, fastpacking

---

### `loadout_items`

Junction table linking gear items to loadouts with quantity and worn weight.

```sql
CREATE TABLE loadout_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Quantity and worn status
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  is_worn BOOLEAN DEFAULT false, -- Worn items don't count toward pack weight

  -- Category grouping (can differ from item's main category)
  category TEXT,

  -- Notes for this specific loadout
  notes TEXT,

  -- Order for display
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(loadout_id, gear_item_id)
);

CREATE INDEX idx_loadout_items_loadout_id ON loadout_items(loadout_id);
CREATE INDEX idx_loadout_items_gear_item_id ON loadout_items(gear_item_id);
```

**Worn Items**: Items worn on body (shoes, clothing) don't count toward pack weight but are included in total weight.

---

### `categories`

Ontology of gear categories with i18n support.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Hierarchy
  parent_id UUID REFERENCES categories(id),
  path TEXT, -- Materialized path: 'clothing/jackets/down'
  level INTEGER DEFAULT 0,

  -- Identity
  slug TEXT UNIQUE NOT NULL,

  -- i18n
  name_en TEXT NOT NULL,
  name_de TEXT,
  description_en TEXT,
  description_de TEXT,

  -- Metadata
  icon TEXT, -- lucide icon name
  color TEXT, -- hex color
  sort_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories(path);
CREATE INDEX idx_categories_slug ON categories(slug);
```

**Hierarchy Example:**
```
clothing (level 0)
├── jackets (level 1)
│   ├── down (level 2)
│   ├── synthetic (level 2)
│   └── shell (level 2)
└── base-layers (level 1)
```

---

## 3. Social Tables

### `friendships`

Bidirectional friend relationships (requires prior messaging).

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Canonical ordering: user_id < friend_id
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, friend_id),
  CHECK (user_id < friend_id) -- Enforce canonical ordering
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- Composite index for mutual friend queries
CREATE INDEX idx_friendships_both ON friendships(user_id, friend_id);
```

**Canonical Ordering**: Always store with smaller UUID first to avoid duplicates.

**Query Pattern** (check if friends):
```sql
SELECT EXISTS(
  SELECT 1 FROM friendships
  WHERE (user_id = $1 AND friend_id = $2)
     OR (user_id = $2 AND friend_id = $1)
);
```

---

### `friend_requests`

Pending friend requests (rate limited: 20/day).

```sql
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),

  message TEXT, -- Optional personal message

  -- Expiry (30 days)
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX idx_friend_requests_to_user_id ON friend_requests(to_user_id)
  WHERE status = 'pending';
CREATE INDEX idx_friend_requests_expires_at ON friend_requests(expires_at)
  WHERE status = 'pending';
```

**Rules:**
- Can only send if prior message exchange exists
- Rate limited: 20 requests per 24 hours
- Auto-expires after 30 days
- Cannot send duplicate request

---

### `user_follows`

One-way following (no approval needed).

```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);
```

**vs Friendships:**
- **Follow**: One-click, no approval, asymmetric
- **Friend**: Requires message exchange, approval, symmetric

---

### `friend_activities`

Activity feed for friends (new loadouts, gear items, etc.).

```sql
CREATE TABLE friend_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'loadout_created',
    'loadout_updated',
    'gear_added',
    'gear_updated',
    'shakedown_created',
    'bulletin_post',
    'vip_claimed'
  )),

  -- Polymorphic reference
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN (
    'loadout',
    'gear_item',
    'shakedown',
    'bulletin_post',
    'vip_account'
  )),

  -- Denormalized data for performance
  title TEXT,
  description TEXT,
  image_url TEXT,

  -- Metadata
  metadata JSONB, -- Additional context

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_friend_activities_user_id ON friend_activities(user_id);
CREATE INDEX idx_friend_activities_created_at ON friend_activities(created_at DESC);
CREATE INDEX idx_friend_activities_reference ON friend_activities(reference_type, reference_id);
```

**Activity Types:**
- `loadout_created`: New loadout published
- `gear_added`: New gear item added to inventory
- `shakedown_created`: Requested gear review
- `bulletin_post`: Posted in community

---

### `online_status`

Real-time presence tracking (5-minute inactivity timeout).

```sql
CREATE TABLE online_status (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now(),

  -- Session tracking
  session_id TEXT,

  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_online_status_is_online ON online_status(is_online)
  WHERE is_online = true;
CREATE INDEX idx_online_status_last_seen ON online_status(last_seen_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_online_status_timestamp
  BEFORE UPDATE ON online_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Heartbeat Pattern**:
```typescript
// Client sends heartbeat every 60s
setInterval(() => {
  supabase.from('online_status').upsert({
    user_id,
    is_online: true,
    last_seen_at: new Date().toISOString()
  });
}, 60000);

// Server marks offline if last_seen > 5 minutes
```

---

## 4. Community Tables

### `shakedowns`

Gear review requests where experts give feedback.

```sql
CREATE TABLE shakedowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Request details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Trip context
  trip_type TEXT, -- 'weekend', 'week', 'thru-hike', etc.
  trip_location TEXT,
  trip_season TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),

  -- Concerns
  concerns TEXT[], -- ['weight', 'cost', 'warmth', 'durability']
  budget_constraint REAL,

  -- Status
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'cancelled')),

  -- Stats
  feedback_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0, -- Upvotes on feedback
  view_count INTEGER DEFAULT 0,

  -- Completion
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shakedowns_user_id ON shakedowns(user_id);
CREATE INDEX idx_shakedowns_loadout_id ON shakedowns(loadout_id);
CREATE INDEX idx_shakedowns_status ON shakedowns(status);
CREATE INDEX idx_shakedowns_created_at ON shakedowns(created_at DESC);
```

---

### `shakedown_feedback`

Expert feedback on shakedown requests.

```sql
CREATE TABLE shakedown_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Feedback content
  comment TEXT NOT NULL,

  -- Structured suggestions
  suggestions JSONB, -- Array of {type, item_id, action, reason}

  -- Community engagement
  helpful_count INTEGER DEFAULT 0,

  -- Expert badge
  is_expert BOOLEAN DEFAULT false, -- Has badge for this category

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shakedown_feedback_shakedown_id ON shakedown_feedback(shakedown_id);
CREATE INDEX idx_shakedown_feedback_user_id ON shakedown_feedback(user_id);
```

**Suggestion Format**:
```json
{
  "type": "remove",
  "item_id": "uuid",
  "reason": "You have two similar jackets - consider dropping one",
  "weight_saved": 450
}
```

---

### `bulletin_posts`

Community discussion board posts.

```sql
CREATE TABLE bulletin_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Categories
  category TEXT NOT NULL CHECK (category IN (
    'general',
    'gear-talk',
    'trip-reports',
    'questions',
    'for-sale',
    'trail-conditions'
  )),
  tags TEXT[],

  -- Media
  images TEXT[], -- Array of URLs

  -- Engagement
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,

  -- Moderation
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,

  -- Timestamps
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bulletin_posts_user_id ON bulletin_posts(user_id);
CREATE INDEX idx_bulletin_posts_category ON bulletin_posts(category);
CREATE INDEX idx_bulletin_posts_last_activity ON bulletin_posts(last_activity_at DESC);
CREATE INDEX idx_bulletin_posts_is_pinned ON bulletin_posts(is_pinned) WHERE is_pinned = true;
```

---

### `marketplace_listings`

Gear marketplace for buying/selling/trading/borrowing.

```sql
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,

  -- Listing details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Pricing
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sell', 'trade', 'borrow', 'free')),
  price REAL,
  currency TEXT DEFAULT 'EUR',

  -- Condition
  condition TEXT CHECK (condition IN ('new', 'like-new', 'good', 'fair', 'poor')),

  -- Location
  location TEXT,
  location_point GEOGRAPHY(POINT), -- PostGIS for geo queries

  -- Shipping
  shipping_available BOOLEAN DEFAULT true,
  local_pickup BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),

  -- Images
  images TEXT[],

  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketplace_seller_id ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listing_type ON marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_location ON marketplace_listings USING gist(location_point);
```

---

## 5. VIP Tables

VIP (Verified Influencer Profiles) for outdoor content creators.

### `vip_accounts`

Verified influencer accounts with custom URLs.

```sql
CREATE TABLE vip_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  slug TEXT UNIQUE NOT NULL, -- Custom URL: /vip/{slug}
  display_name TEXT NOT NULL,
  bio TEXT,

  -- Branding
  avatar_url TEXT,
  banner_url TEXT,
  website_url TEXT,

  -- Social links
  social_links JSONB, -- {youtube, instagram, tiktok, etc.}

  -- Stats
  follower_count INTEGER DEFAULT 0,
  loadout_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Verification
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,

  -- Claim process
  claim_token TEXT UNIQUE,
  claimed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vip_accounts_user_id ON vip_accounts(user_id);
CREATE INDEX idx_vip_accounts_slug ON vip_accounts(slug);
CREATE INDEX idx_vip_accounts_verification_status ON vip_accounts(verification_status);
```

---

## 6. AI/Memory Tables

### `conversation_memory`

Mastra agent conversation history.

```sql
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scoping
  thread_id TEXT NOT NULL,
  resource_id TEXT NOT NULL, -- Usually user_id

  -- Message data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,

  -- Tool calls
  tool_calls JSONB, -- Array of tool call objects
  tool_results JSONB, -- Array of tool result objects

  -- Embeddings (for semantic recall)
  embedding vector(1536), -- OpenAI text-embedding-3-small

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversation_memory_thread ON conversation_memory(thread_id, created_at);
CREATE INDEX idx_conversation_memory_resource ON conversation_memory(resource_id, created_at);

-- Vector similarity search (HNSW index)
CREATE INDEX idx_conversation_memory_embedding
  ON conversation_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Vector Search** (semantic recall):
```sql
SELECT * FROM conversation_memory
WHERE resource_id = $1
ORDER BY embedding <=> $2  -- Cosine distance
LIMIT 5;
```

---

### `working_memory`

Structured user profile for AI agent (Zod schema).

```sql
CREATE TABLE working_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  resource_id TEXT UNIQUE NOT NULL, -- user_id

  -- Structured JSON (validated by Zod)
  data JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_working_memory_resource ON working_memory(resource_id);
```

**Data Schema** (TypeScript Zod):
```typescript
{
  userName?: string;
  preferredUnits?: 'metric' | 'imperial';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  favoriteActivities?: string[];
  gearPreferences?: {
    preferredBrands?: string[];
    budgetRange?: [number, number];
    weightPriority?: 'ultralight' | 'balanced' | 'comfort';
  };
  recentGoals?: string[];
}
```

---

## 7. Catalog Tables

### `catalog_items`

Official product catalog (synced from external APIs).

```sql
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES catalog_brands(id),

  -- Category
  category_id UUID REFERENCES categories(id),

  -- Specs
  weight REAL,
  specifications JSONB,

  -- Pricing
  msrp REAL,
  currency TEXT DEFAULT 'USD',

  -- Images
  image_url TEXT,
  images TEXT[],

  -- Description
  description TEXT,

  -- Availability
  is_discontinued BOOLEAN DEFAULT false,

  -- Embeddings (for similarity search)
  embedding vector(1536),

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  external_id TEXT,
  external_source TEXT, -- 'rei', 'backcountry', etc.

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_catalog_items_brand_id ON catalog_items(brand_id);
CREATE INDEX idx_catalog_items_category_id ON catalog_items(category_id);
CREATE INDEX idx_catalog_items_sku ON catalog_items(sku);

-- Fuzzy search
CREATE INDEX idx_catalog_items_name_trgm ON catalog_items USING gin(name gin_trgm_ops);

-- Vector similarity
CREATE INDEX idx_catalog_items_embedding ON catalog_items
  USING hnsw (embedding vector_cosine_ops);
```

---

### `catalog_brands`

Brand directory with fuzzy matching.

```sql
CREATE TABLE catalog_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  logo_url TEXT,
  website_url TEXT,

  -- Fuzzy matching data
  alternate_names TEXT[], -- Common misspellings, abbreviations

  -- Stats
  product_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_catalog_brands_name_trgm ON catalog_brands USING gin(name gin_trgm_ops);
CREATE INDEX idx_catalog_brands_slug ON catalog_brands(slug);
```

---

## 8. Admin Tables

### `feature_flags`

Dynamic feature toggles.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  flag_key TEXT UNIQUE NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT false,

  -- Rollout
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),

  -- Targeting
  enabled_for_users UUID[], -- Specific user IDs
  enabled_for_groups TEXT[], -- 'beta', 'premium', etc.

  -- Metadata
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feature_flags_flag_key ON feature_flags(flag_key);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);
```

**Usage**:
```typescript
await isFeatureEnabled('ai-assistant-v2', userId);
```

---

### `admin_activity_logs`

Audit trail for admin actions.

```sql
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  admin_id UUID NOT NULL REFERENCES profiles(id),

  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_suspended',
    'user_banned',
    'content_removed',
    'feature_flag_toggled',
    'data_export'
  )),

  -- Target
  target_type TEXT, -- 'user', 'post', 'comment', etc.
  target_id UUID,

  -- Details
  reason TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
```

---

## 9. Generated Content Tables

### `generated_images`

AI-generated hero images for loadouts.

```sql
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Image data
  url TEXT NOT NULL, -- Cloudinary URL
  cloudinary_public_id TEXT,

  -- Generation metadata
  prompt TEXT NOT NULL,
  model TEXT NOT NULL, -- 'nano-banana-pro'
  style_preferences JSONB,

  -- Contrast analysis (WCAG compliance)
  avg_luminance REAL,
  contrast_ratio REAL,
  is_light_background BOOLEAN,

  -- Status
  is_active BOOLEAN DEFAULT false, -- Current hero image for loadout

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX idx_generated_images_loadout_id ON generated_images(loadout_id);
CREATE INDEX idx_generated_images_is_active ON generated_images(is_active)
  WHERE is_active = true;
```

**Max 3 per loadout** (oldest auto-deleted):
```sql
CREATE OR REPLACE FUNCTION enforce_max_generated_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep only newest 3 images per loadout
  DELETE FROM generated_images
  WHERE loadout_id = NEW.loadout_id
    AND id NOT IN (
      SELECT id FROM generated_images
      WHERE loadout_id = NEW.loadout_id
      ORDER BY created_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security (RLS)

All tables have RLS enabled. Common patterns:

### Pattern 1: User-Owned Resources
```sql
-- User can only see/modify their own data
CREATE POLICY "policy_name" ON table_name
  FOR ALL USING (user_id = auth.uid());
```

### Pattern 2: Public Read, Owner Write
```sql
-- Anyone can read, only owner can write
CREATE POLICY "public_read" ON table_name
  FOR SELECT USING (true);

CREATE POLICY "owner_write" ON table_name
  FOR INSERT/UPDATE/DELETE USING (user_id = auth.uid());
```

### Pattern 3: Friend Visibility
```sql
-- Visible to friends only
CREATE POLICY "friends_visible" ON table_name
  FOR SELECT USING (
    user_id = auth.uid() OR
    is_public = true OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = table_name.user_id)
         OR (user_id = table_name.user_id AND friend_id = auth.uid())
    )
  );
```

### Pattern 4: Admin Override
```sql
-- Admins can do anything
CREATE POLICY "admin_all" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

---

## Database Functions

### Fuzzy Matching (Wishlist-Marketplace)

```sql
CREATE OR REPLACE FUNCTION fuzzy_match_marketplace_listings(
  search_name TEXT,
  search_brand TEXT,
  min_score REAL DEFAULT 0.3
)
RETURNS TABLE(listing marketplace_listings, score REAL) AS $$
  SELECT
    l.*,
    (
      similarity(l.title, search_name) * 0.5 +
      CASE WHEN search_brand IS NOT NULL
        THEN similarity(COALESCE(b.name, ''), search_brand) * 0.5
        ELSE 0.5
      END
    ) AS score
  FROM marketplace_listings l
  LEFT JOIN catalog_brands b ON l.brand_id = b.id
  WHERE (
    similarity(l.title, search_name) > 0.3 OR
    similarity(COALESCE(b.name, ''), search_brand) > 0.3
  )
  AND (score) >= min_score
  ORDER BY score DESC;
$$ LANGUAGE sql;
```

### Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Indexes Strategy

### 1. Primary Keys
All tables use UUID primary keys with `uuid_generate_v4()`.

### 2. Foreign Keys
All foreign keys have indexes for join performance.

### 3. Frequently Queried Columns
- `user_id` (almost all tables)
- `created_at` (for pagination)
- `status` fields (for filtering)

### 4. Fuzzy Search (Trigram)
Brand and name columns use `gin_trgm_ops` for typo-tolerant search.

### 5. Vector Search (HNSW)
Embedding columns use HNSW index for fast similarity search.

### 6. Geospatial (GIST)
PostGIS columns use GIST index for location queries.

### 7. Partial Indexes
```sql
-- Only index active records
CREATE INDEX idx_name ON table(column) WHERE status = 'active';
```

---

## Migrations

Located in `/supabase/migrations/`, applied in chronological order.

**Naming Convention:**
```
YYYYMMDDHHMMSS_descriptive_name.sql
20260206100000_create_loadout_shares.sql
```

**Common Operations:**

```sql
-- Create table
CREATE TABLE IF NOT EXISTS table_name (...);

-- Add column
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "policy_name" ON table_name ...;
```

---

## Schema Maintenance

### Vacuum & Analyze
```sql
-- Auto-vacuum is enabled, but manual vacuum for large ops:
VACUUM ANALYZE table_name;
```

### Reindex
```sql
-- Rebuild indexes (e.g., after bulk imports)
REINDEX TABLE table_name;
```

### Table Statistics
```sql
-- Check table size
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Related Docs

- [System Architecture](overview.md)
- [Tech Stack](tech-stack.md)
- [Database Migrations Guide](../guides/database-migrations.md)
- [Supabase Best Practices](https://supabase.com/docs/guides/database/postgres/guidelines)

---

**Last Updated**: 2026-02-06
**Total Tables**: 50+
**Total Indexes**: 100+
**Database Version**: PostgreSQL 15
