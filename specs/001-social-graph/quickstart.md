# Quickstart Guide: Social Graph (Friends + Follow System)

**Feature**: 001-social-graph | **Date**: 2025-12-28

This guide provides setup instructions and development workflow for the Social Graph feature.

---

## Prerequisites

Before starting development:

1. **Supabase CLI** installed and configured
2. **Node.js 20+** and npm
3. Access to GearShack Supabase project
4. Existing messaging system operational (Feature 046)

---

## Setup Steps

### 1. Create Feature Branch

```bash
git checkout 003-app-shell-branding
git pull origin 003-app-shell-branding
git checkout -b feature/001-social-graph
```

### 2. Apply Database Migrations

Create migration files in order:

```bash
# Create migration file
supabase migration new create_social_graph_enums
supabase migration new create_friend_requests
supabase migration new create_friendships
supabase migration new rename_user_friends_to_follows
supabase migration new create_friend_activities
supabase migration new update_profiles_social
supabase migration new update_notifications_types
supabase migration new create_social_rpc_functions
supabase migration new enable_realtime_activities
```

Apply migrations:

```bash
supabase db push
```

### 3. Regenerate TypeScript Types

After migrations are applied:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > types/supabase.ts
```

### 4. Create Type Definitions

Create `types/social.ts` with types from [data-model.md](./data-model.md#typescript-types).

### 5. Create Directory Structure

```bash
mkdir -p hooks/social
mkdir -p components/social
mkdir -p app/[locale]/friends
mkdir -p app/[locale]/following
```

---

## Development Workflow

### Hook Development Order

Develop hooks in this order (dependencies flow downward):

1. **useSocialQueries.ts** - Database query helpers
2. **useFollowing.ts** - Follow/unfollow (simplest)
3. **useFriendRequests.ts** - Send/accept/decline requests
4. **useFriendships.ts** - View and manage friends
5. **useFriendActivity.ts** - Real-time activity feed
6. **useSocialPrivacy.ts** - Privacy settings
7. **useOnlineStatus.ts** - Extend existing presence for friends

### Component Development Order

1. **FollowButton.tsx** - Simple toggle
2. **FriendRequestButton.tsx** - Multi-state button
3. **OnlineStatusIndicator.tsx** - Green dot / Away
4. **EmptyStateCard.tsx** - Reusable empty states
5. **FollowingList.tsx** - Following page
6. **FriendsList.tsx** - Friends page with search/filter
7. **FriendActivityFeed.tsx** - Activity feed
8. **PrivacySettingsPanel.tsx** - Privacy controls
9. **MutualFriendsDisplay.tsx** - Profile integration

### Page Development

1. `/friends` - Friends list with requests
2. `/following` - Following list
3. `/settings/privacy` - Extend existing settings

---

## Testing Strategy

### Unit Tests (hooks)

```bash
npm test -- --watch hooks/social
```

Test cases for `useFriendRequests`:
- ✅ Can send request after message exchange
- ❌ Cannot send without message exchange
- ❌ Cannot exceed rate limit
- ✅ Can accept incoming request
- ✅ Creates friendship on acceptance
- ✅ Can cancel pending request

### Integration Tests

Test RPC functions with Supabase client:

```typescript
// tests/integration/social/friend-request-flow.test.ts
describe('Friend Request Flow', () => {
  it('creates friendship after acceptance', async () => {
    // 1. Setup: Create conversation with message exchange
    // 2. Send friend request
    // 3. Accept request
    // 4. Verify friendship exists
    // 5. Verify notifications created
  });
});
```

### E2E Tests

```typescript
// tests/e2e/social-graph.spec.ts
test('complete friend workflow', async ({ page }) => {
  // Login as user A
  // Send message to user B
  // Send friend request to user B
  // Login as user B
  // Accept friend request
  // Verify friend appears in list
  // Test activity feed updates
});
```

---

## Key Implementation Notes

### 1. Friendship Canonical Ordering

Always use `LEAST/GREATEST` when querying friendships:

```typescript
// Correct
const areFriends = await supabase.rpc('are_friends', {
  p_user1: currentUserId,
  p_user2: targetUserId,
});

// The RPC handles ordering internally
```

### 2. Rate Limiting Integration

Use existing rate limit function:

```typescript
const { data } = await supabase.rpc('check_and_increment_rate_limit', {
  p_user_id: userId,
  p_endpoint: 'friend_request',
  p_limit: 20,
  p_window_hours: 24,
});

if (data.exceeded) {
  throw new Error(`Rate limit exceeded. Resets at ${data.resets_at}`);
}
```

### 3. Realtime Activity Feed

Subscribe to friend activities:

```typescript
const channel = supabase
  .channel('friend-activities')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'friend_activities',
      filter: `user_id=in.(${friendIds.join(',')})`,
    },
    (payload) => {
      // Add to activity feed
    }
  )
  .subscribe();
```

### 4. Online Status Privacy

Filter presence based on privacy settings:

```typescript
const visibleOnlineUsers = onlineUsers.filter((userId) => {
  const privacy = userPrivacySettings.get(userId);
  if (privacy === 'everyone') return true;
  if (privacy === 'friends_only') return areFriends(currentUser, userId);
  return false;
});
```

---

## Common Issues & Solutions

### Issue: "No message exchange" error

**Cause**: Users haven't both sent at least one message in a conversation.

**Solution**: Ensure conversation exists AND both parties have sent messages:

```sql
-- Debug query
SELECT
  c.id,
  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id = 'user1_id') as user1_msgs,
  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id = 'user2_id') as user2_msgs
FROM conversations c
JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = 'user1_id'
JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = 'user2_id'
WHERE c.type = 'direct';
```

### Issue: Duplicate friendship records

**Cause**: Not using canonical ordering (user_id < friend_id).

**Solution**: The `friendships` table constraint ensures `user_id < friend_id`. Use the RPC functions which handle ordering automatically.

### Issue: Activity feed not updating in real-time

**Cause**: Realtime not enabled or filter incorrect.

**Solution**:
1. Verify Realtime is enabled on `friend_activities` table
2. Check friend IDs in filter are current
3. Ensure RLS policy allows viewing

---

## Performance Considerations

### Friend List Pagination

For users with many friends (>100):

```typescript
const fetchFriends = async (page = 0, pageSize = 50) => {
  const { data } = await supabase.rpc('get_friends_paginated', {
    p_limit: pageSize,
    p_offset: page * pageSize,
  });
  return data;
};
```

### Activity Feed Caching

Cache activities locally with Zustand:

```typescript
const useActivityStore = create<ActivityStore>((set) => ({
  activities: [],
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 100), // Keep last 100
    })),
}));
```

### Presence Optimization

Batch presence updates instead of individual calls:

```typescript
// Update every 30 seconds instead of on every action
useEffect(() => {
  const interval = setInterval(() => {
    channel.track({ userId, lastSeen: Date.now() });
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## Checklist Before PR

- [ ] All migrations applied successfully
- [ ] TypeScript types generated and imported
- [ ] All hooks have unit tests
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] No TypeScript errors (`npm run lint`)
- [ ] RLS policies verified
- [ ] Realtime subscriptions tested
- [ ] Privacy settings tested
- [ ] Rate limiting verified
- [ ] i18n strings added for all user-facing text
- [ ] Accessibility reviewed (Semantics widgets)
- [ ] Mobile responsive design tested

---

## Next Steps

After completing this feature:

1. Run `/speckit.tasks` to generate task breakdown
2. Create individual task PRs
3. Request code review
4. Merge to main branch
