/**
 * CategoryDeleteDialog Component
 *
 * Feature: Admin Panel with Category Management
 * Confirmation dialog for deleting categories
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Category } from '@/types/category';

// =============================================================================
// Types
// =============================================================================

interface CategoryDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onConfirm: () => void;
  isLoading: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
  isLoading,
}: CategoryDeleteDialogProps) {
  const t = useTranslations('Admin.categories');
  const tCommon = useTranslations('Common');

  if (!category) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t('confirmDeleteMessage', { category: category.label })}
            </p>
            {category.level < 3 && (
              <p className="text-destructive">
                ⚠️ {t('cannotDeleteChildrenWarning')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('deleteWarning')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? tCommon('deleting') : tCommon('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
