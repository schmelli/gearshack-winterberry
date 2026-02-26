/**
 * MerchantDashboardClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T039
 *
 * Client-side wrapper for merchant dashboard with data fetching.
 */

'use client';

import { useLocale } from 'next-intl';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { useMerchantAuth, useMerchantLoadouts } from '@/hooks/merchant';
import { useMerchantLocations } from '@/hooks/merchant/useMerchantLocations';

export function MerchantDashboardClient() {
  const locale = useLocale();
  const { merchant, isLoading: isAuthLoading } = useMerchantAuth();
  const { loadouts, isLoading: isLoadoutsLoading } = useMerchantLoadouts();
  const { locations, isLoading: isLocationsLoading } = useMerchantLocations();

  const isLoading = isAuthLoading || isLoadoutsLoading || isLocationsLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <MerchantDashboard
        merchant={merchant}
        loadouts={loadouts}
        locations={locations}
        isLoading={isLoading}
        loadoutsPath={`/${locale}/merchant/loadouts`}
        createLoadoutPath={`/${locale}/merchant/loadouts/create`}
        settingsPath={`/${locale}/merchant/settings`}
      />
    </div>
  );
}
