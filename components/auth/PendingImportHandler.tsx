'use client';

/**
 * Pending Import Handler
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T025, T026
 *
 * Checks localStorage for pending loadout import after authentication
 * and automatically imports the shared loadout to the user's wishlist.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { importLoadoutToWishlist } from '@/app/actions/sharing';

interface PendingImportHandlerProps {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
}

export function PendingImportHandler({ isAuthenticated }: PendingImportHandlerProps) {
  const t = useTranslations('SharedLoadout');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Only run if user is authenticated and not already processing
    if (!isAuthenticated || isProcessing) return;

    const checkPendingImport = async () => {
      // Check localStorage for pending import token
      const pendingToken = localStorage.getItem('pendingImport');

      if (!pendingToken) return;

      // Mark as processing to prevent duplicate imports
      setIsProcessing(true);

      try {
        // Remove token immediately to prevent re-import on refresh
        localStorage.removeItem('pendingImport');

        // Call server action to import the loadout
        const result = await importLoadoutToWishlist(pendingToken);

        if (result.success && result.itemsImported !== undefined) {
          // T026: Show success toast with item count
          toast.success(
            t('importSuccess', { count: result.itemsImported })
          );
        } else {
          // Show generic error if import failed
          toast.error(result.error || 'Failed to import loadout');

          // If there was an error, restore the token so user can retry
          if (result.error) {
            localStorage.setItem('pendingImport', pendingToken);
          }
        }
      } catch (error) {
        console.error('[PendingImportHandler] Unexpected error:', error);
        toast.error('An unexpected error occurred while importing the loadout');
      } finally {
        setIsProcessing(false);
      }
    };

    checkPendingImport();
  }, [isAuthenticated, isProcessing, t]);

  // This component doesn't render anything
  return null;
}
