# Data Model: Community Bulletin Board

**Feature**: 051-community-bulletin-board
**Date**: 2025-12-29
**Database**: Supabase (PostgreSQL)

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│     profiles        │       │  bulletin_posts     │
│  (existing table)   │       │                     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ author_id (FK)      │
│ display_name        │       │ id (PK)             │
│ avatar_url          │       │ content             │
│ created_at          │       │ tag                 │
└─────────────────────┘       │ linked_content_type │
         ▲                    │ linked_content_id   │
         │                    │ is_deleted          │
         │                    │ is_archived         │
         │                    │ created_at          │
         │                    │ updated_at          │
         │                    └─────────────────────┘
         │                             ▲
         │                             │ post_id
         │                             │
         │                    ┌─────────────────────┐
         │                    │  bulletin_replies   │
         │                    ├─────────────────────┤
         └────────────────────│ author_id (FK)      │
                              │ id (PK)             │
                              │ post_id (FK)        │
                              │ parent_reply_id     │
                              │ content             │
                              │ depth               │
                              │ is_deleted          │
                              │ created_at          │
                              │ updated_at          │
                              └─────────────────────┘
                                       ▲
                                       │
                              ┌─────────────────────┐
                              │  bulletin_reports   │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ reporter_id (FK)    │
                              │ target_type         │
                              │ target_id           │
                              │ reason              │
                              │ details             │
                              │ status              │
                              │ resolved_by         │
                              │ resolved_at         │
                              │ created_at          │
                              └─────────────────────┘
```

## Enums

### post_tag

```sql
CREATE TYPE post_tag AS ENUM (
  'question',
  'shakedown',
  'trade',
  'trip_planning',
  'gear_advice',
  'other'
);
```

### linked_content_type

```sql
CREATE TYPE linked_content_type AS ENUM (
  'loadout',
  'shakedown',
  'marketplace_item'
);
```

### report_reason

```sql
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'off_topic',
  'other'
);
```

### report_status

```sql
CREATE TYPE report_status AS ENUM (
  'pending',
  'resolved',
  'dismissed'
);
```

### moderation_action

```sql
CREATE TYPE moderation_action AS ENUM (
  'delete_content',
  'warn_user',
  'ban_1d',
  'ban_7d',
  'ban_permanent',
  'dismiss'
);
```

## Tables

### bulletin_posts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique post identifier |
| `author_id` | UUID | FK → profiles.id, NOT NULL | Post author |
| `content` | VARCHAR(500) | NOT NULL | Post text (max 500 chars) |
| `tag` | post_tag | NULL | Optional category tag |
| `linked_content_type` | linked_content_type | NULL | Type of linked content |
| `linked_content_id` | UUID | NULL | ID of linked loadout/shakedown/item |
| `is_deleted` | BOOLEAN | DEFAULT false | Soft delete flag |
| `is_archived` | BOOLEAN | DEFAULT false | Archive flag (90+ days old) |
| `reply_count` | INTEGER | DEFAULT 0 | Denormalized reply count |
| `content_tsvector` | TSVECTOR | GENERATED | Full-text search vector |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_bulletin_posts_author` on `author_id`
- `idx_bulletin_posts_created` on `created_at DESC`
- `idx_bulletin_posts_tag` on `tag` WHERE `tag IS NOT NULL`
- `idx_bulletin_posts_search` GIN on `content_tsvector`
- `idx_bulletin_posts_active` on `created_at DESC` WHERE `is_deleted = false AND is_archived = false`

**Constraints**:
- `chk_content_length`: `length(content) <= 500`
- `chk_linked_content`: `(linked_content_type IS NULL) = (linked_content_id IS NULL)`

### bulletin_replies

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique reply identifier |
| `post_id` | UUID | FK → bulletin_posts.id, NOT NULL | Parent post |
| `author_id` | UUID | FK → profiles.id, NOT NULL | Reply author |
| `parent_reply_id` | UUID | FK → bulletin_replies.id, NULL | Parent reply (for nesting) |
| `content` | TEXT | NOT NULL | Reply content (markdown allowed) |
| `depth` | INTEGER | DEFAULT 1, CHECK (depth <= 2) | Nesting level (1 or 2) |
| `is_deleted` | BOOLEAN | DEFAULT false | Soft delete flag |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_bulletin_replies_post` on `post_id, created_at ASC`
- `idx_bulletin_replies_author` on `author_id`
- `idx_bulletin_replies_parent` on `parent_reply_id` WHERE `parent_reply_id IS NOT NULL`

**Constraints**:
- `chk_depth_consistency`: If `parent_reply_id IS NOT NULL` then `depth = 2`
- `chk_no_self_reference`: `id != parent_reply_id`

### bulletin_reports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique report identifier |
| `reporter_id` | UUID | FK → profiles.id, NOT NULL | User who reported |
| `target_type` | VARCHAR(10) | NOT NULL, CHECK IN ('post', 'reply') | Type of reported content |
| `target_id` | UUID | NOT NULL | ID of reported post/reply |
| `reason` | report_reason | NOT NULL | Report reason category |
| `details` | TEXT | NULL | Optional additional details |
| `status` | report_status | DEFAULT 'pending' | Resolution status |
| `resolved_by` | UUID | FK → profiles.id, NULL | Moderator who resolved |
| `resolved_at` | TIMESTAMPTZ | NULL | Resolution timestamp |
| `action_taken` | moderation_action | NULL | Action taken by moderator |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Report timestamp |

**Indexes**:
- `idx_bulletin_reports_target` on `target_type, target_id`
- `idx_bulletin_reports_status` on `status` WHERE `status = 'pending'`
- `idx_bulletin_reports_reporter` on `reporter_id`

**Constraints**:
- Unique on `(reporter_id, target_type, target_id)` - one report per user per item

### user_bulletin_bans (extends existing moderation)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique ban identifier |
| `user_id` | UUID | FK → profiles.id, UNIQUE | Banned user |
| `banned_by` | UUID | FK → profiles.id | Moderator who banned |
| `reason` | TEXT | NOT NULL | Ban reason |
| `expires_at` | TIMESTAMPTZ | NULL | NULL = permanent |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Ban start time |

## Functions & Triggers

### update_reply_count()

Trigger function to maintain `reply_count` on bulletin_posts.

```sql
CREATE OR REPLACE FUNCTION update_bulletin_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bulletin_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = true AND OLD.is_deleted = false) THEN
    UPDATE bulletin_posts SET reply_count = reply_count - 1 WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### check_bulletin_rate_limit()

RPC function for atomic rate limit checking.

```sql
CREATE OR REPLACE FUNCTION check_bulletin_rate_limit(
  p_user_id UUID,
  p_action_type VARCHAR(10) -- 'post' or 'reply'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_daily_count INTEGER;
  v_daily_limit INTEGER;
  v_account_age INTERVAL;
BEGIN
  -- Get account age
  SELECT now() - created_at INTO v_account_age FROM profiles WHERE id = p_user_id;

  -- Determine limit based on action type and account age
  IF p_action_type = 'post' THEN
    v_daily_limit := CASE WHEN v_account_age < INTERVAL '7 days' THEN 3 ELSE 10 END;
  ELSE
    v_daily_limit := 50;
  END IF;

  -- Count today's actions
  SELECT COUNT(*) INTO v_daily_count
  FROM (
    SELECT created_at FROM bulletin_posts WHERE author_id = p_user_id AND created_at > CURRENT_DATE
    UNION ALL
    SELECT created_at FROM bulletin_replies WHERE author_id = p_user_id AND created_at > CURRENT_DATE
  ) AS actions
  WHERE CASE WHEN p_action_type = 'post' THEN TRUE ELSE FALSE END;

  RETURN v_daily_count < v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### check_duplicate_post()

RPC function to detect duplicate posts within 1 hour.

```sql
CREATE OR REPLACE FUNCTION check_duplicate_bulletin_post(
  p_user_id UUID,
  p_content VARCHAR(500)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bulletin_posts
    WHERE author_id = p_user_id
      AND content = p_content
      AND created_at > now() - INTERVAL '1 hour'
      AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### archive_old_posts()

Scheduled function for nightly archival.

```sql
CREATE OR REPLACE FUNCTION archive_old_bulletin_posts()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE bulletin_posts
  SET is_archived = true
  WHERE is_archived = false
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

### bulletin_posts

```sql
-- Everyone can read non-deleted, non-archived posts (if authenticated)
CREATE POLICY "read_active_posts" ON bulletin_posts
  FOR SELECT TO authenticated
  USING (is_deleted = false AND is_archived = false);

-- Direct link access (ignores archive status)
CREATE POLICY "read_post_by_id" ON bulletin_posts
  FOR SELECT TO authenticated
  USING (is_deleted = false);

-- Users can create posts
CREATE POLICY "create_post" ON bulletin_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Authors can update their own posts (within edit window)
CREATE POLICY "update_own_post" ON bulletin_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND created_at > now() - INTERVAL '15 minutes')
  WITH CHECK (author_id = auth.uid());

-- Authors can soft-delete their own posts
CREATE POLICY "delete_own_post" ON bulletin_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid() AND is_deleted = true);
```

### bulletin_replies

```sql
-- Everyone can read non-deleted replies
CREATE POLICY "read_replies" ON bulletin_replies
  FOR SELECT TO authenticated
  USING (is_deleted = false);

-- Users can create replies (if not banned)
CREATE POLICY "create_reply" ON bulletin_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM user_bulletin_bans
      WHERE user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Authors can update/delete their own replies
CREATE POLICY "manage_own_reply" ON bulletin_replies
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
```

### bulletin_reports

```sql
-- Users can create reports
CREATE POLICY "create_report" ON bulletin_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Users can see their own reports (status only)
CREATE POLICY "read_own_reports" ON bulletin_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Moderators can see all reports (via separate view that hides reporter_id)
```

## Views

### v_bulletin_posts_with_author

Joins posts with author profile data for display.

```sql
CREATE VIEW v_bulletin_posts_with_author AS
SELECT
  p.id,
  p.content,
  p.tag,
  p.linked_content_type,
  p.linked_content_id,
  p.reply_count,
  p.created_at,
  p.updated_at,
  p.is_archived,
  u.id AS author_id,
  u.display_name AS author_name,
  u.avatar_url AS author_avatar
FROM bulletin_posts p
JOIN profiles u ON p.author_id = u.id
WHERE p.is_deleted = false;
```

### v_bulletin_reports_for_mods

Report view for moderators (excludes reporter identity).

```sql
CREATE VIEW v_bulletin_reports_for_mods AS
SELECT
  r.id,
  r.target_type,
  r.target_id,
  r.reason,
  r.details,
  r.status,
  r.created_at,
  COUNT(*) OVER (PARTITION BY r.target_type, r.target_id) AS report_count
FROM bulletin_reports r
WHERE r.status = 'pending'
ORDER BY report_count DESC, r.created_at ASC;
```

## State Transitions

### Post Lifecycle

```
[Created] ──────────────────────────────────────────────┐
    │                                                   │
    ▼ (15 min window)                                   │
[Editable] ─────► [Locked] ────► [Archived]            │
    │                │               │                  │
    ▼                ▼               ▼                  │
[Deleted]        [Deleted]      [Deleted]               │
    │                │               │                  │
    └────────────────┴───────────────┴──────────────────┘
                     │
                     ▼
            [Tombstone if has replies]
```

### Report Lifecycle

```
[Pending] ──┬──► [Resolved] (action taken)
            │
            └──► [Dismissed] (no action)
```

## Migration Order

1. Create enums
2. Create `bulletin_posts` table
3. Create `bulletin_replies` table
4. Create `bulletin_reports` table
5. Create `user_bulletin_bans` table
6. Create triggers and functions
7. Create RLS policies
8. Create views
