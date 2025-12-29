# Quickstart: Community Bulletin Board

**Feature**: 051-community-bulletin-board
**Date**: 2025-12-29

## Prerequisites

- Node.js 18+ installed
- Supabase project with existing auth and profiles setup
- Access to Supabase dashboard for running migrations

## Setup Steps

### 1. Apply Database Migrations

Run these SQL scripts in Supabase SQL Editor in order:

```bash
# From specs/051-community-bulletin-board/ directory
# Copy each migration file to Supabase SQL Editor

1. supabase/migrations/YYYYMMDD_create_bulletin_enums.sql
2. supabase/migrations/YYYYMMDD_create_bulletin_posts.sql
3. supabase/migrations/YYYYMMDD_create_bulletin_replies.sql
4. supabase/migrations/YYYYMMDD_create_bulletin_reports.sql
5. supabase/migrations/YYYYMMDD_create_bulletin_functions.sql
6. supabase/migrations/YYYYMMDD_create_bulletin_rls.sql
```

### 2. Install Dependencies

No new dependencies required. Uses existing:
- `@supabase/supabase-js`
- `react-markdown` (if not installed: `npm install react-markdown`)
- `react-hook-form`
- `zod`

### 3. Create Type Definitions

Create `types/bulletin.ts` with types from `contracts/bulletin-api.md`.

### 4. Create Supabase Queries

Create `lib/supabase/bulletin-queries.ts` with query functions from `contracts/bulletin-api.md`.

### 5. Create i18n Files

Create translation files:
- `messages/en/bulletin.json`
- `messages/de/bulletin.json`

### 6. Create Hooks

Create hooks under `hooks/bulletin/`:
- `useBulletinBoard.ts` - Main board state
- `usePosts.ts` - Post CRUD
- `useReplies.ts` - Reply CRUD
- `usePostSearch.ts` - Search/filter
- `useReports.ts` - Report submission
- `index.ts` - Barrel export

### 7. Create Components

Create components under `components/bulletin/`:
- `BulletinBoard.tsx`
- `PostCard.tsx`
- `PostComposer.tsx`
- `ReplyThread.tsx`
- `ReplyComposer.tsx`
- `TagFilter.tsx`
- `SearchBar.tsx`
- `ReportModal.tsx`
- `EmptyState.tsx`
- `PostMenu.tsx`

### 8. Create Pages

Create pages:
- `app/[locale]/community/page.tsx` - Main bulletin board
- `app/[locale]/community/post/[postId]/page.tsx` - Direct post link

## Verification

### Manual Testing Checklist

1. **Post Creation**
   - [ ] Can create a post with <500 chars
   - [ ] Character counter shows count and turns red at 450
   - [ ] Can add optional tag
   - [ ] Post appears at top of feed immediately
   - [ ] Cannot create 11th post in one day (rate limit)

2. **Browsing**
   - [ ] Feed shows 20 most recent posts
   - [ ] Infinite scroll loads more posts
   - [ ] Can filter by tag
   - [ ] Search returns matching posts

3. **Replies**
   - [ ] Can reply to any post
   - [ ] Reply appears immediately
   - [ ] Can reply to a reply (max 2 levels)
   - [ ] Cannot reply to deleted post

4. **Edit/Delete**
   - [ ] Can edit own post within 15 minutes
   - [ ] Cannot edit after 15 minutes
   - [ ] Deleting post with no replies removes it
   - [ ] Deleting post with replies shows "[Deleted]"

5. **Reporting**
   - [ ] Can report any post
   - [ ] Report modal shows reason options
   - [ ] Confirmation toast on submit
   - [ ] Cannot report same content twice

6. **Empty State**
   - [ ] Empty board shows "Be the first to post!" CTA

### Database Verification

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'bulletin_%';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'bulletin_%';

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%bulletin%';
```

## Development Tips

### Testing Rate Limits

To test rate limiting without waiting:

```sql
-- Reset daily counts for a user (dev only!)
DELETE FROM bulletin_posts
WHERE author_id = 'your-test-user-id'
AND created_at > CURRENT_DATE;
```

### Testing Archival

To test archival without waiting 90 days:

```sql
-- Manually age a post (dev only!)
UPDATE bulletin_posts
SET created_at = now() - INTERVAL '91 days'
WHERE id = 'your-test-post-id';

-- Run archival function
SELECT archive_old_bulletin_posts();
```

### Debugging RLS

If queries return empty results unexpectedly:

```sql
-- Check if RLS is blocking
SET request.jwt.claims TO '{"sub": "your-user-id"}';

SELECT * FROM bulletin_posts
WHERE author_id = 'your-user-id';
```

## Common Issues

### "No posts appearing"
- Check RLS policies are correctly applied
- Verify user is authenticated
- Check `is_deleted` and `is_archived` flags

### "Rate limit not working"
- Verify `check_bulletin_rate_limit` function exists
- Check function is called before insert
- Verify account age calculation for new users

### "Search not finding posts"
- Verify `content_tsvector` column is populated
- Check trigger is updating tsvector on insert
- Use `to_tsquery` correctly (websearch format)

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Follow task order in `tasks.md`
3. Test each user story independently
4. Run full integration test before merge
