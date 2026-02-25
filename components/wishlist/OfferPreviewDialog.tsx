/**
 * OfferPreviewDialog Component
 *
 * Feature: 050-price-tracking (UX enhancement)
 *
 * Shows offer details in a dialog before opening in external browser.
 * This keeps users in the app while providing full context about the offer.
 *
 * Architecture: Stateless UI component following Feature-Sliced Light
 */

'use client';

import { ExternalLink, Store, Tag, Calendar, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

export interface OfferPreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Product name */
  productName: string;
  /** Merchant/retailer name */
  merchantName: string;
  /** Offer price */
  price: number;
  /** Price currency code */
  currency: string;
  /** Original price (for showing discount) */
  originalPrice?: number;
  /** URL to the offer */
  offerUrl: string;
  /** Expiration date (ISO string) */
  expiresAt?: string | null;
  /** Whether this is a personal/exclusive offer */
  isPersonalOffer?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'EUR'): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `€${amount.toFixed(2)}`;
  }
}

/**
 * Extract domain from URL for display
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Format expiration date
 */
function formatExpirationDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Component
// =============================================================================

export function OfferPreviewDialog({
  open,
  onOpenChange,
  productName,
  merchantName,
  price,
  currency,
  originalPrice,
  offerUrl,
  expiresAt,
  isPersonalOffer = false,
}: OfferPreviewDialogProps) {
  const t = useTranslations('Wishlist');

  const discount =
    originalPrice && originalPrice > price && Number.isFinite(originalPrice)
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const domain = getDomainFromUrl(offerUrl);

  const handleOpenInBrowser = () => {
    window.open(offerUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-muted-foreground" />
            {t('offerPreview.title')}
          </DialogTitle>
          <DialogDescription>
            {t('offerPreview.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight">{productName}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              {merchantName}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {isPersonalOffer && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <Shield className="h-3 w-3 mr-1" />
                {t('offerPreview.exclusiveOffer')}
              </Badge>
            )}
            {discount && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Tag className="h-3 w-3 mr-1" />
                {discount}% {t('offerPreview.off')}
              </Badge>
            )}
            {expiresAt && (
              <Badge variant="outline" className="text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {t('offerPreview.validUntil')} {formatExpirationDate(expiresAt)}
              </Badge>
            )}
          </div>

          {/* Price Display */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">
                {formatPrice(price, currency)}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(originalPrice, currency)}
                </span>
              )}
            </div>
          </div>

          {/* URL Preview */}
          <div className="text-sm text-muted-foreground">
            <p className="mb-1">{t('offerPreview.youWillVisit')}</p>
            <p className="font-mono text-xs bg-muted px-2 py-1 rounded truncate">
              {domain}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t('offerPreview.cancel')}
          </Button>
          <Button onClick={handleOpenInBrowser} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('offerPreview.openInBrowser')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
