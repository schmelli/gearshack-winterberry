'use client';

import type { SharedGearItem } from '@/types/sharing';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { GearCard } from '@/components/inventory-gallery/GearCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface SharedGearCardProps {
  /** The shared gear item to display */
  item: SharedGearItem;
  /** Optional click handler for card interaction */
  onCardClick?: (item: SharedGearItem) => void;
  /** Optional indicator that user owns this item */
  isOwned?: boolean;
  /** Optional indicator that item is on user's wishlist */
  isOnWishlist?: boolean;
  /** Optional handler for adding item to wishlist (T041) */
  onAddToWishlist?: (item: SharedGearItem) => void;
  /** Whether the item is currently being added to wishlist (T041) */
  isAddingToWishlist?: boolean;
  /** Whether user is authenticated (controls wishlist button visibility) */
  isAuthenticated?: boolean;
  /** View density mode (defaults to 'standard') */
  viewDensity?: ViewDensity;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts a SharedGearItem to a GearItem for use with GearDetailModal
 * Feature: 048-shared-loadout-enhancement (T028)
 */
export function sharedGearItemToGearItem(item: SharedGearItem): GearItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    primaryImageUrl: item.primaryImageUrl,
    weightGrams: item.weightGrams,
    description: item.description,
    nobgImages: item.nobgImages ?? undefined,

    // Required GearItem fields with sensible defaults
    createdAt: new Date(),
    updatedAt: new Date(),
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    productTypeId: null,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: null,
    currency: null,
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * SharedGearCard - Wrapper component for displaying shared gear items
 *
 * Feature: 048-shared-loadout-enhancement (T014)
 *
 * Wraps the existing GearCard component and adapts SharedGearItem data
 * to the GearItem interface expected by GearCard. Adds optional status
 * badges for owned/wishlist indicators.
 */
export function SharedGearCard({
  item,
  onCardClick,
  isOwned = false,
  isOnWishlist = false,
  onAddToWishlist,
  isAddingToWishlist = false,
  isAuthenticated = false,
  viewDensity = 'standard',
}: SharedGearCardProps) {
  // Map SharedGearItem to GearItem interface for GearCard compatibility
  const gearItem = sharedGearItemToGearItem(item);

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(item);
    }
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onAddToWishlist) {
      onAddToWishlist(item);
    }
  };

  // Show wishlist button if:
  // - User is authenticated
  // - User doesn't own the item
  // - Item is not already on wishlist
  // - onAddToWishlist handler is provided
  const showWishlistButton = isAuthenticated && !isOwned && !isOnWishlist && onAddToWishlist;

  return (
    <div className="relative">
      {/* GearCard wrapper */}
      <GearCard
        item={gearItem}
        viewDensity={viewDensity}
        onClick={handleClick}
      />

      {/* Wishlist button (T041) - top-left for easy access */}
      {showWishlistButton && (
        <div className="absolute top-2 left-2 pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddToWishlist}
            disabled={isAddingToWishlist}
            className={cn(
              "h-8 px-2.5 bg-white/95 hover:bg-white border-zinc-200 shadow-sm",
              "text-zinc-700 hover:text-rose-600",
              "transition-all duration-200"
            )}
          >
            {isAddingToWishlist ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                <span className="text-xs">Adding...</span>
              </>
            ) : (
              <>
                <Heart className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">Add to Wishlist</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Status badges overlay (T043) - top-right, below edit button area */}
      {(isOwned || isOnWishlist) && (
        <div className="absolute top-12 right-2 flex flex-col gap-1.5 pointer-events-none">
          {isOwned && (
            <Badge
              variant="secondary"
              className={cn(
                "bg-emerald-500/90 text-white border-emerald-600 shadow-sm",
                "flex items-center gap-1"
              )}
            >
              <Check className="h-3 w-3" />
              <span className="text-[10px] font-semibold">Owned</span>
            </Badge>
          )}
          {isOnWishlist && (
            <Badge
              variant="secondary"
              className={cn(
                "bg-rose-500/90 text-white border-rose-600 shadow-sm",
                "flex items-center gap-1"
              )}
            >
              <Heart className="h-3 w-3 fill-current" />
              <span className="text-[10px] font-semibold">Wishlist</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
