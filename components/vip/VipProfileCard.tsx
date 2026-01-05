'use client';

/**
 * VIP Profile Card Component
 *
 * Feature: 052-vip-loadouts
 * Task: T020
 *
 * Card component for displaying VIP in lists/grids.
 * Shows avatar, name, bio preview, follower count, and loadout count.
 * Clicking opens VIP profile modal instead of navigating to page.
 */

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Users, Backpack, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVipModal } from '@/hooks/vip/useVipModal';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipProfileCardProps {
  vip: VipWithStats;
  showBadge?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function VipProfileCard({ vip, showBadge = true }: VipProfileCardProps) {
  const t = useTranslations('vip');
  const { open: openVipModal } = useVipModal();

  const handleClick = () => {
    openVipModal(vip.slug);
  };

  return (
    <Card
      className="group h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
        <CardContent className="p-4">
          {/* Avatar and Name Row */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
              <Image
                src={vip.avatarUrl}
                alt={vip.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>

            {/* Name and Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
                  {vip.name}
                </h3>
                {showBadge && vip.status === 'claimed' && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label={t('profile.verifiedBadge')} />
                )}
              </div>

              {/* Stats */}
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {vip.followerCount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Backpack className="h-3 w-3" />
                  {vip.loadoutCount}
                </span>
              </div>
            </div>
          </div>

          {/* Bio Preview */}
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {vip.bio}
          </p>

          {/* Featured Badge */}
          {vip.isFeatured && (
            <div className="mt-3">
              <Badge variant="secondary" className="text-xs">
                Featured
              </Badge>
            </div>
          )}
        </CardContent>
    </Card>
  );
}

export default VipProfileCard;
