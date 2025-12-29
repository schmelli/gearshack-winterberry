/**
 * MarkAsPurchasedButton Component
 *
 * Feature: 053-merchant-integration
 * Task: T072
 *
 * Button to mark a wishlist item as purchased from a merchant.
 * Logs the conversion for attribution and optionally moves item to inventory.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateCommission, DEFAULT_COMMISSION_PERCENT } from '@/types/conversion';

// =============================================================================
// Types
// =============================================================================

interface AcceptedOffer {
  id: string;
  merchantName: string;
  offerPrice: number;
  regularPrice: number;
}

interface MarkAsPurchasedButtonProps {
  /** Gear item ID */
  itemId: string;
  /** Item name for display */
  itemName: string;
  /** Accepted offers for this item (from merchant offers) */
  acceptedOffers?: AcceptedOffer[];
  /** Callback to move item to inventory after purchase */
  onMoveToInventory?: (itemId: string) => Promise<void>;
  /** Callback after successful purchase logging */
  onPurchaseComplete?: () => void;
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional class names */
  className?: string;
  /** Show only icon */
  iconOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function MarkAsPurchasedButton({
  itemId,
  itemName,
  acceptedOffers = [],
  onMoveToInventory,
  onPurchaseComplete,
  variant = 'outline',
  size = 'sm',
  className,
  iconOnly = false,
  disabled = false,
}: MarkAsPurchasedButtonProps) {
  const t = useTranslations('Inventory.wishlist');
  const { user } = useAuth();
  const supabase = createBrowserClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [moveToInventory, setMoveToInventory] = useState(true);
  const [isLocalPickup, setIsLocalPickup] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        // Pre-select first offer if available
        if (acceptedOffers.length > 0) {
          setSelectedOfferId(acceptedOffers[0].id);
          setSalePrice(acceptedOffers[0].offerPrice.toString());
        } else {
          setSelectedOfferId('');
          setSalePrice('');
        }
        setMoveToInventory(true);
        setIsLocalPickup(false);
      }
    },
    [acceptedOffers]
  );

  // Update price when offer selection changes
  const handleOfferChange = useCallback(
    (offerId: string) => {
      setSelectedOfferId(offerId);
      const offer = acceptedOffers.find((o) => o.id === offerId);
      if (offer) {
        setSalePrice(offer.offerPrice.toString());
      }
    },
    [acceptedOffers]
  );

  // Handle purchase logging
  const handleConfirm = useCallback(async () => {
    if (!user) return;

    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) {
      toast.error(t('invalidPrice'));
      return;
    }

    setIsLoading(true);

    try {
      // If we have an offer, log as conversion
      if (selectedOfferId) {
        const offer = acceptedOffers.find((o) => o.id === selectedOfferId);
        if (!offer) throw new Error('Offer not found');

        // Fetch offer details
        const { data: offerData, error: offerError } = await supabase
          .from('merchant_offers')
          .select('merchant_id, catalog_item_id, user_id')
          .eq('id', selectedOfferId)
          .single();

        if (offerError || !offerData) {
          throw new Error('Failed to fetch offer details');
        }

        // Calculate commission
        const commissionAmount = calculateCommission(price);

        // Create conversion record
        const { error: conversionError } = await supabase
          .from('conversions')
          .insert({
            offer_id: selectedOfferId,
            user_id: user.id,
            merchant_id: offerData.merchant_id,
            catalog_item_id: offerData.catalog_item_id,
            gear_item_id: itemId,
            sale_price: price,
            commission_percent: DEFAULT_COMMISSION_PERCENT,
            commission_amount: commissionAmount,
            is_local_pickup: isLocalPickup,
            status: 'pending',
          });

        if (conversionError) throw conversionError;

        // Update offer status to converted
        await supabase
          .from('merchant_offers')
          .update({ status: 'converted' })
          .eq('id', selectedOfferId);

        // Log commission transaction
        const now = new Date();
        const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await supabase.from('merchant_transactions').insert({
          merchant_id: offerData.merchant_id,
          type: 'commission',
          amount: commissionAmount,
          description: `Commission on conversion for ${itemName}`,
          reference_type: 'conversion',
          billing_cycle_start: cycleStart.toISOString().split('T')[0],
          billing_cycle_end: cycleEnd.toISOString().split('T')[0],
          status: 'pending',
        });

        toast.success(t('purchaseLogged'));
      }

      // Move to inventory if requested
      if (moveToInventory && onMoveToInventory) {
        await onMoveToInventory(itemId);
      }

      setIsOpen(false);
      onPurchaseComplete?.();
    } catch (err) {
      console.error('Failed to log purchase:', err);
      toast.error(t('purchaseFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    selectedOfferId,
    salePrice,
    isLocalPickup,
    moveToInventory,
    itemId,
    itemName,
    acceptedOffers,
    onMoveToInventory,
    onPurchaseComplete,
    supabase,
    t,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? 'icon' : size}
          className={cn(iconOnly && 'h-8 w-8', className)}
          disabled={disabled || isLoading}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('markAsPurchased', { item: itemName })}
        >
          {isLoading ? (
            <Loader2
              className={cn('animate-spin', iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')}
            />
          ) : (
            <ShoppingBag
              className={cn(iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')}
            />
          )}
          {!iconOnly && (
            <span>{isLoading ? t('processing') : t('markPurchased')}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t('markAsPurchasedTitle')}</DialogTitle>
          <DialogDescription>
            {t('markAsPurchasedDescription', { item: itemName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Offer Selection (if available) */}
          {acceptedOffers.length > 0 && (
            <div className="space-y-2">
              <Label>{t('selectOffer')}</Label>
              <Select value={selectedOfferId} onValueChange={handleOfferChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOfferPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {acceptedOffers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.merchantName} - €{offer.offerPrice.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sale Price */}
          <div className="space-y-2">
            <Label htmlFor="salePrice">{t('actualPrice')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Local Pickup */}
          <div className="flex items-center justify-between">
            <Label htmlFor="localPickup">{t('localPickup')}</Label>
            <Switch
              id="localPickup"
              checked={isLocalPickup}
              onCheckedChange={setIsLocalPickup}
            />
          </div>

          {/* Move to Inventory */}
          <div className="flex items-center justify-between">
            <Label htmlFor="moveToInventory">{t('moveToInventoryAfter')}</Label>
            <Switch
              id="moveToInventory"
              checked={moveToInventory}
              onCheckedChange={setMoveToInventory}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !salePrice}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                {t('confirmPurchase')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MarkAsPurchasedButton;
