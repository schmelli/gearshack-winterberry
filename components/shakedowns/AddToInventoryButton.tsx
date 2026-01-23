/**
 * AddToInventoryButton Component
 *
 * Feature: Shakedown Detail Enhancement
 *
 * Allows users to add a gear item from a shakedown to their own inventory.
 * Includes duplicate detection and confirmation dialog.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

import type { ShakedownGearItem } from '@/hooks/shakedowns/useShakedown';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { createClient } from '@/lib/supabase/client';

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

// =============================================================================
// Types
// =============================================================================

interface AddToInventoryButtonProps {
  /** The gear item to add */
  item: ShakedownGearItem;
  /** Whether the user already owns this item */
  alreadyOwned?: boolean;
  /** Callback after successful addition */
  onSuccess?: () => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Full width button */
  fullWidth?: boolean;
  /** Show text label */
  showLabel?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function AddToInventoryButton({
  item,
  alreadyOwned = false,
  onSuccess,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  showLabel = true,
}: AddToInventoryButtonProps): React.ReactElement {
  const t = useTranslations('Shakedowns.addToInventory');
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!user) {
      toast.error(t('errors.notLoggedIn'));
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Create new gear item in user's inventory
      const { error } = await supabase.from('gear_items').insert({
        user_id: user.uid,
        name: item.name,
        brand: item.brand,
        description: item.description,
        weight_grams: item.weightGrams,
        primary_image_url: item.imageUrl,
        product_type_id: item.productTypeId,
        status: 'own',
        source_share_token: item.id, // Attribution to original item
      });

      if (error) {
        console.error('Error adding item to inventory:', error);
        toast.error(t('errors.failed'));
        return;
      }

      toast.success(t('success'), {
        description: item.name,
      });

      setIsDialogOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Unexpected error adding item:', err);
      toast.error(t('errors.failed'));
    } finally {
      setIsLoading(false);
    }
  }, [user, item, t, onSuccess]);

  // Already owned state
  if (alreadyOwned) {
    return (
      <Button
        variant="secondary"
        size={size}
        disabled
        className={fullWidth ? 'w-full' : undefined}
      >
        <Check className="size-4" />
        {showLabel && <span className="ml-2">{t('alreadyOwned')}</span>}
      </Button>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={fullWidth ? 'w-full' : undefined}
        title={t('loginRequired')}
      >
        <Plus className="size-4" />
        {showLabel && <span className="ml-2">{t('button')}</span>}
      </Button>
    );
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isLoading}
          className={fullWidth ? 'w-full' : undefined}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {showLabel && <span className="ml-2">{t('button')}</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dialog.description', { itemName: item.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Item Preview */}
        <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
          <div className="size-12 rounded-md bg-muted flex items-center justify-center shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="size-12 rounded-md object-cover"
              />
            ) : (
              <Package className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{item.name}</p>
            {item.brand && (
              <p className="text-sm text-muted-foreground truncate">{item.brand}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('dialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {t('dialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddToInventoryButton;
