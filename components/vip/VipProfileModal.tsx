/**
 * VIP Profile Modal
 *
 * Feature: 056-community-hub-enhancements
 * Task: T036
 *
 * Modal dialog for quick VIP profile preview without navigation.
 * Uses Zustand global state for open/close control.
 */

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Loader2,
  AlertCircle,
  Backpack,
  ExternalLink,
  UserPlus,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@/i18n/navigation';
import { useVipModal } from '@/hooks/vip/useVipModal';
import { useVipProfile } from '@/hooks/vip/useVipProfile';
import { useVipFollow } from '@/hooks/vip/useVipFollow';
import { VipProfileHeader } from './VipProfileHeader';
import { VipLoadoutCard } from './VipLoadoutCard';
import { VipFeaturedVideos } from './VipFeaturedVideos';

// ============================================================================
// Component
// ============================================================================

export function VipProfileModal() {
  const t = useTranslations('vip');
  const { isOpen, vipSlug, close } = useVipModal();
  const { status, vip, error, refetch } = useVipProfile(vipSlug ?? '');
  const {
    isFollowing,
    followerCount,
    isLoading: isFollowLoading,
    toggleFollow,
  } = useVipFollow(vip?.id, vip?.isFollowing, vip?.followerCount);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {vip?.name ?? t('profile.title')}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {vipSlug && (
                <Link
                  href={`/vip/${vipSlug}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={close}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View full profile</span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={close}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Loading state */}
            {status === 'loading' && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {t('profile.errorTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={refetch}>
                  {t('common.retry')}
                </Button>
              </div>
            )}

            {/* Not found */}
            {status === 'idle' && !vip && (
              <div className="py-12 text-center">
                <p className="text-lg font-medium text-foreground">
                  {t('profile.notFound')}
                </p>
              </div>
            )}

            {/* VIP Profile */}
            {status === 'idle' && vip && (
              <div className="space-y-6">
                {/* Profile Header */}
                <VipProfileHeader
                  vip={{
                    ...vip,
                    isFollowing,
                    followerCount,
                  }}
                  showFollowButton
                  followButton={
                    <Button
                      variant={isFollowing ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={toggleFollow}
                      disabled={isFollowLoading}
                      className="gap-2"
                    >
                      {isFollowLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowing ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {isFollowing ? t('common.following') : t('common.follow')}
                    </Button>
                  }
                />

                {/* Featured Videos */}
                {vip.featuredVideoUrls && vip.featuredVideoUrls.length > 0 && (
                  <VipFeaturedVideos videos={vip.featuredVideoUrls} />
                )}

                {/* Loadouts Grid */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <Backpack className="h-5 w-5" />
                    {t('profile.loadoutsTitle')}
                  </h3>

                  {vip.loadouts && vip.loadouts.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {vip.loadouts.slice(0, 4).map((loadout) => (
                        <VipLoadoutCard
                          key={loadout.id}
                          loadout={loadout}
                          vipSlug={vipSlug ?? ''}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('profile.noLoadouts')}
                    </p>
                  )}

                  {/* View all link if more loadouts */}
                  {vip.loadouts && vip.loadouts.length > 4 && (
                    <div className="mt-4 text-center">
                      <Link
                        href={`/vip/${vipSlug}`}
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={close}
                      >
                        {t('profile.viewAllLoadouts', { count: vip.loadouts.length })}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
