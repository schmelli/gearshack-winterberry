# API Contracts: Shared Loadout Enhancement

**Feature**: 048-shared-loadout-enhancement
**Date**: 2025-12-14

## Overview

This feature primarily uses Supabase client SDK for data operations rather than custom API endpoints. The contracts below document the data access patterns and server actions.

## Data Access Patterns

### 1. Fetch Shared Loadout with Owner

**Purpose**: Get shared loadout data with owner profile for page rendering

**Query** (Supabase Client):
```typescript
// lib/supabase/queries/sharing.ts

export async function getSharedLoadoutWithOwner(
  supabase: SupabaseClient,
  shareToken: string
): Promise<SharedLoadoutWithOwner | null> {
  const { data, error } = await supabase
    .from('loadout_shares')
    .select(`
      share_token,
      payload,
      allow_comments,
      created_at,
      owner:profiles!owner_id (
        id,
        display_name,
        avatar_url,
        trail_name,
        bio,
        location_name,
        instagram,
        facebook,
        youtube,
        website,
        messaging_privacy
      )
    `)
    .eq('share_token', shareToken)
    .single();

  if (error || !data) return null;

  return {
    shareToken: data.share_token,
    payload: data.payload as SharedLoadoutPayload,
    allowComments: data.allow_comments,
    createdAt: data.created_at,
    owner: data.owner ? mapProfileToOwner(data.owner) : null,
  };
}
```

**Response Shape**:
```typescript
interface SharedLoadoutWithOwner {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
  owner: SharedLoadoutOwner | null;
}
```

---

### 2. Fetch User's Gear Items for Matching

**Purpose**: Get current user's items to check for owned matches

**Query**:
```typescript
// hooks/useOwnedItemsCheck.ts

export function useOwnedItemsCheck(userId: string | null) {
  // Uses existing useGearItems hook
  const { items } = useGearItems(userId);

  const ownedSet = useMemo(() => {
    return new Set(
      items
        .filter(i => i.status === 'own')
        .map(i => normalizeForMatch(i.brand, i.name))
    );
  }, [items]);

  const checkOwned = useCallback((brand: string | null, name: string): boolean => {
    return ownedSet.has(normalizeForMatch(brand, name));
  }, [ownedSet]);

  return { checkOwned, ownedCount: ownedSet.size };
}
```

---

### 3. Fetch User's Wishlist Items

**Purpose**: Check which shared items are already on user's wishlist

**Query**:
```typescript
export function useWishlistCheck(userId: string | null) {
  const { items } = useGearItems(userId);

  const wishlistSet = useMemo(() => {
    return new Set(
      items
        .filter(i => i.status === 'wishlist')
        .map(i => normalizeForMatch(i.brand, i.name))
    );
  }, [items]);

  const isOnWishlist = useCallback((brand: string | null, name: string): boolean => {
    return wishlistSet.has(normalizeForMatch(brand, name));
  }, [wishlistSet]);

  return { isOnWishlist };
}
```

---

## Server Actions

### 4. Add Item to Wishlist

**Purpose**: Add a single item from shared loadout to user's wishlist

**Action** (Next.js Server Action):
```typescript
// actions/sharing.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface AddToWishlistInput {
  item: {
    name: string;
    brand: string | null;
    primaryImageUrl: string | null;
    categoryId: string | null;
    weightGrams: number | null;
    description: string | null;
  };
  sourceShareToken: string;
}

interface AddToWishlistResult {
  success: boolean;
  itemId?: string;
  error?: string;
}

export async function addItemToWishlist(
  input: AddToWishlistInput
): Promise<AddToWishlistResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('gear_items')
    .insert({
      user_id: user.id,
      name: input.item.name,
      brand: input.item.brand,
      primary_image_url: input.item.primaryImageUrl,
      category_id: input.item.categoryId,
      weight_grams: input.item.weightGrams,
      description: input.item.description,
      status: 'wishlist',
      condition: 'new',
      source_share_token: input.sourceShareToken,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[addItemToWishlist]', error);
    return { success: false, error: 'Failed to add item' };
  }

  revalidatePath('/inventory');
  return { success: true, itemId: data.id };
}
```

**Request Shape**:
```typescript
{
  item: {
    name: string;
    brand: string | null;
    primaryImageUrl: string | null;
    categoryId: string | null;
    weightGrams: number | null;
    description: string | null;
  };
  sourceShareToken: string;
}
```

**Response Shape**:
```typescript
{ success: true; itemId: string }
| { success: false; error: string }
```

---

### 5. Import Full Loadout to Wishlist

**Purpose**: Auto-import all items from shared loadout after signup

**Action**:
```typescript
// actions/sharing.ts

interface ImportLoadoutResult {
  success: boolean;
  itemsImported?: number;
  loadoutId?: string;
  error?: string;
}

export async function importLoadoutToWishlist(
  shareToken: string
): Promise<ImportLoadoutResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 1. Fetch the shared loadout
  const { data: share, error: fetchError } = await supabase
    .from('loadout_shares')
    .select('payload, loadout_id')
    .eq('share_token', shareToken)
    .single();

  if (fetchError || !share) {
    return { success: false, error: 'Shared loadout not found' };
  }

  const payload = share.payload as SharedLoadoutPayload;

  // 2. Create loadout copy for user
  const { data: newLoadout, error: loadoutError } = await supabase
    .from('loadouts')
    .insert({
      user_id: user.id,
      name: `${payload.loadout.name} (Imported)`,
      description: payload.loadout.description,
      activity_types: payload.loadout.activityTypes,
      seasons: payload.loadout.seasons,
    })
    .select('id')
    .single();

  if (loadoutError) {
    return { success: false, error: 'Failed to create loadout' };
  }

  // 3. Insert all items as wishlist
  const itemInserts = payload.items.map(item => ({
    user_id: user.id,
    name: item.name,
    brand: item.brand,
    primary_image_url: item.primaryImageUrl,
    category_id: item.categoryId,
    weight_grams: item.weightGrams,
    description: item.description || null,
    status: 'wishlist' as const,
    condition: 'new' as const,
    source_share_token: shareToken,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from('gear_items')
    .insert(itemInserts)
    .select('id');

  if (itemsError) {
    return { success: false, error: 'Failed to import items' };
  }

  // 4. Link items to the new loadout
  const loadoutItemInserts = insertedItems.map(item => ({
    loadout_id: newLoadout.id,
    gear_item_id: item.id,
    is_worn: false,
    is_consumable: false,
  }));

  await supabase.from('loadout_items').insert(loadoutItemInserts);

  revalidatePath('/loadouts');
  revalidatePath('/inventory');

  return {
    success: true,
    itemsImported: insertedItems.length,
    loadoutId: newLoadout.id,
  };
}
```

**Request**: `shareToken: string`

**Response Shape**:
```typescript
{ success: true; itemsImported: number; loadoutId: string }
| { success: false; error: string }
```

---

### 6. Fetch User Notifications

**Purpose**: Get notifications for the current user

**Query**:
```typescript
// lib/supabase/queries/notifications.ts

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getUserNotifications]', error);
    return [];
  }

  return data.map(mapDbNotificationToNotification);
}
```

---

### 7. Mark Notification as Read

**Purpose**: Update notification read status

**Action**:
```typescript
// actions/notifications.ts

'use server';

export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id); // RLS backup

  return { success: !error };
}
```

---

## Realtime Subscriptions

### 8. Subscribe to Notifications

**Purpose**: Receive new notifications in realtime

**Subscription**:
```typescript
// hooks/useNotifications.ts

export function useNotificationSubscription(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [
            mapDbNotificationToNotification(payload.new),
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { notifications };
}
```

---

## Error Handling

All operations follow this error response pattern:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string; // Optional error code for client handling
}
```

Common error codes:
- `NOT_AUTHENTICATED`: User not logged in
- `NOT_FOUND`: Resource doesn't exist
- `FORBIDDEN`: User lacks permission
- `VALIDATION_ERROR`: Invalid input data
- `INTERNAL_ERROR`: Server-side error

---

## Rate Limiting Considerations

The following operations should be rate-limited at the application level:

| Operation | Suggested Limit | Scope |
|-----------|-----------------|-------|
| addItemToWishlist | 10/minute | per user |
| importLoadoutToWishlist | 5/hour | per user |
| Post comment (existing) | 20/minute | per IP/user |
