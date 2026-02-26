# Quickstart: VIP Loadouts (Feature 052)

**Date**: 2025-12-29
**Branch**: `052-vip-loadouts`
**Estimated Implementation Time**: 3-4 sprints (P1+P2 stories)

## Overview

VIP Loadouts enables GearShack to showcase outdoor influencers' gear setups as browseable, followable profiles. This quickstart covers the essential implementation path from database to UI.

## Prerequisites

- [ ] Supabase project with auth configured
- [ ] Existing `profiles`, `gear_items`, `loadouts`, `notifications` tables
- [ ] Social Graph (Feature 001) implemented for follow patterns
- [ ] Admin dashboard with role-based access

## Quick Setup

### 1. Database Migration

Run migrations in order:

```bash
# From project root
npx supabase db push
```

Key tables created:
- `vip_accounts` - VIP profiles
- `vip_loadouts` - VIP gear lists
- `vip_loadout_items` - Gear items in loadouts
- `vip_follows` - User-VIP follow relationships
- `vip_bookmarks` - Saved loadouts

### 2. Type Definitions

Create `types/vip.ts`:

```typescript
import { z } from 'zod';

// Zod schemas for validation
export const socialLinksSchema = z.object({
  youtube: z.string().url().optional(),
  instagram: z.string().url().optional(),
  website: z.string().url().optional(),
  twitter: z.string().url().optional(),
}).refine(data => data.youtube || data.instagram || data.website, {
  message: "At least one social link required"
});

export const vipAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  bio: z.string(),
  avatarUrl: z.string().url(),
  socialLinks: socialLinksSchema,
  status: z.enum(['curated', 'claimed']),
  isFeatured: z.boolean(),
  claimedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const vipLoadoutSchema = z.object({
  id: z.string().uuid(),
  vipId: z.string().uuid(),
  name: z.string().min(2).max(200),
  slug: z.string(),
  sourceUrl: z.string().url(),
  description: z.string().optional(),
  tripType: z.string().optional(),
  dateRange: z.string().optional(),
  status: z.enum(['draft', 'published']),
  isSourceAvailable: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
});

// TypeScript types derived from schemas
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type VipAccount = z.infer<typeof vipAccountSchema>;
export type VipLoadout = z.infer<typeof vipLoadoutSchema>;

export interface VipLoadoutItem {
  id: string;
  vipLoadoutId: string;
  gearItemId: string | null;
  name: string;
  brand: string | null;
  weightGrams: number;
  quantity: number;
  notes: string | null;
  category: string;
  sortOrder: number;
}

export interface VipWithStats extends VipAccount {
  followerCount: number;
  loadoutCount: number;
  isFollowing?: boolean;
}

export interface VipLoadoutWithItems extends VipLoadout {
  vip: VipWithStats;
  items: VipLoadoutItem[];
  totalWeightGrams: number;
  isBookmarked?: boolean;
}
```

### 3. Core Hook Pattern

Create `hooks/vip/useVipProfile.ts`:

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VipWithStats, VipLoadout } from '@/types/vip';

interface UseVipProfileState {
  status: 'idle' | 'loading' | 'success' | 'error';
  vip: VipWithStats | null;
  loadouts: VipLoadout[];
  error: string | null;
}

export function useVipProfile(slug: string) {
  const [state, setState] = useState<UseVipProfileState>({
    status: 'idle',
    vip: null,
    loadouts: [],
    error: null,
  });

  useEffect(() => {
    if (!slug) return;

    const fetchVip = async () => {
      setState(prev => ({ ...prev, status: 'loading' }));
      const supabase = createClient();

      try {
        // Fetch VIP profile
        const { data: vip, error: vipError } = await supabase
          .from('vip_accounts')
          .select('*, follower_count:vip_follows(count), loadout_count:vip_loadouts(count)')
          .eq('slug', slug)
          .is('archived_at', null)
          .single();

        if (vipError) throw vipError;

        // Fetch published loadouts
        const { data: loadouts, error: loadoutsError } = await supabase
          .from('vip_loadouts')
          .select('*')
          .eq('vip_id', vip.id)
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        if (loadoutsError) throw loadoutsError;

        setState({
          status: 'success',
          vip: {
            ...vip,
            followerCount: vip.follower_count?.[0]?.count ?? 0,
            loadoutCount: vip.loadout_count?.[0]?.count ?? 0,
          },
          loadouts: loadouts ?? [],
          error: null,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to load VIP',
        }));
      }
    };

    fetchVip();
  }, [slug]);

  return state;
}
```

### 4. Follow Hook with Optimistic Updates

Create `hooks/vip/useVipFollow.ts`:

```typescript
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseVipFollowOptions {
  vipId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
}

export function useVipFollow({
  vipId,
  initialIsFollowing,
  initialFollowerCount,
}: UseVipFollowOptions) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(async () => {
    if (isPending) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Handle unauthenticated - redirect to login
      return { requiresAuth: true };
    }

    // Optimistic update
    const previousState = { isFollowing, followerCount };
    setIsFollowing(!isFollowing);
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
    setIsPending(true);

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('vip_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('vip_id', vipId);
      } else {
        // Follow
        await supabase
          .from('vip_follows')
          .insert({ follower_id: user.id, vip_id: vipId });
      }
    } catch (error) {
      // Rollback on error
      setIsFollowing(previousState.isFollowing);
      setFollowerCount(previousState.followerCount);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [vipId, isFollowing, followerCount, isPending]);

  return { isFollowing, followerCount, toggle, isPending };
}
```

### 5. VIP Profile Page

Create `app/[locale]/vip/[slug]/page.tsx`:

```typescript
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { VipProfileHeader } from '@/components/vip/VipProfileHeader';
import { VipLoadoutCard } from '@/components/vip/VipLoadoutCard';
import { createServerClient } from '@/lib/supabase/server';

interface VipPageProps {
  params: { locale: string; slug: string };
}

export default async function VipPage({ params }: VipPageProps) {
  const supabase = createServerClient();

  const { data: vip } = await supabase
    .from('vip_accounts')
    .select('*')
    .eq('slug', params.slug)
    .is('archived_at', null)
    .single();

  if (!vip) notFound();

  const { data: loadouts } = await supabase
    .from('vip_loadouts')
    .select('*')
    .eq('vip_id', vip.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <VipProfileHeader vip={vip} />

      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Loadouts</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadouts?.map((loadout) => (
            <VipLoadoutCard
              key={loadout.id}
              loadout={loadout}
              vipSlug={params.slug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### 6. Component Pattern

Create `components/vip/VipFollowButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useVipFollow } from '@/hooks/vip/useVipFollow';
import { useTranslations } from 'next-intl';

interface VipFollowButtonProps {
  vipId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
}

export function VipFollowButton({
  vipId,
  initialIsFollowing,
  initialFollowerCount,
}: VipFollowButtonProps) {
  const t = useTranslations('vip');
  const { isFollowing, followerCount, toggle, isPending } = useVipFollow({
    vipId,
    initialIsFollowing,
    initialFollowerCount,
  });

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'default'}
      onClick={toggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isFollowing ? t('following') : t('follow')}
      <span className="ml-2 text-muted-foreground">
        {followerCount.toLocaleString()}
      </span>
    </Button>
  );
}
```

## Translation Keys

Add to `messages/en/vip.json`:

```json
{
  "title": "VIP Loadouts",
  "featuredVips": "Featured VIP Loadouts",
  "follow": "Follow",
  "following": "Following",
  "curatedAccount": "This is a curated account featuring content from {name}",
  "verifiedVip": "Verified VIP",
  "sourceUnavailable": "Source unavailable",
  "basedOn": "Based on",
  "watchVideo": "Watch Original Video",
  "copyToLoadout": "Copy to My Loadout",
  "copyConfirm": "Create a loadout based on {vipName}'s {loadoutName}?",
  "itemsAswishlist": "Items will be added as wishlist items",
  "compare": "Compare to VIP",
  "bookmark": "Bookmark",
  "bookmarked": "Bookmarked",
  "loadouts": "Loadouts",
  "followers": "followers",
  "noLoadouts": "No loadouts yet",
  "searchPlaceholder": "Search VIPs by name or trip type..."
}
```

## Key Implementation Notes

1. **Feature-Sliced Light**: All business logic in hooks (`useVipProfile`, `useVipFollow`), UI stateless
2. **Optimistic Updates**: Follow/bookmark use optimistic updates with rollback
3. **SEO URLs**: Use slugs in routes (`/vip/[slug]/[loadout-slug]`)
4. **RLS Policies**: Public read for published content, admin write for mutations
5. **State Machine**: Use status tracking (`idle → loading → success/error`)

## Testing Checklist

- [ ] VIP discovery on Community page
- [ ] VIP profile with loadouts list
- [ ] Follow/unfollow with counter update
- [ ] Copy loadout to user account
- [ ] Bookmark loadout
- [ ] Admin: Create VIP account
- [ ] Admin: Create and publish loadout
- [ ] Follower notifications on publish

## Next Steps

After implementing core functionality:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement P1 stories first (Discovery + Admin Curation)
3. Add P2 features (Follow, Copy, Search)
4. Complete P3 features (Compare, Claim, Bookmark)
