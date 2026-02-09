/**
 * ShakedownGearDetailModal Component
 *
 * Feature: Shakedown Detail Enhancement
 *
 * Displays detailed information about a gear item from a shakedown.
 * Uses URL-based state management (?item=<id>) for deep linking.
 * Desktop: Dialog | Mobile: Sheet (90vh)
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Package,
  Scale,
  Tag,
  Plus,
  Info,
  Youtube,
  Lightbulb,
} from 'lucide-react';

import type { ShakedownGearItem } from '@/hooks/shakedowns/useShakedown';
import { useMediaQuery } from '@/hooks/useMediaQuery';


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// =============================================================================
// Types
// =============================================================================

interface ShakedownGearDetailModalProps {
  /** All gear items in the shakedown */
  gearItems: ShakedownGearItem[];
  /** Callback when user wants to add item to their inventory */
  onAddToInventory?: (item: ShakedownGearItem) => void;
  /** Whether the current user already owns this item */
  isItemOwned?: (itemId: string) => boolean;
}

// =============================================================================
// Hook for URL-based Modal State
// =============================================================================

function useShakedownGearDetailModalState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedItemId = searchParams.get('item');
  const isOpen = Boolean(selectedItemId);

  const open = useCallback(
    (itemId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('item', itemId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('item');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  return { isOpen, selectedItemId, open, close };
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownGearDetailModal({
  gearItems,
  onAddToInventory,
  isItemOwned,
}: ShakedownGearDetailModalProps): React.ReactElement | null {
  const _t = useTranslations('Shakedowns.gearDetail');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isOpen, selectedItemId, close } = useShakedownGearDetailModalState();

  // Find the selected item
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return gearItems.find((item) => item.id === selectedItemId) || null;
  }, [gearItems, selectedItemId]);

  // Check if user already owns this item
  const alreadyOwned = useMemo(() => {
    if (!selectedItem || !isItemOwned) return false;
    return isItemOwned(selectedItem.id);
  }, [selectedItem, isItemOwned]);

  const handleAddToInventory = useCallback(() => {
    if (selectedItem && onAddToInventory) {
      onAddToInventory(selectedItem);
    }
  }, [selectedItem, onAddToInventory]);

  // Don't render if no item selected
  if (!selectedItem) return null;

  const content = (
    <GearDetailContent
      item={selectedItem}
      alreadyOwned={alreadyOwned}
      onAddToInventory={onAddToInventory ? handleAddToInventory : undefined}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="bottom" className="h-[90vh] px-0">
          <SheetHeader className="px-4 pb-4">
            <SheetTitle className="text-left">{selectedItem.name}</SheetTitle>
            {selectedItem.brand && (
              <SheetDescription className="text-left">
                {selectedItem.brand}
              </SheetDescription>
            )}
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-100px)]">
            <div className="px-4 pb-6">{content}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{selectedItem.name}</DialogTitle>
          {selectedItem.brand && (
            <DialogDescription>{selectedItem.brand}</DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Detail Content Component
// =============================================================================

interface GearDetailContentProps {
  item: ShakedownGearItem;
  alreadyOwned: boolean;
  onAddToInventory?: () => void;
}

function GearDetailContent({
  item,
  alreadyOwned,
  onAddToInventory,
}: GearDetailContentProps): React.ReactElement {
  const t = useTranslations('Shakedowns.gearDetail');

  const formatWeight = (grams: number): string => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams} g`;
  };

  return (
    <div className="space-y-6">
      {/* Image Section */}
      <div className="flex justify-center">
        <Avatar className="size-32 rounded-xl">
          {item.imageUrl ? (
            <AvatarImage
              src={item.imageUrl}
              alt={item.name}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-xl bg-muted">
            <Package className="size-12 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Add to Inventory Button */}
      {onAddToInventory && (
        <Button
          onClick={onAddToInventory}
          disabled={alreadyOwned}
          className="w-full"
          variant={alreadyOwned ? 'secondary' : 'default'}
        >
          {alreadyOwned ? (
            <>
              <Package className="size-4 mr-2" />
              {t('alreadyOwned')}
            </>
          ) : (
            <>
              <Plus className="size-4 mr-2" />
              {t('addToInventory')}
            </>
          )}
        </Button>
      )}

      <Separator />

      {/* Specifications */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Info className="size-4" />
          {t('specifications')}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {/* Weight */}
          {item.weightGrams !== null && (
            <SpecCard
              icon={<Scale className="size-4" />}
              label={t('weight')}
              value={formatWeight(item.weightGrams)}
            />
          )}

          {/* Category */}
          {(item.categoryName || item.productTypeId) && (
            <SpecCard
              icon={<Tag className="size-4" />}
              label={t('category')}
              value={item.categoryName || item.productTypeId || ''}
            />
          )}
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('description')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        </>
      )}

      {/* Placeholder for future sections */}
      <Separator />

      {/* YouTube Reviews Placeholder */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Youtube className="size-4" />
          {t('youtubeReviews')}
        </h4>
        <p className="text-xs text-muted-foreground italic">
          {t('youtubeComingSoon')}
        </p>
      </div>

      {/* GearGraph Insights Placeholder */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="size-4" />
          {t('gearInsights')}
        </h4>
        <p className="text-xs text-muted-foreground italic">
          {t('insightsComingSoon')}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface SpecCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function SpecCard({ icon, label, value }: SpecCardProps): React.ReactElement {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

// =============================================================================
// Export hook for external use
// =============================================================================

export { useShakedownGearDetailModalState };
export default ShakedownGearDetailModal;
