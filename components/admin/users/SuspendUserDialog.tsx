/**
 * Suspend User Dialog
 *
 * Feature: Admin Section Enhancement
 *
 * Dialog for suspending or banning users with reason input.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Ban } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminUserView, SuspensionDuration } from '@/types/admin';

// ============================================================================
// Types
// ============================================================================

interface SuspendUserDialogProps {
  user: AdminUserView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string, reason: string, duration: SuspensionDuration) => void;
  isLoading?: boolean;
}

interface BanUserDialogProps {
  user: AdminUserView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string, reason: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// Suspend Dialog
// ============================================================================

export function SuspendUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: SuspendUserDialogProps) {
  const t = useTranslations('Admin.users');
  const tCommon = useTranslations('Common');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<SuspensionDuration>('7d');

  const handleConfirm = () => {
    if (!user || !reason.trim()) return;
    onConfirm(user.id, reason.trim(), duration);
    setReason('');
    setDuration('7d');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setDuration('7d');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            {t('suspend.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('suspend.description', {
              name: user?.display_name || user?.email || 'this user',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">{t('suspend.duration')}</Label>
            <Select
              value={duration}
              onValueChange={(v) => setDuration(v as SuspensionDuration)}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">{t('suspend.durations.1d')}</SelectItem>
                <SelectItem value="7d">{t('suspend.durations.7d')}</SelectItem>
                <SelectItem value="30d">{t('suspend.durations.30d')}</SelectItem>
                <SelectItem value="90d">{t('suspend.durations.90d')}</SelectItem>
                <SelectItem value="indefinite">{t('suspend.durations.permanent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t('suspend.reason')}</Label>
            <Textarea
              id="reason"
              placeholder={t('suspend.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isLoading ? tCommon('loading') : t('suspend.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Ban Dialog
// ============================================================================

export function BanUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: BanUserDialogProps) {
  const t = useTranslations('Admin.users');
  const tCommon = useTranslations('Common');
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!user || !reason.trim()) return;
    onConfirm(user.id, reason.trim());
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            {t('ban.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('ban.description', {
              name: user?.display_name || user?.email || 'this user',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{t('ban.warning')}</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="ban-reason">{t('ban.reason')}</Label>
            <Textarea
              id="ban-reason"
              placeholder={t('ban.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? tCommon('loading') : t('ban.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
