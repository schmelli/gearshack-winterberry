# Data Model: Community Shakedowns

**Feature**: 001-community-shakedowns
**Date**: 2025-12-29

## Overview

The Community Shakedowns feature introduces 5 new database tables and extends the existing `profiles` table with reputation fields. The model follows established patterns from the bulletin board and social graph features.

## Entity Relationship Diagram

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────────┐
│   profiles   │────<│  shakedowns   │────<│ shakedown_feedback  │
└──────────────┘     └───────────────┘     └─────────────────────┘
       │                    │                        │
       │                    │                        │ (self-ref)
       │                    ▼                        ▼
       │           ┌───────────────┐     ┌─────────────────────┐
       │           │   loadouts    │     │  shakedown_helpful  │
       │           └───────────────┘     │       _votes        │
       │                                 └─────────────────────┘
       │           ┌───────────────┐
       └──────────<│  shakedown    │
                   │  _bookmarks   │
                   └───────────────┘
```

## Database Schema

### New Tables

#### 1. `shakedowns`

Primary table for community shakedown requests.

```sql
CREATE TABLE shakedowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Linking
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Trip Context (from spec FR-002)
  trip_name VARCHAR(100) NOT NULL,
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  experience_level experience_level NOT NULL,
  concerns TEXT,  -- Optional: specific areas for feedback

  -- Privacy (from spec FR-003, FR-004)
  privacy shakedown_privacy NOT NULL DEFAULT 'friends_only',
  share_token VARCHAR(32) UNIQUE,  -- For public shareable URLs (FR-005)

  -- Status & Lifecycle (from spec FR-019, FR-020, FR-023)
  status shakedown_status NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Denormalized Counts (for performance)
  feedback_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_reason VARCHAR(200),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_shakedowns_owner ON shakedowns(owner_id);
CREATE INDEX idx_shakedowns_loadout ON shakedowns(loadout_id);
CREATE INDEX idx_shakedowns_status ON shakedowns(status) WHERE is_hidden = false;
CREATE INDEX idx_shakedowns_feed ON shakedowns(created_at DESC)
  WHERE is_hidden = false AND status = 'open';
CREATE INDEX idx_shakedowns_share_token ON shakedowns(share_token)
  WHERE share_token IS NOT NULL;
```

#### 2. `shakedown_feedback`

Feedback/comments on shakedowns with support for item-specific and nested replies.

```sql
CREATE TABLE shakedown_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES shakedown_feedback(id) ON DELETE CASCADE,  -- For replies
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,  -- Item-specific (FR-008)

  -- Content (FR-009)
  content TEXT NOT NULL,
  content_html TEXT,  -- Pre-rendered markdown for performance

  -- Nesting (FR-010: max 3 levels)
  depth SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT depth_limit CHECK (depth BETWEEN 1 AND 3),

  -- Metrics
  helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_reason VARCHAR(200),

  -- Edit tracking (FR-011: 30-minute window)
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedback_shakedown ON shakedown_feedback(shakedown_id);
CREATE INDEX idx_feedback_author ON shakedown_feedback(author_id);
CREATE INDEX idx_feedback_parent ON shakedown_feedback(parent_id);
CREATE INDEX idx_feedback_item ON shakedown_feedback(gear_item_id)
  WHERE gear_item_id IS NOT NULL;
CREATE INDEX idx_feedback_visible ON shakedown_feedback(shakedown_id, created_at)
  WHERE is_hidden = false;
```

#### 3. `shakedown_helpful_votes`

Tracks "Mark as Helpful" votes (FR-022).

```sql
CREATE TABLE shakedown_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  feedback_id UUID NOT NULL REFERENCES shakedown_feedback(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_vote UNIQUE(feedback_id, voter_id)
);

-- Index for checking if user voted
CREATE INDEX idx_helpful_votes_feedback ON shakedown_helpful_votes(feedback_id);
CREATE INDEX idx_helpful_votes_voter ON shakedown_helpful_votes(voter_id);
```

#### 4. `shakedown_bookmarks`

User bookmarks for shakedowns (FR-014 via User Story 6).

```sql
CREATE TABLE shakedown_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,

  -- Optional note
  note VARCHAR(200),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_bookmark UNIQUE(user_id, shakedown_id)
);

-- Index
CREATE INDEX idx_bookmarks_user ON shakedown_bookmarks(user_id, created_at DESC);
```

#### 5. `shakedown_badges`

Badge definitions and awards (FR-024, FR-025).

```sql
CREATE TABLE shakedown_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Badge Type
  badge_type shakedown_badge NOT NULL,

  -- Awarded
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint
  CONSTRAINT unique_badge UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_badges_user ON shakedown_badges(user_id);
```

### Extended Tables

#### `profiles` (additions)

```sql
-- Add reputation fields (FR-024, FR-026)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedown_helpful_received INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedowns_reviewed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedowns_created INTEGER NOT NULL DEFAULT 0;
```

### Enums

```sql
-- Shakedown privacy levels
CREATE TYPE shakedown_privacy AS ENUM ('public', 'friends_only', 'private');

-- Shakedown status
CREATE TYPE shakedown_status AS ENUM ('open', 'completed', 'archived');

-- Experience levels (if not exists)
CREATE TYPE experience_level AS ENUM (
  'beginner',
  'intermediate',
  'experienced',
  'expert'
);

-- Badge types
CREATE TYPE shakedown_badge AS ENUM (
  'shakedown_helper',    -- 10 helpful votes
  'trail_expert',        -- 50 helpful votes
  'community_legend'     -- 100 helpful votes
);
```

## Views

### `v_shakedowns_feed`

Optimized view for feed queries with author info.

```sql
CREATE VIEW v_shakedowns_feed AS
SELECT
  s.id,
  s.owner_id,
  s.loadout_id,
  s.trip_name,
  s.trip_start_date,
  s.trip_end_date,
  s.experience_level,
  s.concerns,
  s.privacy,
  s.status,
  s.feedback_count,
  s.helpful_count,
  s.created_at,
  s.updated_at,
  -- Author info
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  -- Loadout summary
  l.name AS loadout_name,
  l.total_weight_grams,
  l.item_count
FROM shakedowns s
JOIN profiles p ON s.owner_id = p.id
JOIN loadouts l ON s.loadout_id = l.id
WHERE s.is_hidden = false;
```

### `v_shakedown_feedback_with_author`

Feedback with author info for display.

```sql
CREATE VIEW v_shakedown_feedback_with_author AS
SELECT
  f.id,
  f.shakedown_id,
  f.author_id,
  f.parent_id,
  f.gear_item_id,
  f.content,
  f.content_html,
  f.depth,
  f.helpful_count,
  f.is_hidden,
  f.is_edited,
  f.created_at,
  f.updated_at,
  -- Author info
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  p.shakedown_helpful_received AS author_reputation,
  -- Gear item info (if item-specific)
  g.name AS gear_item_name
FROM shakedown_feedback f
JOIN profiles p ON f.author_id = p.id
LEFT JOIN gear_items g ON f.gear_item_id = g.id
WHERE f.is_hidden = false;
```

## RLS Policies

### `shakedowns`

```sql
-- Read: Respect privacy settings
CREATE POLICY "shakedowns_select" ON shakedowns FOR SELECT TO authenticated
USING (
  is_hidden = false
  AND (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR (privacy = 'friends_only' AND is_friend(owner_id, auth.uid()))
  )
);

-- Insert: Authenticated users
CREATE POLICY "shakedowns_insert" ON shakedowns FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Update: Owner only, status changes
CREATE POLICY "shakedowns_update" ON shakedowns FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Delete: Owner only (soft-delete via update)
CREATE POLICY "shakedowns_delete" ON shakedowns FOR DELETE TO authenticated
USING (owner_id = auth.uid());
```

### `shakedown_feedback`

```sql
-- Read: Anyone can read visible feedback on accessible shakedowns
CREATE POLICY "feedback_select" ON shakedown_feedback FOR SELECT TO authenticated
USING (
  is_hidden = false
  AND EXISTS (
    SELECT 1 FROM shakedowns s
    WHERE s.id = shakedown_id
    AND s.is_hidden = false
  )
);

-- Insert: Can comment on open shakedowns you can view
CREATE POLICY "feedback_insert" ON shakedown_feedback FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM shakedowns s
    WHERE s.id = shakedown_id
    AND s.status = 'open'
  )
);

-- Update: Author only, within 30-minute window
CREATE POLICY "feedback_update" ON shakedown_feedback FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (
  author_id = auth.uid()
  AND (
    is_hidden = true  -- Soft-delete always allowed
    OR created_at > now() - INTERVAL '30 minutes'  -- Edit window
  )
);
```

### `shakedown_helpful_votes`

```sql
-- Insert: Shakedown owner votes on feedback
CREATE POLICY "helpful_insert" ON shakedown_helpful_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM shakedown_feedback f
    JOIN shakedowns s ON f.shakedown_id = s.id
    WHERE f.id = feedback_id
    AND s.owner_id = auth.uid()
    AND f.author_id != auth.uid()  -- Can't vote on own feedback
  )
);

-- Delete: Voter can remove their vote
CREATE POLICY "helpful_delete" ON shakedown_helpful_votes FOR DELETE TO authenticated
USING (voter_id = auth.uid());
```

## Triggers

### Denormalized Count Updates

```sql
-- Feedback count on shakedowns
CREATE FUNCTION update_shakedown_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shakedowns SET feedback_count = feedback_count + 1
    WHERE id = NEW.shakedown_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shakedowns SET feedback_count = feedback_count - 1
    WHERE id = OLD.shakedown_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feedback_count
AFTER INSERT OR DELETE ON shakedown_feedback
FOR EACH ROW EXECUTE FUNCTION update_shakedown_feedback_count();

-- Helpful votes count
CREATE FUNCTION update_helpful_counts()
RETURNS TRIGGER AS $$
DECLARE
  feedback_author UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update feedback helpful_count
    UPDATE shakedown_feedback
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.feedback_id
    RETURNING author_id INTO feedback_author;

    -- Update author's profile reputation
    UPDATE profiles
    SET shakedown_helpful_received = shakedown_helpful_received + 1
    WHERE id = feedback_author;

    -- Check for badge awards
    PERFORM check_and_award_badges(feedback_author);

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shakedown_feedback
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.feedback_id
    RETURNING author_id INTO feedback_author;

    UPDATE profiles
    SET shakedown_helpful_received = shakedown_helpful_received - 1
    WHERE id = feedback_author;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_helpful_count
AFTER INSERT OR DELETE ON shakedown_helpful_votes
FOR EACH ROW EXECUTE FUNCTION update_helpful_counts();
```

### Badge Award Function

```sql
CREATE FUNCTION check_and_award_badges(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  helpful_count INTEGER;
BEGIN
  SELECT shakedown_helpful_received INTO helpful_count
  FROM profiles WHERE id = user_uuid;

  -- Award badges at thresholds
  IF helpful_count >= 10 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'shakedown_helper')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF helpful_count >= 50 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'trail_expert')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF helpful_count >= 100 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (user_uuid, 'community_legend')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Archival Cron Job

```sql
-- Archive completed shakedowns after 90 days (FR-023)
SELECT cron.schedule(
  'archive-completed-shakedowns',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  UPDATE shakedowns
  SET
    status = 'archived',
    archived_at = now()
  WHERE status = 'completed'
  AND completed_at < now() - INTERVAL '90 days'
  $$
);
```

## TypeScript Types

See `types/shakedown.ts` for corresponding TypeScript interfaces. Key types:

```typescript
// Core entities
interface Shakedown { ... }
interface ShakedownFeedback { ... }
interface ShakedownWithAuthor extends Shakedown { ... }
interface FeedbackWithAuthor extends ShakedownFeedback { ... }

// Input types
interface CreateShakedownInput { ... }
interface CreateFeedbackInput { ... }

// Query params
interface ShakedownsQueryParams { ... }

// State types
type ShakedownLoadingState = 'idle' | 'loading' | 'loading-more' | 'error';
```
