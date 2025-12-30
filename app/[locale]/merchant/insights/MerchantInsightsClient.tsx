/**
 * MerchantInsightsClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T051
 *
 * Client component for the merchant insights page.
 * Displays wishlist demand insights and allows offer creation.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useWishlistInsights, useMerchantOffers } from '@/hooks/merchant';
import { WishlistInsightsPanel } from '@/components/merchant/WishlistInsightsPanel';
import { WishlistInsightDetail } from '@/components/merchant/WishlistInsightDetail';
import { OfferCreationForm } from '@/components/merchant/OfferCreationForm';
import { AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'list' | 'detail' | 'createOffer';

interface CreateOfferState {
  catalogItem: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    imageUrl: string | null;
  };
  userIds: string[];
}

// =============================================================================
// Component
// =============================================================================

export function MerchantInsightsClient() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('MerchantInsights');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [createOfferState, setCreateOfferState] = useState<CreateOfferState | null>(null);

  const {
    insights,
    selectedDetail,
    isLoading,
    isLoadingDetail,
    error,
    filters,
    totalUserCount,
    setFilters,
    loadInsightDetail,
    clearDetail,
    refresh,
    primaryLocation,
  } = useWishlistInsights();

  const { createOffers, isCreating, calculateOfferFee } = useMerchantOffers();

  // Handle selecting an insight to view detail
  const handleSelectInsight = useCallback(
    async (catalogItemId: string) => {
      await loadInsightDetail(catalogItemId);
      setViewMode('detail');
    },
    [loadInsightDetail]
  );

  // Handle back from detail view
  const handleBack = useCallback(() => {
    clearDetail();
    setViewMode('list');
  }, [clearDetail]);

  // Handle creating offer from detail view
  const handleCreateOffer = useCallback(
    (userIds: string[]) => {
      if (!selectedDetail) return;

      setCreateOfferState({
        catalogItem: selectedDetail.catalogItem,
        userIds,
      });
      setViewMode('createOffer');
    },
    [selectedDetail]
  );

  // Handle offer submission
  const handleSubmitOffer = useCallback(
    async (input: Parameters<typeof createOffers>[0]) => {
      const success = await createOffers(input);
      if (success) {
        setCreateOfferState(null);
        clearDetail();
        setViewMode('list');
        router.push(`/${locale}/merchant/offers`);
      }
    },
    [createOffers, clearDetail, router, locale]
  );

  // Handle cancel offer creation
  const handleCancelOffer = useCallback(() => {
    setCreateOfferState(null);
    setViewMode('detail');
  }, []);

  // Show error if no primary location
  if (!primaryLocation && !isLoading) {
    return (
      <Alert variant="destructive">
        <MapPin className="h-4 w-4" />
        <AlertTitle>{t('noLocationTitle')}</AlertTitle>
        <AlertDescription>{t('noLocationDescription')}</AlertDescription>
      </Alert>
    );
  }

  // Show general error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Render based on view mode
  switch (viewMode) {
    case 'detail':
      return (
        <WishlistInsightDetail
          detail={selectedDetail}
          isLoading={isLoadingDetail}
          onBack={handleBack}
          onCreateOffer={handleCreateOffer}
        />
      );

    case 'createOffer':
      if (!createOfferState) {
        setViewMode('list');
        return null;
      }
      return (
        <OfferCreationForm
          catalogItem={createOfferState.catalogItem}
          userIds={createOfferState.userIds}
          isSubmitting={isCreating}
          calculateFee={calculateOfferFee}
          onSubmit={handleSubmitOffer}
          onCancel={handleCancelOffer}
        />
      );

    default:
      return (
        <WishlistInsightsPanel
          insights={insights}
          isLoading={isLoading}
          filters={filters}
          totalUserCount={totalUserCount}
          onFiltersChange={setFilters}
          onSelectInsight={handleSelectInsight}
          onRefresh={refresh}
        />
      );
  }
}
