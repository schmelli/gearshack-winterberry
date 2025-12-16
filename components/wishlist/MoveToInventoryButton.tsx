/**
 * MoveToInventoryButton Component
 *
 * Feature: 049-wishlist-view
 * Tasks: T052, T053, T054
 *
 * Button with confirmation dialog to move a wishlist item to inventory.
 * Uses shadcn/ui AlertDialog for confirmation to prevent accidental moves.
 * Shows loading state during async operation and disables button while processing.
 */

'use client';

import { useState } from 'react';
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
  variant = 'secondary',
  size = 'sm',
  className,
  iconOnly = false,
  disabled = false,
}: MoveToInventoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle the move operation with loading state
  const handleMove = async () => {
    setIsLoading(true);
    try {
      await onMove(itemId);
      setIsOpen(false);
      // Call completion callback after dialog closes
      onMoveComplete?.();
    } catch {
      // Error handling is done in the onMove callback (useWishlist hook)
      // Keep dialog open on error so user can retry or cancel
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
        >
          {isLoading ? (
            <Loader2 className={cn('animate-spin', iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')} />
          ) : (
            <Package className={cn(iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4')} />
          )}
          {!iconOnly && (isLoading ? 'Moving...' : 'Move to Inventory')}
          {iconOnly && <span className="sr-only">Move to Inventory</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Inventory</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to move{' '}
            <span className="font-medium text-foreground">{itemName}</span>{' '}
            from your wishlist to your inventory?
            <br />
            <br />
            This will mark the item as owned gear. You can always edit its status later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleMove}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Move to Inventory
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MoveToInventoryButton;
