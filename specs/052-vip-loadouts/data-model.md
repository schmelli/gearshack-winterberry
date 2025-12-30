# Data Model: VIP Loadouts (Feature 052)

**Date**: 2025-12-29
**Feature**: VIP Loadouts (Influencer Integration)

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │  vip_accounts   │       │  vip_loadouts   │
│  (existing)     │       │                 │       │                 │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ claimed_by_     │       │ id (PK)         │
│ email           │       │   user_id (FK)  │◄──────│ vip_id (FK)     │
│ display_name    │       │ id (PK)         │       │ name            │
│ avatar_url      │       │ name            │       │ slug            │
│ ...             │       │ slug            │       │ source_url      │
└─────────────────┘       │ bio             │       │ description     │
        │                 │ avatar_url      │       │ trip_type       │
        │                 │ social_links    │       │ date_range      │
        │                 │ status          │       │ status          │
        │                 │ is_featured     │       │ is_source_      │
        │                 │ created_at      │       │   available     │
        │                 │ archived_at     │       │ created_at      │
        │                 └─────────────────┘       │ updated_at      │
        │                         │                 └─────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   vip_follows   │       │  vip_bookmarks  │       │vip_loadout_items│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ follower_id(FK) │───────│ user_id (FK)    │       │ id (PK)         │
│ vip_id (FK)     │───────│ vip_loadout_    │───────│ vip_loadout_    │
│ created_at      │       │   id (FK)       │       │   id (FK)       │
└─────────────────┘       │ created_at      │       │ gear_item_id(FK)│──┐
                          └─────────────────┘       │ weight_grams    │  │
                                                    │ quantity        │  │
┌─────────────────┐       ┌─────────────────┐       │ notes           │  │
│claim_invitations│       │  gear_items     │       │ category        │  │
├─────────────────┤       │  (existing)     │       │ sort_order      │  │
│ id (PK)         │       ├─────────────────┤       └─────────────────┘  │
│ vip_id (FK)     │───────│ id (PK)         │◄──────────────────────────┘
│ email           │       │ name            │
│ token           │       │ brand           │
│ status          │       │ catalog_        │
│ expires_at      │       │   product_id    │
│ created_at      │       │ ...             │
│ claimed_at      │       └─────────────────┘
└─────────────────┘
```

## Entities

### vip_accounts

Represents an outdoor influencer whose gear content is curated on GearShack.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Display name (e.g., "Darwin onthetrail") |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier (e.g., "darwin-onthetrail") |
| bio | TEXT | NOT NULL | VIP biography/description |
| avatar_url | TEXT | NOT NULL | URL to VIP's avatar image |
| social_links | JSONB | NOT NULL, DEFAULT '{}' | Social media links (youtube, instagram, website) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'curated' | 'curated' or 'claimed' |
| is_featured | BOOLEAN | NOT NULL, DEFAULT false | Show in Featured VIPs section |
| claimed_by_user_id | UUID | REFERENCES profiles(id) | User who claimed this VIP account |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| archived_at | TIMESTAMPTZ | NULL | Soft delete timestamp (for takedowns) |
| archive_reason | TEXT | NULL | Reason for archival (takedown request, etc.) |

**Validation Rules**:
- `name`: 2-100 characters, no leading/trailing whitespace
- `slug`: lowercase alphanumeric + hyphens only, 2-100 characters
- `social_links`: Must contain at least one of: youtube, instagram, website
- `status`: ENUM of 'curated', 'claimed'

**State Transitions**:
```
[created] → curated
curated → claimed (via claim flow)
curated → archived (via takedown)
claimed → archived (via takedown)
archived → (permanent delete after 30 days)
```

**Indexes**:
- `idx_vip_accounts_slug` ON slug
- `idx_vip_accounts_status` ON status WHERE archived_at IS NULL
- `idx_vip_accounts_featured` ON is_featured WHERE is_featured = true AND archived_at IS NULL
- `idx_vip_accounts_claimed_by` ON claimed_by_user_id WHERE claimed_by_user_id IS NOT NULL

---

### vip_loadouts

A gear list attributed to a VIP, typically sourced from a YouTube video or blog post.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| vip_id | UUID | NOT NULL, REFERENCES vip_accounts(id) ON DELETE CASCADE | Parent VIP |
| name | VARCHAR(200) | NOT NULL | Loadout name (e.g., "PCT 2022 (2,650 miles)") |
| slug | VARCHAR(200) | NOT NULL | URL-safe loadout identifier |
| source_url | TEXT | NOT NULL | Original video/blog URL |
| description | TEXT | | Loadout description |
| trip_type | VARCHAR(100) | | Trail or activity type (e.g., "Pacific Crest Trail") |
| date_range | VARCHAR(100) | | Trip dates (e.g., "April - September 2022") |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | 'draft' or 'published' |
| is_source_available | BOOLEAN | NOT NULL, DEFAULT true | Source URL accessibility status |
| source_checked_at | TIMESTAMPTZ | | Last source URL check timestamp |
| created_by | UUID | REFERENCES profiles(id) | Admin who created this |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| published_at | TIMESTAMPTZ | | When loadout was published |

**Validation Rules**:
- `name`: 2-200 characters
- `slug`: lowercase alphanumeric + hyphens, unique per VIP
- `source_url`: Valid URL matching allowed platforms (YouTube, Vimeo, Instagram, blogs)
- `status`: ENUM of 'draft', 'published'

**Indexes**:
- `idx_vip_loadouts_vip_id` ON vip_id
- `idx_vip_loadouts_slug` ON (vip_id, slug) UNIQUE
- `idx_vip_loadouts_status` ON status WHERE status = 'published'
- `idx_vip_loadouts_source_check` ON source_checked_at WHERE is_source_available = false

---

### vip_loadout_items

Individual gear items within a VIP loadout.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| vip_loadout_id | UUID | NOT NULL, REFERENCES vip_loadouts(id) ON DELETE CASCADE | Parent loadout |
| gear_item_id | UUID | REFERENCES gear_items(id) | Link to gear database item |
| name | VARCHAR(200) | NOT NULL | Item name (fallback if no gear_item_id) |
| brand | VARCHAR(100) | | Item brand |
| weight_grams | INTEGER | NOT NULL | Weight in grams (from video) |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Item quantity |
| notes | TEXT | | Admin notes (e.g., "Darwin says this replaced his Duplex") |
| category | VARCHAR(50) | NOT NULL | Gear category (shelter, sleep, clothing, etc.) |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Display order within category |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Validation Rules**:
- `weight_grams`: > 0
- `quantity`: >= 1
- `category`: Must be valid gear category from taxonomy

**Indexes**:
- `idx_vip_loadout_items_loadout` ON vip_loadout_id
- `idx_vip_loadout_items_gear` ON gear_item_id WHERE gear_item_id IS NOT NULL

---

### vip_follows

Tracks which users follow which VIP accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| follower_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User following |
| vip_id | UUID | NOT NULL, REFERENCES vip_accounts(id) ON DELETE CASCADE | VIP being followed |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Follow timestamp |

**Primary Key**: (follower_id, vip_id)

**Indexes**:
- `idx_vip_follows_vip` ON vip_id (for follower count queries)
- `idx_vip_follows_follower` ON follower_id (for user's followed VIPs)

---

### vip_bookmarks

Tracks which VIP loadouts users have bookmarked.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User bookmarking |
| vip_loadout_id | UUID | NOT NULL, REFERENCES vip_loadouts(id) ON DELETE CASCADE | Bookmarked loadout |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Bookmark timestamp |

**Primary Key**: (user_id, vip_loadout_id)

**Indexes**:
- `idx_vip_bookmarks_user` ON user_id (for user's bookmarks)
- `idx_vip_bookmarks_loadout` ON vip_loadout_id (for bookmark count)

---

### claim_invitations

Tracks claim invitations sent to VIPs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| vip_id | UUID | NOT NULL, REFERENCES vip_accounts(id) ON DELETE CASCADE | VIP to claim |
| email | VARCHAR(255) | NOT NULL | VIP's email address |
| token | VARCHAR(100) | UNIQUE, NOT NULL | Secure claim token |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'verified', 'claimed', 'expired' |
| created_by | UUID | REFERENCES profiles(id) | Admin who created invitation |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Invitation creation |
| expires_at | TIMESTAMPTZ | NOT NULL | Invitation expiry (30 days from creation) |
| verified_at | TIMESTAMPTZ | | Email verification timestamp |
| claimed_at | TIMESTAMPTZ | | Claim completion timestamp |

**Validation Rules**:
- `email`: Valid email format
- `token`: Secure random string, 64 characters
- `status`: ENUM of 'pending', 'verified', 'claimed', 'expired'

**Indexes**:
- `idx_claim_invitations_token` ON token
- `idx_claim_invitations_vip` ON vip_id
- `idx_claim_invitations_status` ON status WHERE status = 'pending'

---

## JSONB Schemas

### social_links (vip_accounts.social_links)

```typescript
interface SocialLinks {
  youtube?: string;    // Full YouTube channel URL
  instagram?: string;  // Full Instagram profile URL
  website?: string;    // Personal website/blog URL
  twitter?: string;    // Twitter/X profile URL (optional)
}

// Example
{
  "youtube": "https://www.youtube.com/@DarwinOnTheTrail",
  "instagram": "https://www.instagram.com/darwinonthetrail",
  "website": "https://darwinonthetrail.com"
}
```

---

## Row Level Security (RLS) Policies

### vip_accounts

```sql
-- Public read for non-archived VIPs
CREATE POLICY "vip_accounts_public_read" ON vip_accounts
  FOR SELECT USING (archived_at IS NULL);

-- Admin write access
CREATE POLICY "vip_accounts_admin_write" ON vip_accounts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Claimed VIP can update their own account
CREATE POLICY "vip_accounts_claimed_update" ON vip_accounts
  FOR UPDATE USING (
    claimed_by_user_id = auth.uid()
  );
```

### vip_loadouts

```sql
-- Public read for published loadouts of non-archived VIPs
CREATE POLICY "vip_loadouts_public_read" ON vip_loadouts
  FOR SELECT USING (
    status = 'published' AND
    vip_id IN (SELECT id FROM vip_accounts WHERE archived_at IS NULL)
  );

-- Admin full access
CREATE POLICY "vip_loadouts_admin_all" ON vip_loadouts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Claimed VIP can manage their loadouts
CREATE POLICY "vip_loadouts_claimed_manage" ON vip_loadouts
  FOR ALL USING (
    vip_id IN (
      SELECT id FROM vip_accounts
      WHERE claimed_by_user_id = auth.uid()
    )
  );
```

### vip_follows

```sql
-- Users can read their own follows
CREATE POLICY "vip_follows_own_read" ON vip_follows
  FOR SELECT USING (follower_id = auth.uid());

-- Authenticated users can follow/unfollow
CREATE POLICY "vip_follows_authenticated_write" ON vip_follows
  FOR ALL USING (follower_id = auth.uid());
```

### vip_bookmarks

```sql
-- Users can read their own bookmarks
CREATE POLICY "vip_bookmarks_own_read" ON vip_bookmarks
  FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can bookmark/unbookmark
CREATE POLICY "vip_bookmarks_authenticated_write" ON vip_bookmarks
  FOR ALL USING (user_id = auth.uid());
```

---

## Database Functions

### get_vip_follower_count(vip_id UUID)

Returns the follower count for a VIP account.

```sql
CREATE OR REPLACE FUNCTION get_vip_follower_count(p_vip_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM vip_follows
  WHERE vip_id = p_vip_id;
$$ LANGUAGE SQL STABLE;
```

### get_vip_loadout_count(vip_id UUID)

Returns the published loadout count for a VIP account.

```sql
CREATE OR REPLACE FUNCTION get_vip_loadout_count(p_vip_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM vip_loadouts
  WHERE vip_id = p_vip_id AND status = 'published';
$$ LANGUAGE SQL STABLE;
```

### notify_vip_followers(vip_id UUID, loadout_id UUID)

Creates notifications for all followers when a new loadout is published.

```sql
CREATE OR REPLACE FUNCTION notify_vip_followers(p_vip_id UUID, p_loadout_id UUID)
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  INSERT INTO notifications (user_id, type, data, created_at)
  SELECT
    vf.follower_id,
    'vip_new_loadout',
    jsonb_build_object(
      'vip_id', p_vip_id,
      'loadout_id', p_loadout_id,
      'vip_name', va.name,
      'loadout_name', vl.name
    ),
    NOW()
  FROM vip_follows vf
  JOIN vip_accounts va ON va.id = p_vip_id
  JOIN vip_loadouts vl ON vl.id = p_loadout_id
  WHERE vf.vip_id = p_vip_id;

  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Order

1. `20251229_001_create_vip_accounts.sql` - VIP accounts table
2. `20251229_002_create_vip_loadouts.sql` - VIP loadouts table
3. `20251229_003_create_vip_loadout_items.sql` - Loadout items table
4. `20251229_004_create_vip_follows.sql` - VIP follows table
5. `20251229_005_create_vip_bookmarks.sql` - Bookmarks table
6. `20251229_006_create_claim_invitations.sql` - Claim invitations table
7. `20251229_007_create_vip_functions.sql` - Database functions
8. `20251229_008_create_vip_rls_policies.sql` - RLS policies
9. `20251229_009_create_vip_indexes.sql` - Additional indexes
