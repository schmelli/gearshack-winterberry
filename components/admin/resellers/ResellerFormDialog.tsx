/**
 * ResellerFormDialog Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Dialog wrapper for reseller create/edit form
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResellerForm } from './ResellerForm';
import type { Reseller, CreateResellerInput } from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

interface ResellerFormDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback to close dialog */
  onOpenChange: (open: boolean) => void;
  /** Existing reseller for editing (null for create) */
  reseller?: Reseller | null;
  /** Callback when form is submitted */
  onSubmit: (data: CreateResellerInput) => Promise<void>;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ResellerFormDialog({
  open,
  onOpenChange,
  reseller,
  onSubmit,
  isSubmitting = false,
}: ResellerFormDialogProps) {
  const t = useTranslations('AdminResellers');

  const handleSubmit = async (data: CreateResellerInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reseller ? t('editReseller') : t('createReseller')}
          </DialogTitle>
          <DialogDescription>
            {reseller ? t('editResellerDescription') : t('createResellerDescription')}
          </DialogDescription>
        </DialogHeader>
        <ResellerForm
          reseller={reseller}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
