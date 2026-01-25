/**
 * MerchantLoadoutDetailClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T026, T027, T030
 *
 * Client-side interactive detail view for a merchant loadout.
 * Includes wishlist integration with merchant attribution and location consent.
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { useLoadoutDetail } from '@/hooks/merchant';
import { useLocationSharing } from '@/hooks/user';
import { LoadoutComparisonModal } from '@/components/merchant/LoadoutComparisonModal';
import {
  addMerchantItemToWishlist,
  addAllLoadoutItemsToWishlist,
  getWishlistedCatalogItemIds,
} from '@/lib/supabase/merchant-wishlist-queries';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MerchantLoadoutDetail,
  MerchantLoadoutDetailSkeleton,
} from '@/components/merchant/MerchantLoadoutDetail';
import { LocationConsentDialog } from '@/components/merchant/LocationConsentDialog';
import type { LocationGranularity } from '@/types/merchant';

interface MerchantLoadoutDetailClientProps {
  slug: string;
}

export function MerchantLoadoutDetailClient({
  slug,
}: MerchantLoadoutDetailClientProps) {
  const t = useTranslations('MerchantLoadouts');
  const tCommon = useTranslations('Common');
  const tCompare = useTranslations('LoadoutComparison');
  const locale = useLocale();
  const router = useRouter();

  // Fetch loadout detail
  const { loadout, isLoading, error, refresh } = useLoadoutDetail(slug);

  // Location sharing hook
  const { getShareForMerchant, updateShare } = useLocationSharing();

  // Track wishlisted catalog item IDs
  const [wishlistedItemIds, setWishlistedItemIds] = useState<Set<string>>(new Set());
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

  // Location consent dialog state
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [pendingWishlistAction, setPendingWishlistAction] = useState<
    'single' | 'all' | null
  >(null);
  const [pendingCatalogItemId, setPendingCatalogItemId] = useState<string | null>(null);

  // T079: Comparison modal state
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Fetch user's wishlisted catalog items on mount
  useEffect(() => {
    getWishlistedCatalogItemIds()
      .then(setWishlistedItemIds)
      .catch((error) => {
        console.error('Failed to fetch wishlisted items:', error);
      });
  }, []);

  // Check if user has already shared location with this merchant
  const hasExistingLocationShare = loadout
    ? !!getShareForMerchant(loadout.merchant.id)
    : false;

  // Execute pending wishlist action after location consent
  const executePendingAction = useCallback(async () => {
    if (!loadout) return;

    if (pendingWishlistAction === 'single' && pendingCatalogItemId) {
      const loadoutItem = loadout.items.find(
        (item) => item.catalogItemId === pendingCatalogItemId
      );
      if (!loadoutItem) return;

      setIsAddingToWishlist(true);
      try {
        const result = await addMerchantItemToWishlist({
          loadoutItem,
          merchantId: loadout.merchant.id,
          loadoutId: loadout.id,
        });

        if (result.success) {
          setWishlistedItemIds((prev) => new Set([...prev, pendingCatalogItemId]));
          toast.success(t('wishlist.addedSuccess'));
        } else if (result.isDuplicate) {
          toast.info(t('wishlist.alreadyAdded'));
        } else {
          toast.error(result.error || tCommon('error'));
        }
      } catch (err) {
        console.error('Add to wishlist error:', err);
        toast.error(tCommon('error'));
      } finally {
        setIsAddingToWishlist(false);
      }
    } else if (pendingWishlistAction === 'all') {
      const itemsToAdd = loadout.items.filter(
        (item) => !wishlistedItemIds.has(item.catalogItemId)
      );

      if (itemsToAdd.length === 0) {
        toast.info(t('wishlist.allAlreadyAdded'));
        return;
      }

      setIsAddingToWishlist(true);
      try {
        const result = await addAllLoadoutItemsToWishlist(
          itemsToAdd,
          loadout.merchant.id,
          loadout.id
        );

        const newIds = itemsToAdd.map((item) => item.catalogItemId);
        setWishlistedItemIds((prev) => new Set([...prev, ...newIds]));

        if (result.added > 0) {
          toast.success(t('wishlist.batchAddedSuccess', { count: result.added }));
        }
        if (result.skipped > 0) {
          toast.info(t('wishlist.someSkipped', { count: result.skipped }));
        }
        if (result.errors.length > 0) {
          toast.error(t('wishlist.someErrors'));
        }
      } catch (err) {
        console.error('Add all to wishlist error:', err);
        toast.error(tCommon('error'));
      } finally {
        setIsAddingToWishlist(false);
      }
    }

    // Clear pending state
    setPendingWishlistAction(null);
    setPendingCatalogItemId(null);
  }, [loadout, pendingWishlistAction, pendingCatalogItemId, wishlistedItemIds, t, tCommon]);

  // Handle adding single item to wishlist with merchant attribution
  const handleAddToWishlist = useCallback(
    async (catalogItemId: string) => {
      if (!loadout) return;

      // If first time adding from this merchant and no existing share, show consent dialog
      if (!hasExistingLocationShare && wishlistedItemIds.size === 0) {
        setPendingWishlistAction('single');
        setPendingCatalogItemId(catalogItemId);
        setShowLocationDialog(true);
        return;
      }

      // Otherwise, add directly
      const loadoutItem = loadout.items.find(
        (item) => item.catalogItemId === catalogItemId
      );
      if (!loadoutItem) return;

      setIsAddingToWishlist(true);
      try {
        const result = await addMerchantItemToWishlist({
          loadoutItem,
          merchantId: loadout.merchant.id,
          loadoutId: loadout.id,
        });

        if (result.success) {
          setWishlistedItemIds((prev) => new Set([...prev, catalogItemId]));
          toast.success(t('wishlist.addedSuccess'));
        } else if (result.isDuplicate) {
          toast.info(t('wishlist.alreadyAdded'));
        } else {
          toast.error(result.error || tCommon('error'));
        }
      } catch (err) {
        console.error('Add to wishlist error:', err);
        toast.error(tCommon('error'));
      } finally {
        setIsAddingToWishlist(false);
      }
    },
    [loadout, hasExistingLocationShare, wishlistedItemIds.size, t, tCommon]
  );

  // Handle adding all items to wishlist
  const handleAddAllToWishlist = useCallback(async () => {
    if (!loadout) return;

    const itemsToAdd = loadout.items.filter(
      (item) => !wishlistedItemIds.has(item.catalogItemId)
    );

    if (itemsToAdd.length === 0) {
      toast.info(t('wishlist.allAlreadyAdded'));
      return;
    }

    // If first time adding from this merchant, show consent dialog
    if (!hasExistingLocationShare && wishlistedItemIds.size === 0) {
      setPendingWishlistAction('all');
      setShowLocationDialog(true);
      return;
    }

    // Otherwise, add directly
    setIsAddingToWishlist(true);
    try {
      const result = await addAllLoadoutItemsToWishlist(
        itemsToAdd,
        loadout.merchant.id,
        loadout.id
      );

      const newIds = itemsToAdd.map((item) => item.catalogItemId);
      setWishlistedItemIds((prev) => new Set([...prev, ...newIds]));

      if (result.added > 0) {
        toast.success(t('wishlist.batchAddedSuccess', { count: result.added }));
      }
      if (result.skipped > 0) {
        toast.info(t('wishlist.someSkipped', { count: result.skipped }));
      }
      if (result.errors.length > 0) {
        toast.error(t('wishlist.someErrors'));
      }
    } catch (err) {
      console.error('Add all to wishlist error:', err);
      toast.error(tCommon('error'));
    } finally {
      setIsAddingToWishlist(false);
    }
  }, [loadout, wishlistedItemIds, hasExistingLocationShare, t, tCommon]);

  // Handle location consent confirmation
  const handleLocationConsentConfirm = useCallback(
    async (granularity: LocationGranularity) => {
      if (!loadout) return;

      // Save the location preference
      await updateShare(loadout.merchant.id, granularity);

      // Close dialog and execute pending action
      setShowLocationDialog(false);
      executePendingAction();
    },
    [loadout, updateShare, executePendingAction]
  );

  // Handle location consent request (triggered by MerchantLoadoutDetail)
  const handleLocationConsentRequest = useCallback(() => {
    setPendingWishlistAction('all');
    setShowLocationDialog(true);
  }, []);

  // Back navigation
  const handleBack = useCallback(() => {
    router.push(`/${locale}/community/merchant-loadouts`);
  }, [router, locale]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToLoadouts')}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Button onClick={() => refresh()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToLoadouts')}
        </Button>

        {/* T079: Compare Button */}
        {loadout && (
          <Button
            variant="outline"
            onClick={() => setShowComparisonModal(true)}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {tCompare('compare')}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <MerchantLoadoutDetailSkeleton />
      ) : loadout ? (
        <>
          <MerchantLoadoutDetail
            loadout={loadout}
            onAddToWishlist={handleAddToWishlist}
            onAddAllToWishlist={handleAddAllToWishlist}
            wishlistedItemIds={wishlistedItemIds}
            onLocationConsentRequest={handleLocationConsentRequest}
          />

          {/* Location Consent Dialog */}
          <LocationConsentDialog
            open={showLocationDialog}
            onOpenChange={setShowLocationDialog}
            merchantName={loadout.merchant.businessName}
            currentGranularity={getShareForMerchant(loadout.merchant.id)?.granularity}
            onConfirm={handleLocationConsentConfirm}
            isLoading={isAddingToWishlist}
          />

          {/* T079: Loadout Comparison Modal */}
          <LoadoutComparisonModal
            merchantLoadoutId={loadout.id}
            open={showComparisonModal}
            onClose={() => setShowComparisonModal(false)}
          />
        </>
      ) : null}
    </div>
  );
}
