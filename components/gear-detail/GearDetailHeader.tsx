/**
 * GearDetailHeader Component
 *
 * Extracted from GearDetailContent.tsx
 * Displays the gear item name with tooltip, edit/move action buttons,
 * brand link, and status icons.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Pencil, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoveToInventoryButton } from '@/components/wishlist/MoveToInventoryButton';
import { DetailStatusIcons } from '@/components/gear-detail/DetailStatusIcons';
import { sanitizeExternalUrl } from '@/lib/utils';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface GearDetailHeaderProps {
  /** The gear item to display */
  item: GearItem;
  /** Callback when edit button is clicked */
  onEditClick?: () => void;
  /** Whether item is from wishlist (shows Move button) */
  isWishlistItem?: boolean;
  /** Callback to move wishlist item to inventory */
  onMoveToInventory?: (itemId: string) => Promise<void>;
  /** Callback after successful move */
  onMoveComplete?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailHeader({
  item,
  onEditClick,
  isWishlistItem = false,
  onMoveToInventory,
  onMoveComplete,
}: GearDetailHeaderProps) {
  const t = useTranslations('GearDetail');

  return (
    <div className="space-y-2">
      {/* Product name with edit button snug to the right */}
      <div className="flex items-start gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h2
                className="text-xl font-semibold leading-tight line-clamp-2 cursor-default"
                title={item.name.length > 60 ? item.name : undefined}
              >
                {item.name}
              </h2>
            </TooltipTrigger>
            {item.description && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{item.description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 -mt-0.5">
          {/* Feature 049 US3: Move to Inventory button for wishlist items */}
          {isWishlistItem && onMoveToInventory && (
            <MoveToInventoryButton
              itemId={item.id}
              itemName={item.name}
              onMove={onMoveToInventory}
              onMoveComplete={onMoveComplete}
              variant="ghost"
              iconOnly
              className="h-7 w-7"
            />
          )}
          {/* Edit button snug to name */}
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onEditClick}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">{t('aria.edit', { name: item.name })}</span>
            </Link>
          </Button>
        </div>
      </div>
      {/* Brand with optional link - SECURITY: Validate URL before rendering */}
      {item.brand && (
        <div>
          {sanitizeExternalUrl(item.brandUrl) ? (
            <a
              href={sanitizeExternalUrl(item.brandUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {item.brand}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">{item.brand}</p>
          )}
        </div>
      )}
      {/* Status icons row */}
      <DetailStatusIcons item={item} t={t} />
    </div>
  );
}
