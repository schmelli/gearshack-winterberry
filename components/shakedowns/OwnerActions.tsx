/**
 * OwnerActions Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Owner-only actions dropdown for shakedown management.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Archive,
  CheckCircle2,
  Edit,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Package,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import type { ShakedownPrivacy } from '@/types/shakedown';
import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface OwnerActionsProps {
  shakedownId: string;
  loadoutId: string;
  status: 'open' | 'completed' | 'archived';
  privacy: ShakedownPrivacy;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShareToBulletin: () => Promise<void>;
  isProcessing: boolean;
  isSharing: boolean;
  isAlreadyShared: boolean;
}

export function OwnerActions({
  shakedownId,
  loadoutId,
  status,
  privacy,
  onComplete,
  onReopen,
  onArchive,
  onDelete,
  onShareToBulletin,
  isProcessing,
  isSharing,
  isAlreadyShared,
}: OwnerActionsProps): React.ReactElement {
  const t = useTranslations('Shakedowns.actions');
  const tCommon = useTranslations('Common');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canShareToBulletin = privacy === 'public' && status === 'open';

  const handleDeleteConfirm = () => {
    onDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/community/shakedowns/${shakedownId}/edit`}>
              <Edit className="size-4" />
              {t('edit')}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/loadouts/${loadoutId}`}>
              <Package className="size-4" />
              {t('updateLoadout')}
            </Link>
          </DropdownMenuItem>

          {canShareToBulletin && (
            <DropdownMenuItem
              onClick={onShareToBulletin}
              disabled={isSharing || isAlreadyShared}
            >
              {isSharing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Megaphone className="size-4" />
              )}
              {isAlreadyShared ? t('alreadyShared') : t('shareToBulletin')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {status === 'open' && (
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle2 className="size-4" />
              {t('complete')}
            </DropdownMenuItem>
          )}

          {status === 'completed' && (
            <>
              <DropdownMenuItem onClick={onReopen}>
                <RefreshCw className="size-4" />
                {t('reopen')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            {tCommon('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteShakedown')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteShakedownConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="size-4" />
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default OwnerActions;
