/**
 * UserOffersClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T061
 *
 * Client component for the user offers page.
 * Lists all offers and provides detail sheet for interaction.
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserOffers, useOfferBlocking } from '@/hooks/offers';
import { OfferCard } from '@/components/offers/OfferCard';
import { OfferDetailSheet } from '@/components/offers/OfferDetailSheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import type { OfferReportReason } from '@/types/merchant-offer';

// =============================================================================
// Component
// =============================================================================

export function UserOffersClient() {
  const t = useTranslations('UserOffers');
  const searchParams = useSearchParams();
  const offerIdFromUrl = searchParams.get('offerId');

  const {
    offers,
    selectedOffer,
    isLoading,
    isProcessing,
    error,
    filters,
    unreadCount,
    setFilters,
    viewOffer,
    acceptOffer,
    declineOffer,
    clearDetail,
    refresh,
  } = useUserOffers();

  const { blockMerchant } = useOfferBlocking();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // T065: Auto-open offer from notification link
  useEffect(() => {
    if (offerIdFromUrl && !isLoading && offers.length > 0) {
      // Check if offer exists in the list
      const offerExists = offers.some((o) => o.id === offerIdFromUrl);
      if (offerExists && !selectedOffer) {
        viewOffer(offerIdFromUrl).then(() => {
          setIsSheetOpen(true);
        });
      }
    }
  }, [offerIdFromUrl, isLoading, offers, selectedOffer, viewOffer]);

  const handleOfferClick = useCallback(
    async (offerId: string) => {
      await viewOffer(offerId);
      setIsSheetOpen(true);
    },
    [viewOffer]
  );

  const handleSheetClose = useCallback(() => {
    setIsSheetOpen(false);
    clearDetail();
  }, [clearDetail]);

  const handleAccept = useCallback(async (): Promise<boolean> => {
    if (!selectedOffer) return false;
    const success = await acceptOffer(selectedOffer.id);
    if (success) {
      // T063: Auto-create DM on accept
      // This would integrate with the existing messaging system
      // For now we just show a toast - full integration in messaging hook
      toast.success(t('acceptedMessage', { merchant: selectedOffer.merchant.businessName }));
    }
    return success;
  }, [selectedOffer, acceptOffer, t]);

  const handleDecline = useCallback(async (): Promise<boolean> => {
    if (!selectedOffer) return false;
    return declineOffer(selectedOffer.id);
  }, [selectedOffer, declineOffer]);

  const handleBlockMerchant = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!selectedOffer) return false;
      const success = await blockMerchant(selectedOffer.merchant.id, reason);
      if (success) {
        handleSheetClose();
        refresh();
      }
      return success;
    },
    [selectedOffer, blockMerchant, handleSheetClose, refresh]
  );

  const handleReport = useCallback(
    async (reason: string, details?: string): Promise<boolean> => {
      if (!selectedOffer) return false;

      const supabase = createBrowserClient();

      try {
        // Insert report - T064: Report functionality
        const { error: reportError } = await supabase.from('offer_reports').insert({
          offer_id: selectedOffer.id,
          reason: reason as OfferReportReason,
          details: details ?? null,
        });

        if (reportError) throw reportError;

        toast.success(t('reportSubmitted'));
        return true;
      } catch (err) {
        console.error('Failed to report offer:', err);
        toast.error(t('reportFailed'));
        return false;
      }
    },
    [selectedOffer, t]
  );

  const handleToggleExpired = useCallback(
    (checked: boolean) => {
      setFilters({ includeExpired: checked });
    },
    [setFilters]
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            {unreadCount > 0 && (
              <Badge variant="default">{unreadCount} {t('new')}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="includeExpired"
                checked={filters.includeExpired}
                onCheckedChange={handleToggleExpired}
              />
              <Label htmlFor="includeExpired" className="text-sm">
                {t('showExpired')}
              </Label>
            </div>
            <div className="flex-1" />
            <p className="text-sm text-muted-foreground">
              {t('totalOffers', { count: offers.length })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Offers List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t('empty')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('emptyAction')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onClick={() => handleOfferClick(offer.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <OfferDetailSheet
        offer={selectedOffer}
        open={isSheetOpen}
        onClose={handleSheetClose}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onBlockMerchant={handleBlockMerchant}
        onReport={handleReport}
        isProcessing={isProcessing}
      />
    </div>
  );
}
