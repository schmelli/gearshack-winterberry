/**
 * CreateLoadoutClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T041
 *
 * Client wrapper for loadout creation wizard.
 */

'use client';

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoadoutCreationWizard, type WizardSubmitData } from '@/components/merchant/LoadoutCreationWizard';
import {
  useMerchantLoadouts,
  useMerchantCatalog,
  useMerchantLocations,
} from '@/hooks/merchant';

export function CreateLoadoutClient() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('Merchant');

  // Hooks for data
  const { createLoadout, submitForReview, addItem, setAvailability } = useMerchantLoadouts();
  const { items: catalogItems, isLoading: isCatalogLoading } = useMerchantCatalog();
  const { locations, isLoading: isLocationsLoading } = useMerchantLocations();

  const isLoading = isCatalogLoading || isLocationsLoading;

  // Handle save as draft
  const handleSaveDraft = useCallback(
    async (data: WizardSubmitData): Promise<boolean> => {
      // Create the loadout
      const newLoadout = await createLoadout({
        name: data.basics.name,
        description: data.basics.description,
        tripType: data.basics.tripType,
        season: data.basics.season,
        discountPercent: data.basics.discountPercent,
      });

      if (!newLoadout) return false;

      // Add items
      for (const item of data.items) {
        await addItem(newLoadout.id, item);
      }

      // Set availability
      for (const avail of data.availability) {
        await setAvailability(newLoadout.id, avail);
      }

      toast.success(t('loadouts.savedAsDraft'));
      router.push(`/${locale}/merchant/loadouts`);
      return true;
    },
    [createLoadout, addItem, setAvailability, router, locale, t]
  );

  // Handle submit for review
  const handleSubmitForReview = useCallback(
    async (data: WizardSubmitData): Promise<boolean> => {
      // First save as draft
      const newLoadout = await createLoadout({
        name: data.basics.name,
        description: data.basics.description,
        tripType: data.basics.tripType,
        season: data.basics.season,
        discountPercent: data.basics.discountPercent,
      });

      if (!newLoadout) return false;

      // Add items
      for (const item of data.items) {
        await addItem(newLoadout.id, item);
      }

      // Set availability
      for (const avail of data.availability) {
        await setAvailability(newLoadout.id, avail);
      }

      // Then submit for review
      const success = await submitForReview(newLoadout.id);
      if (success) {
        router.push(`/${locale}/merchant/loadouts`);
      }
      return success;
    },
    [createLoadout, addItem, setAvailability, submitForReview, router, locale]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push(`/${locale}/merchant/loadouts`);
  }, [router, locale]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <LoadoutCreationWizard
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
