/**
 * MoveToInventoryButton Component
 *
 * Feature: 049-wishlist-view
 * Tasks: T052, T053, T054, T082
 *
 * Button with confirmation dialog to move a wishlist item to inventory.
 * Uses shadcn/ui AlertDialog for confirmation to prevent accidental moves.
 * Shows loading state during async operation and disables button while processing.
 *
 * Accessibility Features (T082):
 * - aria-label on trigger button for screen readers
 * - AlertDialog has proper aria-describedby (via shadcn/ui AlertDialogDescription)
 * - Loading state communicated via aria-busy
 * - Focus trapped in dialog when open (Radix AlertDialog)
 * - Focus returned to trigger on close
 */

'use client';

import { useState, useId } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface MoveToInventoryButtonProps {
  /** Item ID to move */
  itemId: string;
  /** Item name for display in confirmation dialog */
  itemName: string;
  /** Callback to execute the move operation */
  onMove: (itemId: string) => Promise<void>;
  /** Callback after successful move (optional - for navigation) */
  onMoveComplete?: () => void;
  /** Callback for screen reader announcement after successful move */
  onMoveAnnouncement?: (message: string) => void;
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional class names */
  className?: string;
  /** Show only icon (for compact views) */
  iconOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function MoveToInventoryButton({
  itemId,
  itemName,
  onMove,
  onMoveComplete,
  onMoveAnnouncement,
  variant = 'secondary',
  size = 'sm',
  className,
  iconOnly = false,
  disabled = false,
}: MoveToInventoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate unique IDs for ARIA relationships
  const dialogDescriptionId = useId();

  // Handle the move operation with loading state
  const handleMove = async () => {
    setIsLoading(true);
    try {
      await onMove(itemId);
      setIsOpen(false);

      // T084: Announce success to screen readers
      onMoveAnnouncement?.(`${itemName} moved to inventory successfully.`);

      // Call completion callback after dialog closes
      onMoveComplete?.();
    } catch {
      // Error handling is done in the onMove callback (useWishlist hook)
      // Keep dialog open on error so user can retry or cancel
      // Note: Error announcements are handled by toast notifications
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? 'icon' : size}
          className={cn(
            iconOnly && 'h-8 w-8',
            className
          )}
          disabled={disabled || isLoading}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
          }}
          // T082: Descriptive aria-label for screen readers
          aria-label={`Move ${itemName} to inventory`}
          // T082: Indicate loading state
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2
              className={cn('animate-spin', iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')}
              aria-hidden="true"
            />
          ) : (
            <Package
              className={cn(iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')}
              aria-hidden="true"
            />
          )}
          {!iconOnly && (
            <span aria-hidden={isLoading}>
              {isLoading ? 'Moving...' : 'Move to Inventory'}
            </span>
          )}
          {iconOnly && <span className="sr-only">Move {itemName} to Inventory</span>}
        </Button>
      </AlertDialogTrigger>
      {/*
        T082: AlertDialogContent from Radix provides:
        - role="alertdialog"
        - aria-modal="true"
        - Focus trap when open
        - Focus return to trigger on close
        - Escape key to close
      */}
      <AlertDialogContent
        onClick={(e) => e.stopPropagation()}
        aria-describedby={dialogDescriptionId}
        aria-busy={isLoading}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Inventory</AlertDialogTitle>
          <AlertDialogDescription id={dialogDescriptionId}>
            Are you sure you want to move{' '}
            <span className="font-medium text-foreground">{itemName}</span>{' '}
            from your wishlist to your inventory?
            <br />
            <br />
            This will mark the item as owned gear. You can always edit its status later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            aria-label="Cancel and keep item in wishlist"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleMove}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
            aria-label={isLoading ? 'Moving item to inventory' : `Confirm move ${itemName} to inventory`}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Moving...</span>
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Move to Inventory</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MoveToInventoryButton;
