/**
 * useOfferAutoOpen Hook
 *
 * Auto-opens an offer detail sheet when an offerId is present in URL params.
 * Used for deep-linking from notification links (T065).
 *
 * Feature: Code Quality Review
 * Extracts useEffect from UserOffersClient following Feature-Sliced Light architecture.
 */

import { useEffect } from 'react';

interface UseOfferAutoOpenOptions {
  /** Offer ID from URL search params (null if not present) */
  offerIdFromUrl: string | null;
  /** Whether the offers list is still loading */
  isLoading: boolean;
  /** The loaded offers list */
  offers: ReadonlyArray<{ id: string }>;
  /** The currently selected offer (null if none) */
  selectedOffer: unknown;
  /** Function to view/select an offer by ID */
  viewOffer: (offerId: string) => Promise<void>;
  /** Callback to open the detail sheet */
  onOpen: () => void;
}

/**
 * Watches for an offerId URL parameter and auto-opens the corresponding offer
 * once the offers list has loaded.
 *
 * @example
 * useOfferAutoOpen({
 *   offerIdFromUrl: searchParams.get('offerId'),
 *   isLoading,
 *   offers,
 *   selectedOffer,
 *   viewOffer,
 *   onOpen: () => setIsSheetOpen(true),
 * });
 */
export function useOfferAutoOpen({
  offerIdFromUrl,
  isLoading,
  offers,
  selectedOffer,
  viewOffer,
  onOpen,
}: UseOfferAutoOpenOptions): void {
  useEffect(() => {
    if (offerIdFromUrl && !isLoading && offers.length > 0) {
      const offerExists = offers.some((o) => o.id === offerIdFromUrl);
      if (offerExists && !selectedOffer) {
        viewOffer(offerIdFromUrl)
          .then(() => {
            onOpen();
          })
          .catch((error) => {
            console.error('Failed to view offer:', error);
          });
      }
    }
  }, [offerIdFromUrl, isLoading, offers, selectedOffer, viewOffer, onOpen]);
}
