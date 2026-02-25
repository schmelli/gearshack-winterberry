'use client';

/**
 * VIP Profile Content Component
 *
 * Feature: 052-vip-loadouts
 * Task: T031
 *
 * Client component for VIP profile with follow functionality.
 */

import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle, Backpack } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VipProfileHeader } from './VipProfileHeader';
import { VipLoadoutCard } from './VipLoadoutCard';
import { useVipProfile } from '@/hooks/vip/useVipProfile';
import { useVipFollow } from '@/hooks/vip/useVipFollow';

// =============================================================================
// Types
// =============================================================================

interface VipProfileContentProps {
  slug: string;
}

// =============================================================================
// Component
// =============================================================================

export function VipProfileContent({ slug }: VipProfileContentProps) {
  const t = useTranslations('vip');
  const { status, vip, error, refetch } = useVipProfile(slug);
  const {
    isFollowing,
    followerCount,
    isLoading: isFollowLoading,
    toggleFollow,
  } = useVipFollow(vip?.id, vip?.isFollowing, vip?.followerCount);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">
              {t('profile.errorTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not found
  if (!vip) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-foreground">
            {t('profile.notFound')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Follow button for slot
  const followButton = (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={toggleFollow}
      disabled={isFollowLoading}
    >
      {isFollowLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : null}
      {isFollowing ? t('profile.following') : t('profile.follow')}
    </Button>
  );

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <VipProfileHeader
        vip={{ ...vip, followerCount, isFollowing }}
        followButton={followButton}
      />

      {/* Loadouts Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Backpack className="h-5 w-5" aria-hidden="true" />
          {t('profile.loadoutsTitle')}
          <span className="text-sm font-normal text-muted-foreground">
            ({vip.loadoutCount})
          </span>
        </h2>

        {vip.loadouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Backpack className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {t('profile.noLoadouts')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vip.loadouts.map((loadout) => (
              <VipLoadoutCard
                key={loadout.id}
                loadout={loadout}
                vipSlug={vip.slug}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default VipProfileContent;
