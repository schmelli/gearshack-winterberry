# Social Features

**Status**: ✅ Active
**Feature**: 001-social-graph
**Implementation**: Dual-tier system (Following + Friends)
**Database**: `user_follows`, `friend_requests`, `friendships`, `friend_activities`, `online_status`

## Overview

Gearshack's social system has two tiers:

1. **Following** (one-way, no approval)
   - One-click to follow anyone
   - See their public activities
   - Asymmetric (you follow them, they don't follow you)

2. **Friends** (two-way, requires approval)
   - Must have prior message exchange
   - Send friend request (rate limited)
   - See private profile info
   - Enhanced privacy controls

---

## Core Concepts

### Dual-Tier Design

```
User A                    User B
   |                         |
   |----[Follow]------------>|  (one-click, no approval)
   |                         |
   |<---[Follow]-------------| (independent action)
   |                         |
   |                         |
   |----[Friend Request]---->|  (requires prior messaging)
   |                         |
   |<---[Accept]-------------| (becomes bidirectional friendship)
```

**Why two tiers?**
- **Following**: Low friction, public content, discovery
- **Friends**: High trust, private content, close connections

---

## Following System

### Data Model

```typescript
interface UserFollow {
  id: string;
  follower_id: string;    // Who is following
  following_id: string;   // Who is being followed
  created_at: Date;
}
```

**Constraints**:
- Unique `(follower_id, following_id)`
- Cannot follow yourself
- No approval needed

### Follow/Unfollow

```typescript
// Follow
await supabase.from('user_follows').insert({
  follower_id: currentUserId,
  following_id: targetUserId,
});

// Unfollow
await supabase.from('user_follows').delete()
  .eq('follower_id', currentUserId)
  .eq('following_id', targetUserId);
```

### Query Followers/Following

```typescript
// Get my followers
const { data: followers } = await supabase
  .from('user_follows')
  .select('follower:profiles!follower_id(*)')
  .eq('following_id', myId);

// Get who I'm following
const { data: following } = await supabase
  .from('user_follows')
  .select('following:profiles!following_id(*)')
  .eq('follower_id', myId);
```

### Follow Button

**Component**: `FollowButton.tsx`

**States**:
- Not following → "Follow" (primary button)
- Following → "Following" (secondary button, shows "Unfollow" on hover)
- Loading → Spinner
- Error → Toast notification

```tsx
<Button
  variant={isFollowing ? 'secondary' : 'primary'}
  onClick={isFollowing ? handleUnfollow : handleFollow}
  disabled={isLoading}
>
  {isLoading && <Spinner />}
  {isFollowing ? 'Following' : 'Follow'}
</Button>
```

---

## Friends System

### Requirements

**To send friend request**:
1. Must have exchanged messages (at least one conversation)
2. Not already friends
3. No pending request
4. Under rate limit (20/day)

### Data Models

#### Friend Request

```typescript
interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;        // Optional personal message
  expires_at: Date;        // 30 days from creation
  created_at: Date;
  updated_at: Date;
}
```

#### Friendship

```typescript
interface Friendship {
  id: string;
  user_id: string;         // Smaller UUID (canonical ordering)
  friend_id: string;       // Larger UUID
  created_at: Date;
}
```

**Canonical Ordering**: Always store with `user_id < friend_id` to avoid duplicates.

```typescript
// Enforce at database level
CHECK (user_id < friend_id)
```

### Sending Friend Request

**Flow**:
1. Check if messages exchanged
2. Check rate limit (20/day)
3. Check no existing request/friendship
4. Create request with 30-day expiry

```typescript
async function sendFriendRequest(toUserId: string, message?: string) {
  // 1. Verify message exchange
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${currentUserId},participant2_id.eq.${currentUserId}`)
    .or(`participant1_id.eq.${toUserId},participant2_id.eq.${toUserId}`)
    .limit(1);

  if (!conversations?.length) {
    throw new Error('Must have conversation before sending friend request');
  }

  // 2. Check rate limit (20/day)
  const { count } = await supabase
    .from('friend_requests')
    .select('id', { count: 'exact', head: true })
    .eq('from_user_id', currentUserId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (count >= 20) {
    throw new Error('Rate limit exceeded (20 requests per 24 hours)');
  }

  // 3. Create request
  const { error } = await supabase.from('friend_requests').insert({
    from_user_id: currentUserId,
    to_user_id: toUserId,
    message,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  if (error) throw error;
}
```

### Accepting Friend Request

```typescript
async function acceptFriendRequest(requestId: string) {
  // 1. Get request
  const { data: request } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request || request.status !== 'pending') {
    throw new Error('Invalid request');
  }

  // 2. Create friendship (canonical ordering)
  const [user_id, friend_id] = [request.from_user_id, request.to_user_id].sort();

  const { error: friendshipError } = await supabase
    .from('friendships')
    .insert({ user_id, friend_id });

  if (friendshipError) throw friendshipError;

  // 3. Update request status
  await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  // 4. Create notification
  await createNotification({
    user_id: request.from_user_id,
    type: 'friend_request_accepted',
    reference_id: requestId,
  });
}
```

### Checking Friendship

**Efficient O(1) check with Set**:

```typescript
// In component
const friendIds = useMemo(() => {
  return new Set(friendships.map(f =>
    f.user_id === currentUserId ? f.friend_id : f.user_id
  ));
}, [friendships, currentUserId]);

// Check if friend
const isFriend = friendIds.has(targetUserId);
```

**Database query**:
```sql
SELECT EXISTS(
  SELECT 1 FROM friendships
  WHERE (user_id = $1 AND friend_id = $2)
     OR (user_id = $2 AND friend_id = $1)
) AS is_friend;
```

---

## Friend Requests UI

### Incoming Requests

**Component**: `FriendRequestsList.tsx`

**Features**:
- List of pending requests
- Accept/Reject buttons
- Personal message display
- Expiry countdown

```tsx
<Card>
  <Avatar src={request.from_user.avatar_url} />
  <div>
    <h4>{request.from_user.display_name}</h4>
    {request.message && <p>{request.message}</p>}
    <p>Expires in {daysUntilExpiry} days</p>
  </div>
  <Button onClick={() => acceptRequest(request.id)}>Accept</Button>
  <Button variant="ghost" onClick={() => rejectRequest(request.id)}>
    Decline
  </Button>
</Card>
```

### Outgoing Requests

**Component**: `SentRequestsList.tsx`

**Features**:
- List of sent requests
- Status (pending/accepted/rejected)
- Cancel button (for pending)

---

## Friends List

**Component**: `FriendsList.tsx`

**Features**:
- Search friends by name
- Filter by online status
- Sort by (name, recent activity, mutual friends)
- Quick actions (message, unfriend)

### Search & Filter

```typescript
function filterFriends(
  friends: Friend[],
  search: string,
  onlineOnly: boolean
) {
  return friends.filter(friend => {
    // Search by name
    if (search) {
      const match = friend.display_name.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
    }

    // Filter online
    if (onlineOnly && !friend.is_online) {
      return false;
    }

    return true;
  });
}
```

### Sort Options

```typescript
type FriendSortOption = 'name' | 'recent' | 'mutual';

function sortFriends(friends: Friend[], sortBy: FriendSortOption) {
  switch (sortBy) {
    case 'name':
      return [...friends].sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      );
    case 'recent':
      return [...friends].sort((a, b) =>
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
    case 'mutual':
      return [...friends].sort((a, b) =>
        b.mutual_friends_count - a.mutual_friends_count
      );
  }
}
```

---

## Activity Feed

**Feature**: See what friends are doing
**Component**: `FriendActivityFeed.tsx`
**Database**: `friend_activities` table

### Activity Types

```typescript
type ActivityType =
  | 'loadout_created'
  | 'loadout_updated'
  | 'gear_added'
  | 'gear_updated'
  | 'shakedown_created'
  | 'bulletin_post'
  | 'vip_claimed';
```

### Activity Model

```typescript
interface FriendActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;

  // Polymorphic reference
  reference_id: string;
  reference_type: 'loadout' | 'gear_item' | 'shakedown' | 'bulletin_post' | 'vip_account';

  // Denormalized data for performance
  title: string;
  description?: string;
  image_url?: string;

  // Metadata
  metadata: {
    weight?: number;
    item_count?: number;
    cost?: number;
  };

  created_at: Date;
}
```

### Creating Activity

**Trigger** (when loadout created):
```sql
CREATE OR REPLACE FUNCTION create_loadout_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO friend_activities (
    user_id,
    activity_type,
    reference_id,
    reference_type,
    title,
    description,
    image_url,
    metadata
  ) VALUES (
    NEW.user_id,
    'loadout_created',
    NEW.id,
    'loadout',
    NEW.name,
    NEW.description,
    NEW.hero_image_url,
    jsonb_build_object(
      'weight', NEW.total_weight,
      'item_count', NEW.item_count,
      'cost', NEW.total_cost
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Fetching Feed

**Query**:
```typescript
const { data: activities } = await supabase
  .from('friend_activities')
  .select(`
    *,
    user:profiles!user_id(id, display_name, avatar_url)
  `)
  .in('user_id', friendUserIds)  // Only friends' activities
  .order('created_at', { ascending: false })
  .limit(50);
```

**Realtime subscription**:
```typescript
const channel = supabase
  .channel('friend-activities')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'friend_activities',
      filter: `user_id=in.(${friendUserIds.join(',')})`,
    },
    (payload) => {
      // Add new activity to feed
      setActivities(prev => [payload.new, ...prev]);
    }
  )
  .subscribe();
```

### Activity Card

```tsx
<Card>
  <div className="flex items-start gap-4">
    <Avatar src={activity.user.avatar_url} />
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <Link href={`/profile/${activity.user.id}`}>
          <strong>{activity.user.display_name}</strong>
        </Link>
        <span className="text-muted-foreground">
          {getActivityText(activity.activity_type)}
        </span>
        <time>{formatDistanceToNow(activity.created_at)}</time>
      </div>

      <Link href={getActivityLink(activity)}>
        <h4>{activity.title}</h4>
        {activity.description && <p>{activity.description}</p>}
      </Link>

      {activity.metadata && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {activity.metadata.weight && <span>{activity.metadata.weight}g</span>}
          {activity.metadata.item_count && <span>{activity.metadata.item_count} items</span>}
        </div>
      )}

      {activity.image_url && (
        <img src={activity.image_url} alt={activity.title} className="mt-2 rounded" />
      )}
    </div>
  </div>
</Card>
```

---

## Online Presence

**Feature**: See who's online
**Component**: `OnlineStatusIndicator.tsx`
**Database**: `online_status` table

### Status Model

```typescript
interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen_at: Date;
  session_id?: string;
  updated_at: Date;
}
```

### Heartbeat Pattern

**Client sends heartbeat every 60s**:
```typescript
useEffect(() => {
  if (!user) return;

  const interval = setInterval(async () => {
    await supabase.from('online_status').upsert({
      user_id: user.id,
      is_online: true,
      last_seen_at: new Date().toISOString(),
      session_id: sessionId,
    });
  }, 60_000);  // 60 seconds

  // Send immediately on mount
  supabase.from('online_status').upsert({
    user_id: user.id,
    is_online: true,
    last_seen_at: new Date().toISOString(),
    session_id: sessionId,
  });

  return () => clearInterval(interval);
}, [user, sessionId]);
```

**Server marks offline if `last_seen > 5 minutes`**:
```sql
-- Cron job (runs every minute)
UPDATE online_status
SET is_online = false
WHERE last_seen_at < (now() - INTERVAL '5 minutes')
  AND is_online = true;
```

### Indicator Component

```tsx
<div className="relative">
  <Avatar src={user.avatar_url} />
  {user.is_online && (
    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
  )}
</div>
```

**States**:
- Green dot: Online (active < 5 min ago)
- No dot: Offline

---

## Privacy Settings

**Component**: `PrivacySettingsPanel.tsx`

### Settings Model

```typescript
interface PrivacySettings {
  // Profile visibility
  privacy_level: 'public' | 'friends' | 'private';

  // Specific controls
  show_online_status: boolean;
  show_activity_feed: boolean;
  show_friends_list: boolean;
  show_loadouts: 'public' | 'friends' | 'private';
  show_inventory: 'public' | 'friends' | 'private';

  // Communication
  allow_messages_from: 'everyone' | 'friends' | 'none';
  allow_friend_requests: boolean;
}
```

### Presets

**Public** (discoverable):
- Profile: public
- Online status: visible
- Loadouts: public
- Inventory: public
- Messages: everyone

**Friends Only** (balanced):
- Profile: friends only
- Online status: visible
- Loadouts: friends only
- Inventory: friends only
- Messages: friends only

**Private** (locked down):
- Profile: private
- Online status: hidden
- Loadouts: private
- Inventory: private
- Messages: friends only

### RLS Enforcement

**Profile visibility**:
```sql
CREATE POLICY "Profile visibility" ON profiles
  FOR SELECT USING (
    CASE
      WHEN privacy_level = 'public' THEN true
      WHEN privacy_level = 'private' THEN id = auth.uid()
      WHEN privacy_level = 'friends' THEN (
        id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM friendships
          WHERE (user_id = auth.uid() AND friend_id = profiles.id)
             OR (user_id = profiles.id AND friend_id = auth.uid())
        )
      )
    END
  );
```

---

## Mutual Friends

**Feature**: See common friends
**Component**: `MutualFriendsDisplay.tsx`

### Query

```typescript
async function getMutualFriends(userId1: string, userId2: string) {
  // Get user1's friends
  const { data: user1Friends } = await supabase.rpc('get_user_friends', {
    target_user_id: userId1
  });

  // Get user2's friends
  const { data: user2Friends } = await supabase.rpc('get_user_friends', {
    target_user_id: userId2
  });

  // Intersection
  const mutual = user1Friends.filter(f1 =>
    user2Friends.some(f2 => f2.id === f1.id)
  );

  return mutual;
}
```

**RPC Function**:
```sql
CREATE OR REPLACE FUNCTION get_user_friends(target_user_id UUID)
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT) AS $$
  SELECT
    CASE
      WHEN f.user_id = target_user_id THEN p.id
      ELSE p2.id
    END AS id,
    CASE
      WHEN f.user_id = target_user_id THEN p.display_name
      ELSE p2.display_name
    END AS display_name,
    CASE
      WHEN f.user_id = target_user_id THEN p.avatar_url
      ELSE p2.avatar_url
    END AS avatar_url
  FROM friendships f
  LEFT JOIN profiles p ON f.friend_id = p.id
  LEFT JOIN profiles p2 ON f.user_id = p2.id
  WHERE f.user_id = target_user_id OR f.friend_id = target_user_id;
$$ LANGUAGE sql;
```

### Display

```tsx
{mutualFriends.length > 0 && (
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2">
      {mutualFriends.slice(0, 3).map(friend => (
        <Avatar key={friend.id} src={friend.avatar_url} className="border-2 border-background" />
      ))}
    </div>
    <span className="text-sm text-muted-foreground">
      {mutualFriends.length} mutual {mutualFriends.length === 1 ? 'friend' : 'friends'}
    </span>
  </div>
)}
```

---

## Performance Optimizations

### Friendship Check (O(1) with Set)

```typescript
// DON'T: O(n) array check for every user
const isFriend = friendships.some(f =>
  f.user_id === targetUserId || f.friend_id === targetUserId
);

// DO: O(1) Set check
const friendIds = useMemo(() => {
  return new Set(friendships.flatMap(f => [f.user_id, f.friend_id]));
}, [friendships]);

const isFriend = friendIds.has(targetUserId);
```

### Batch Friend Checks

```typescript
// Get friendship status for multiple users at once
const { data: friendships } = await supabase
  .from('friendships')
  .select('user_id, friend_id')
  .or(`user_id.in.(${userIds}),friend_id.in.(${userIds})`);

// Build bidirectional map
const friendMap = new Map<string, Set<string>>();
for (const f of friendships) {
  if (!friendMap.has(f.user_id)) friendMap.set(f.user_id, new Set());
  if (!friendMap.has(f.friend_id)) friendMap.set(f.friend_id, new Set());
  friendMap.get(f.user_id)!.add(f.friend_id);
  friendMap.get(f.friend_id)!.add(f.user_id);
}
```

---

## Related Docs

- [Database Schema](../architecture/database-schema.md)
- [Community Features](community-features.md)
- [Messaging System](messaging-system.md)

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**Feature**: 001-social-graph (71 tasks completed)
