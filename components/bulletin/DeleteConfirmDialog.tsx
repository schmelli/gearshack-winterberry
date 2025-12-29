'use client';

/**
 * Delete Confirm Dialog Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T067
 *
 * Confirmation dialog before deleting posts or replies.
 */

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

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'post' | 'reply';
  hasReplies?: boolean;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  hasReplies = false,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const t = useTranslations('bulletin');

  const title = type === 'post' ? t('delete.title') : t('delete.titleReply');
  const description =
    type === 'post'
      ? hasReplies
        ? t('delete.confirmWithReplies')
        : t('delete.confirmPost')
      : t('delete.confirmReply');

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('delete.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('loading') : t('delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
