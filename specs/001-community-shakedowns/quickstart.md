# Quickstart: Community Shakedowns

**Feature**: 001-community-shakedowns
**Date**: 2025-12-29

## Prerequisites

Before implementing this feature, ensure:

1. **Existing Features**:
   - Loadout system is working (for linking shakedowns)
   - User profiles exist (for author info)
   - Notification system is functional (for feedback alerts)
   - Social graph is implemented (for friend prioritization)

2. **Database**:
   - Supabase project is configured
   - `profiles`, `loadouts`, `gear_items` tables exist
   - `friendships` table exists (from social-graph feature)

3. **Environment**:
   - `.env.local` has Supabase credentials
   - Next.js 16+ running with App Router

## Implementation Order

### Phase 1: Database Setup

1. **Run migrations** (create in order):
   ```bash
   # Create enum types
   supabase migration new 001_shakedown_enums

   # Create main tables
   supabase migration new 002_shakedowns_table
   supabase migration new 003_shakedown_feedback
   supabase migration new 004_shakedown_helpful_votes
   supabase migration new 005_shakedown_bookmarks
   supabase migration new 006_shakedown_badges

   # Create views
   supabase migration new 007_shakedown_views

   # Create RLS policies
   supabase migration new 008_shakedown_rls

   # Create triggers and functions
   supabase migration new 009_shakedown_triggers

   # Add profile extensions
   supabase migration new 010_profile_reputation

   # Apply
   supabase db push
   ```

2. **Verify schema**:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'shakedown%';
   ```

### Phase 2: Types & Utilities

1. **Create types file** at `types/shakedown.ts`:
   - Core entities: `Shakedown`, `ShakedownFeedback`, etc.
   - Input types for mutations
   - Query params types
   - Constants

2. **Create utility file** at `lib/shakedown-utils.ts`:
   - `buildFeedbackTree()` - converts flat list to nested tree
   - `canEditFeedback()` - checks 30-minute window
   - `formatShakedownDate()` - date formatting helpers

### Phase 3: Custom Hooks

Create in `hooks/shakedowns/`:

1. **`useShakedowns.ts`** (P1 - Feed):
   - Cursor-based pagination (20 items)
   - Filter by status, experience, season
   - Search by trip name
   - Friend prioritization sort

2. **`useShakedown.ts`** (P1 - Detail):
   - Fetch single shakedown with loadout
   - Include feedback tree
   - Track user's helpful votes

3. **`useShakedownMutations.ts`** (P1 - CRUD):
   - `createShakedown()`
   - `updateShakedown()`
   - `deleteShakedown()`
   - `completeShakedown()`
   - `reopenShakedown()`

4. **`useFeedback.ts`** (P1 - Feedback):
   - `createFeedback()`
   - `updateFeedback()`
   - `deleteFeedback()`
   - `reportFeedback()`
   - `markAsHelpful()`

5. **`useShakedownFilters.ts`** (P2 - Filters):
   - Zustand store for filter state
   - Persisted to URL params

6. **`useShakedownNotifications.ts`** (P2 - Realtime):
   - Supabase Realtime subscriptions
   - New feedback notifications
   - Helpful vote notifications

### Phase 4: API Routes

Create in `app/api/shakedowns/`:

```
app/api/shakedowns/
├── route.ts                    # GET list, POST create
├── [id]/
│   ├── route.ts                # GET detail, PATCH update, DELETE
│   ├── complete/route.ts       # POST
│   └── reopen/route.ts         # POST
├── feedback/
│   ├── route.ts                # POST create
│   └── [id]/
│       ├── route.ts            # GET, PATCH, DELETE
│       └── report/route.ts     # POST
├── helpful/
│   └── route.ts                # POST, DELETE, GET
└── bookmarks/
    ├── route.ts                # GET list, POST create
    └── [id]/route.ts           # PATCH, DELETE
```

### Phase 5: UI Components

Create in `components/shakedowns/`:

**Priority 1 (MVP)**:
1. `ShakedownFeed.tsx` - Feed container with infinite scroll
2. `ShakedownCard.tsx` - Card in feed
3. `ShakedownDetail.tsx` - Full view with loadout
4. `ShakedownCreator.tsx` - Creation form/modal
5. `FeedbackSection.tsx` - Feedback list + composer
6. `FeedbackItem.tsx` - Single feedback with replies

**Priority 2**:
7. `ItemFeedbackModal.tsx` - Item-specific feedback
8. `HelpfulButton.tsx` - Mark as helpful
9. `StatusBadge.tsx` - Open/Complete/Archived
10. `ShakedownFilters.tsx` - Filter controls

**Priority 3**:
11. `BookmarkButton.tsx` - Bookmark toggle
12. `ShareModal.tsx` - Share to bulletin/social
13. `ExpertBadge.tsx` - Reputation display

### Phase 6: Pages

Create in `app/[locale]/community/shakedowns/`:

```
app/[locale]/community/shakedowns/
├── page.tsx          # Feed page
├── new/
│   └── page.tsx      # Create form
└── [id]/
    └── page.tsx      # Detail page
```

## Testing Checklist

### Unit Tests (Vitest)

- [ ] `buildFeedbackTree()` correctly nests replies
- [ ] `canEditFeedback()` respects 30-minute window
- [ ] Filter logic works correctly
- [ ] Pagination cursors generate correctly

### Integration Tests

- [ ] Create shakedown from loadout
- [ ] Add general feedback
- [ ] Add item-specific feedback
- [ ] Reply to feedback (test depth limit)
- [ ] Mark as helpful (verify badge award)
- [ ] Complete shakedown (verify no new feedback)
- [ ] Privacy: friends-only access check

### E2E Tests (Playwright)

- [ ] Full flow: Create → Feedback → Complete
- [ ] Infinite scroll loads more items
- [ ] Filters apply correctly
- [ ] Bookmark and retrieve
- [ ] Report spam (verify soft-hide)

## Common Patterns

### Infinite Scroll (from bulletin)

```typescript
// In component
const loadMoreRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    { threshold: 0.1 }
  );

  if (loadMoreRef.current) observer.observe(loadMoreRef.current);
  return () => observer.disconnect();
}, [hasMore, isLoading, loadMore]);
```

### Nested Replies (recursive component)

```typescript
function FeedbackNode({ node, depth }: { node: FeedbackNode; depth: number }) {
  if (depth > 3) return null; // Safety limit

  return (
    <div className={cn('border-l-2 pl-4', depth > 1 && 'ml-4')}>
      <FeedbackContent feedback={node} />
      {node.children.map((child) => (
        <FeedbackNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

### Optimistic Updates

```typescript
const markAsHelpful = async (feedbackId: string) => {
  // Optimistic update
  setVotes((prev) => [...prev, feedbackId]);

  try {
    await supabase.from('shakedown_helpful_votes').insert({
      feedback_id: feedbackId,
      voter_id: userId,
    });
  } catch (error) {
    // Rollback on error
    setVotes((prev) => prev.filter((id) => id !== feedbackId));
    toast.error(t('errors.voteFailed'));
  }
};
```

## i18n Keys

Add to `messages/en.json` and `messages/de.json`:

```json
{
  "shakedowns": {
    "title": "Community Shakedowns",
    "create": "Request Shakedown",
    "tripName": "Trip Name",
    "dates": "Trip Dates",
    "experienceLevel": "Experience Level",
    "concerns": "Specific Concerns",
    "privacy": "Privacy",
    "status": {
      "open": "Open",
      "completed": "Completed",
      "archived": "Archived"
    },
    "feedback": {
      "add": "Add Feedback",
      "reply": "Reply",
      "helpful": "Helpful",
      "report": "Report"
    },
    "errors": {
      "createFailed": "Failed to create shakedown",
      "feedbackFailed": "Failed to post feedback",
      "depthExceeded": "Maximum reply depth reached"
    }
  }
}
```

## Dependencies

No new dependencies required. Uses existing:
- `@supabase/supabase-js` - Database
- `zustand` - State management
- `react-hook-form` + `zod` - Forms
- `shadcn/ui` - UI components
- `sonner` - Toasts
- `next-intl` - i18n
- `lucide-react` - Icons
