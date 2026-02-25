'use client';

/**
 * VIP Archive Dialog Component
 *
 * Feature: 052-vip-loadouts
 * Task: T037
 *
 * Confirmation dialog for archiving VIP accounts with reason.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { archiveVip } from '@/lib/vip/vip-admin-service';
import { toast } from 'sonner';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vip: VipWithStats | null;
  onSuccess: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VipArchiveDialog({
  open,
  onOpenChange,
  vip,
  onSuccess,
}: VipArchiveDialogProps) {
  const t = useTranslations('vip.admin');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    if (!vip) return;

    setIsLoading(true);
    try {
      await archiveVip(vip.id, reason || undefined);
      toast.success(t('vipArchivedSuccess'));
      setReason('');
      onSuccess();
    } catch {
      toast.error(t('archiveVipFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setReason('');
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t('confirmMessage', { name: vip?.name || 'this VIP' })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="archive-reason">{t('reason')}</Label>
          <Textarea
            id="archive-reason"
            placeholder={t('reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              t('confirm')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default VipArchiveDialog;
