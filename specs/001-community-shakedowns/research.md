# Research: Community Shakedowns

**Feature**: 001-community-shakedowns
**Date**: 2025-12-29
**Status**: Complete

## Executive Summary

Research complete. All technical questions resolved. The Community Shakedowns feature can be implemented using established patterns from the bulletin board and social graph features. No new dependencies required.

## Pattern Analysis

### 1. Feed & Pagination Patterns

**Source**: `hooks/bulletin/useBulletinBoard.ts`

The bulletin board provides the exact infinite scroll pattern needed:

```typescript
// Cursor-based pagination with +1 fetch to detect hasMore
let query = supabase
  .from('v_bulletin_posts_with_author')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(limit + 1);

if (params.cursor) {
  query = query.lt('created_at', params.cursor);
}
```

**Key patterns to reuse**:
- Loading states: `'idle' | 'loading' | 'loading-more' | 'error'`
- Intersection Observer (0.1 threshold) for infinite scroll trigger
- 20 items per batch (matches spec requirement)
- Optimistic updates: `addPostOptimistically()`, `removePost()`, `updatePost()`

**Adaptation for shakedowns**:
- Create `useShakedownsFeed` hook following same state machine
- Add filtering by: trip_type, season, experience_level, status
- Friend prioritization via JOIN with friendships table

### 2. Real-Time Updates Pattern

**Source**: `hooks/social/useFriendActivity.ts`

```typescript
useEffect(() => {
  if (!user?.id) return;

  unsubscribeRef.current = subscribeToFriendActivities(user.id, handleNewActivity);

  return () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
  };
}, [user?.id, handleNewActivity]);
```

**Key patterns**:
- `useRef` for subscription cleanup
- Duplicate prevention: `if (prev.some((a) => a.id === activity.id))`
- Max items cap (50) to prevent memory bloat
- Filter matching in handler

**Adaptation for shakedowns**:
- Subscribe to new feedback on user's shakedowns
- Subscribe to new shakedowns from friends
- Notify when feedback marked as helpful

### 3. Nested Comments/Replies

**Source**: `supabase/migrations/20251229100003_create_bulletin_replies.sql`

```sql
CREATE TABLE bulletin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES bulletin_posts(id),
  parent_reply_id UUID REFERENCES bulletin_replies(id),  -- Self-referential
  depth SMALLINT CHECK (depth IN (1, 2)),  -- Max 2 levels
  is_deleted BOOLEAN DEFAULT false
);
```

**Source**: `components/bulletin/ReplyThread.tsx`

```typescript
function ReplyNode({ node, depth }: { node: ReplyNode; depth: number }) {
  return (
    <div className={cn('border-l-2', depth === 2 && 'ml-4')}>
      {node.children.map((child) => (
        <ReplyNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

**Adaptation for shakedowns**:
- Use `depth CHECK (depth IN (1, 2, 3))` for 3-level nesting (spec requirement)
- Same recursive component pattern with depth tracking
- Tree construction via `buildReplyTree()` helper

### 4. Privacy & RLS Policies

**Source**: Bulletin RLS patterns + Social privacy

```sql
-- Pattern for Public/Friends Only/Private visibility
CREATE POLICY "shakedowns_read"
  ON shakedowns FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND (
      privacy = 'public'
      OR owner_id = auth.uid()
      OR (privacy = 'friends_only' AND is_friend(owner_id, auth.uid()))
    )
  );
```

**Key patterns**:
- RPC function `is_friend()` for friendship check
- Multi-condition USING clause for privacy levels
- Owner always has access

### 5. Soft-Delete & Archival

**Source**: `supabase/migrations/20251229100002_create_bulletin_posts.sql`

```sql
-- Soft-delete + archive pattern
is_deleted BOOLEAN DEFAULT false,
is_archived BOOLEAN DEFAULT false,

-- Cron job for 90-day archival
SELECT cron.schedule(
  'archive-old-shakedowns',
  '0 0 * * *',
  $$UPDATE shakedowns
    SET status = 'archived'
    WHERE status = 'completed'
    AND completed_at < now() - INTERVAL '90 days'$$
);
```

**Adaptation for shakedowns**:
- Status enum: `'open' | 'completed' | 'archived'`
- `completed_at` timestamp for archival calculation
- Completed shakedowns still allow viewing, just no new feedback

### 6. Reputation & Voting

**Source**: Bulletin moderation patterns

```sql
-- Denormalized helpful count on profiles
ALTER TABLE profiles ADD COLUMN helpful_votes_received INTEGER DEFAULT 0;

-- Trigger to increment on vote
CREATE FUNCTION increment_helpful_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET helpful_votes_received = helpful_votes_received + 1
  WHERE id = (SELECT author_id FROM shakedown_feedback WHERE id = NEW.feedback_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Badge thresholds** (from spec):
- 10 votes: "Shakedown Helper"
- 50 votes: "Trail Expert"
- 100 votes: "Community Legend"

### 7. UI Component Patterns

**Source**: `components/bulletin/`

| Component | Pattern | Shakedown Equivalent |
|-----------|---------|---------------------|
| `BulletinBoard.tsx` | Container with infinite scroll | `ShakedownFeed.tsx` |
| `PostCard.tsx` | Feed item card | `ShakedownCard.tsx` |
| `PostComposer.tsx` | Modal form with validation | `ShakedownCreator.tsx` |
| `ReplyThread.tsx` | Nested replies | `FeedbackSection.tsx` |
| `ReplyComposer.tsx` | Inline reply input | `FeedbackComposer.tsx` |
| `ReportModal.tsx` | Moderation dialog | `ReportFeedbackModal.tsx` |
| `TagFilter.tsx` | Filter chips | `ShakedownFilters.tsx` |

### 8. Error Handling

**Source**: `components/bulletin/BulletinBoard.tsx`

```typescript
if (isPostError(error)) {
  switch (error.type) {
    case 'rate_limit':
      toast.error(t('errors.rateLimitPosts', { limit: DAILY_LIMIT }));
      break;
    case 'duplicate':
      toast.error(t('errors.duplicatePost'));
      break;
    case 'banned':
      toast.error(t('errors.banned'));
      break;
  }
}
```

**Adaptation for shakedowns**:
- Custom error types: `ShakedownError`
- Type guards: `isShakedownError()`
- i18n keys for all error messages

## Technical Decisions

### Confirmed Approaches

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feed pagination | Cursor-based (created_at) | Matches bulletin pattern, handles real-time inserts |
| State management | Zustand store per feature | Matches existing hooks pattern |
| Form validation | react-hook-form + Zod | Established pattern, type-safe |
| Markdown rendering | react-markdown (existing) | Already used in project |
| Privacy checks | RLS + RPC functions | Database-enforced security |
| Archival | pg_cron scheduled job | Matches bulletin pattern |
| Notifications | Supabase Realtime | Existing subscription pattern |

### No New Dependencies Required

All functionality can be achieved with existing stack:
- `@supabase/supabase-js` - Database & realtime
- `zustand` - State management
- `react-hook-form` + `zod` - Forms
- `shadcn/ui` - UI components
- `next-intl` - i18n
- `sonner` - Toast notifications
- `lucide-react` - Icons

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to handle item-specific feedback? | Feedback table has optional `gear_item_id` FK |
| How to prioritize friends in feed? | LEFT JOIN friendships, ORDER BY is_friend DESC, created_at DESC |
| How to handle loadout changes during feedback? | Notification to active reviewers via Realtime |
| Edit window for feedback? | 30-minute window (spec), RLS policy enforces |
| Spam moderation workflow? | Soft-hide immediately, admin reviews in 24h |

## Migration Strategy

Database changes will be additive:
1. Create `shakedowns` table
2. Create `shakedown_feedback` table (with self-referential replies)
3. Create `shakedown_helpful_votes` table
4. Create `shakedown_bookmarks` table
5. Add `helpful_votes_received` and `shakedowns_reviewed` to profiles
6. Create RLS policies for all tables
7. Create views for feed queries
8. Schedule archival cron job

No breaking changes to existing tables.
