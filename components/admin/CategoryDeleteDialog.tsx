/**
 * CategoryDeleteDialog Component
 *
 * Feature: Admin Panel with Category Management
 * Confirmation dialog for deleting categories
 */

'use client';

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
  if (!category) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{category.label}</strong>?
            </p>
            {category.level < 3 && (
              <p className="text-destructive">
                ⚠️ You must delete all child categories first. Categories with children cannot be deleted.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The category will be permanently removed from the database.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
