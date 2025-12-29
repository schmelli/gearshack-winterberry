/**
 * EditLoadoutClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T042
 *
 * Client wrapper for loadout editing wizard.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  LoadoutCreationWizard,
  type WizardSubmitData,
  type WizardState,
} from '@/components/merchant/LoadoutCreationWizard';
import {
  useMerchantLoadouts,
  useMerchantCatalog,
  useMerchantLocations,
} from '@/hooks/merchant';
import type { LoadoutItemInput, LoadoutAvailabilityInput } from '@/types/merchant-loadout';

interface EditLoadoutClientProps {
  loadoutId: string;
}

export function EditLoadoutClient({ loadoutId }: EditLoadoutClientProps) {
  const locale = useLocale();
  const router = useRouter();

  // Hooks for data
  const {
    currentLoadout,
    isLoadingCurrent,
    loadLoadout,
    updateLoadout,
    submitForReview,
    addItem,
    updateItem,
    removeItem,
    setAvailability,
    removeAvailability,
  } = useMerchantLoadouts();

  const { catalogItems, isLoading: isCatalogLoading } = useMerchantCatalog();
  const { locations, isLoading: isLocationsLoading } = useMerchantLocations();

  // Load the loadout on mount
  useEffect(() => {
    loadLoadout(loadoutId);
  }, [loadLoadout, loadoutId]);

  // Transform current loadout to initial wizard state
  const initialValues: Partial<WizardState> | undefined = useMemo(() => {
    if (!currentLoadout) return undefined;

    const basics = {
      name: currentLoadout.name,
      description: currentLoadout.description ?? undefined,
      tripType: currentLoadout.tripType ?? undefined,
      season: currentLoadout.season ?? undefined,
      discountPercent: currentLoadout.discountPercent,
    };

    const items: LoadoutItemInput[] = currentLoadout.items.map((item) => ({
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
      expertNote: item.expertNote ?? undefined,
      sortOrder: item.sortOrder,
    }));

    const availability: LoadoutAvailabilityInput[] = currentLoadout.availability.map(
      (avail) => ({
        locationId: avail.locationId,
        isInStock: avail.isInStock,
        stockNote: avail.stockNote ?? undefined,
      })
    );

    return { basics, items, availability };
  }, [currentLoadout]);

  const isLoading = isLoadingCurrent || isCatalogLoading || isLocationsLoading;

  // Handle save as draft
  const handleSaveDraft = useCallback(
    async (data: WizardSubmitData): Promise<boolean> => {
      if (!currentLoadout) return false;

      // Update loadout basics
      const updated = await updateLoadout(loadoutId, {
        name: data.basics.name,
        description: data.basics.description,
        tripType: data.basics.tripType,
        season: data.basics.season,
        discountPercent: data.basics.discountPercent,
      });

      if (!updated) return false;

      // Sync items - remove old, add new
      const existingItemIds = new Set(currentLoadout.items.map((i) => i.catalogItemId));
      const newItemIds = new Set(data.items.map((i) => i.catalogItemId));

      // Remove items no longer present
      for (const existingItem of currentLoadout.items) {
        if (!newItemIds.has(existingItem.catalogItemId)) {
          await removeItem(existingItem.id, loadoutId);
        }
      }

      // Add or update items
      for (const item of data.items) {
        if (existingItemIds.has(item.catalogItemId)) {
          const existingItem = currentLoadout.items.find(
            (i) => i.catalogItemId === item.catalogItemId
          );
          if (existingItem) {
            await updateItem(existingItem.id, loadoutId, item);
          }
        } else {
          await addItem(loadoutId, item);
        }
      }

      // Sync availability
      const existingLocationIds = new Set(
        currentLoadout.availability.map((a) => a.locationId)
      );
      const newLocationIds = new Set(data.availability.map((a) => a.locationId));

      // Remove locations no longer present
      for (const existingAvail of currentLoadout.availability) {
        if (!newLocationIds.has(existingAvail.locationId)) {
          await removeAvailability(loadoutId, existingAvail.locationId);
        }
      }

      // Add or update availability
      for (const avail of data.availability) {
        await setAvailability(loadoutId, avail);
      }

      toast.success('Changes saved');
      router.push(`/${locale}/merchant/loadouts`);
      return true;
    },
    [
      currentLoadout,
      loadoutId,
      updateLoadout,
      addItem,
      updateItem,
      removeItem,
      setAvailability,
      removeAvailability,
      router,
      locale,
    ]
  );

  // Handle submit for review
  const handleSubmitForReview = useCallback(
    async (data: WizardSubmitData): Promise<boolean> => {
      // First save changes
      const saved = await handleSaveDraft(data);
      if (!saved) return false;

      // Then submit for review
      const success = await submitForReview(loadoutId);
      if (success) {
        router.push(`/${locale}/merchant/loadouts`);
      }
      return success;
    },
    [handleSaveDraft, submitForReview, loadoutId, router, locale]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push(`/${locale}/merchant/loadouts`);
  }, [router, locale]);

  // Loading state
  if (isLoading && !initialValues) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading loadout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <LoadoutCreationWizard
        loadoutId={loadoutId}
        initialValues={initialValues}
        catalogItems={catalogItems}
        locations={locations}
        isLoading={isLoading}
        onSaveDraft={handleSaveDraft}
        onSubmitForReview={handleSubmitForReview}
        onCancel={handleCancel}
      />
    </div>
  );
}
