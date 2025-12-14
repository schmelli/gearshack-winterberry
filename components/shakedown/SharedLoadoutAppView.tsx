'use client';

/**
 * SharedLoadoutAppView Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T031, T032, T033 - Authenticated user in-app view for shared loadouts
 *
 * Renders a shared loadout within the app shell with standard navigation.
 * Displays loadout info, owner profile, and gear grid with owned/wishlist indicators.
 *
 * This is the authenticated alternative to SharedLoadoutHero (anonymous view).
 */

import { useMemo, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OwnerProfilePreview } from './OwnerProfilePreview';
import { OwnerProfileModal } from './OwnerProfileModal';
import { SharedGearGrid } from './SharedGearGrid';
import { useOwnedItemsCheck } from '@/hooks/useOwnedItemsCheck';
import { useWishlistActions } from '@/hooks/useWishlistActions';
import { normalizeForMatch } from '@/lib/utils/matching';
import type { SharedLoadoutPayload, SharedLoadoutOwner, SharedGearItem } from '@/types/sharing';
import { formatTripDate } from '@/lib/loadout-utils';

// =============================================================================
// Types
// =============================================================================

interface SharedLoadoutAppViewProps {
  /** The shared loadout data */
  payload: SharedLoadoutPayload;
  /** Whether comments are allowed on this loadout */
  allowComments: boolean;
  /** Share token for the loadout */
  shareToken: string;
  /** Owner profile information */
  owner: SharedLoadoutOwner | null;
  /** Current user's ID */
  userId: string;
  /** Optional handler for gear item clicks (opens detail modal) */
  onItemClick?: (itemId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SharedLoadoutAppView({
  payload,
  allowComments,
  shareToken,
  owner,
  userId,
  onItemClick,
}: SharedLoadoutAppViewProps) {
  const t = useTranslations('SharedLoadout');
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // T039: Initialize wishlist actions hook
  const { isOnWishlist, addToWishlist, addingItems } = useWishlistActions(userId, shareToken);

  // Handler for sending message to owner
  const handleSendMessage = useCallback((ownerId: string) => {
    router.push(`/messages?to=${ownerId}`);
  }, [router]);

  // Initialize owned items check hook
  const { checkOwned } = useOwnedItemsCheck(userId);

  const tripDate = useMemo(
    () => (payload.loadout.tripDate ? new Date(payload.loadout.tripDate) : null),
    [payload.loadout.tripDate]
  );
  const tripDateLabel = useMemo(() => formatTripDate(tripDate) ?? t('notSet'), [tripDate, t]);

  // T041: Handle add to wishlist with toast notification (T044, T055)
  const handleAddToWishlist = useCallback(async (item: SharedGearItem) => {
    const attemptAdd = async () => {
      const result = await addToWishlist(item);

      if (result.success) {
        toast.success(t('addedToWishlist'));
      } else {
        // T055: Error toast with retry option
        toast.error(result.error || t('addToWishlistError'), {
          action: {
            label: t('retry'),
            onClick: attemptAdd,
          },
        });
      }
    };

    await attemptAdd();
  }, [addToWishlist, t]);

  // T042: Check if item is on wishlist by brand/name
  const checkOnWishlist = useCallback((itemId: string) => {
    const item = payload.items.find(i => i.id === itemId);
    if (!item) return false;
    return isOnWishlist(item.brand, item.name);
  }, [payload.items, isOnWishlist]);

  // Check if item is owned by brand/name
  const checkIsOwned = useCallback((itemId: string) => {
    const item = payload.items.find(i => i.id === itemId);
    if (!item) return false;
    return checkOwned(item.brand, item.name);
  }, [payload.items, checkOwned]);

  // Check if item is being added to wishlist
  const checkIsAdding = useCallback((itemId: string) => {
    const item = payload.items.find(i => i.id === itemId);
    if (!item) return false;
    const key = normalizeForMatch(item.brand, item.name);
    return addingItems.has(key);
  }, [payload.items, addingItems]);

  // T056: Check if user owns all items
  const ownsAllItems = useMemo(() => {
    if (payload.items.length === 0) return false;
    return payload.items.every(item => checkOwned(item.brand, item.name));
  }, [payload.items, checkOwned]);

  return (
    <div className="space-y-6 py-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{payload.loadout.name}</h1>
            {payload.loadout.description && (
              <p className="text-lg text-muted-foreground">
                {payload.loadout.description}
              </p>
            )}
          </div>

          {/* Owner Preview (Inline Variant) */}
          <OwnerProfilePreview
            owner={owner}
            onClick={() => setIsProfileModalOpen(true)}
            variant="inline"
          />
        </div>

        {/* Trip Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {tripDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{tripDateLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{payload.items.length} {payload.items.length === 1 ? t('item') : t('items')}</span>
          </div>
        </div>

        {/* Seasons and Activities */}
        <div className="flex flex-wrap gap-4">
          {payload.loadout.seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('seasons')}:</span>
              <div className="flex flex-wrap gap-1.5">
                {payload.loadout.seasons.map((season) => (
                  <Badge key={season} variant="secondary">
                    {season}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {payload.loadout.activityTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('activities')}:</span>
              <div className="flex flex-wrap gap-1.5">
                {payload.loadout.activityTypes.map((activity) => (
                  <Badge key={activity} variant="outline">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* T056: Message when user owns all items */}
      {ownsAllItems && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 text-center">
              {t('allItemsOwned')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gear Grid Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gearList')}</CardTitle>
          <CardDescription>
            {t('gearListDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SharedGearGrid
            items={payload.items}
            onItemClick={onItemClick ? (item) => onItemClick(item.id) : undefined}
            isOwned={checkIsOwned}
            isOnWishlist={checkOnWishlist}
            onAddToWishlist={handleAddToWishlist}
            isAddingToWishlist={checkIsAdding}
            isAuthenticated={true}
            viewDensity="standard"
          />
        </CardContent>
      </Card>

      {/* Comments Status (if applicable) */}
      {!allowComments && (
        <Card className="border-muted bg-muted/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('commentsDisabled')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Owner Profile Modal */}
      <OwnerProfileModal
        owner={owner}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        isAuthenticated={true}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
