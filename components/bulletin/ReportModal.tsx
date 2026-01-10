'use client';

/**
 * Report Modal Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T055
 *
 * Dialog for reporting posts/replies with reason selection.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { createBulletinReport } from '@/lib/supabase/bulletin-queries';
import { BULLETIN_REPORT_REASONS, type BulletinReportReason } from '@/types/bulletin';
import { isPostError } from '@/hooks/bulletin';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'reply';
  targetId: string;
}

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
}: ReportModalProps) {
  const t = useTranslations('bulletin');
  const supabase = createClient();

  const [reason, setReason] = useState<BulletinReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reason || !targetId) return;

    setIsSubmitting(true);
    try {
      await createBulletinReport(supabase, {
        target_type: targetType,
        target_id: targetId,
        reason: reason as BulletinReportReason,
        details: details.trim() || undefined,
      });

      toast.success(t('success.reportSubmitted'));
      handleClose();
    } catch (err) {
      if (isPostError(err) && err.type === 'duplicate') {
        toast.error(t('errors.duplicateReport'));
      } else {
        toast.error(t('errors.reportFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason, targetId, targetType, details, supabase, t, onClose]);

  const handleClose = useCallback(() => {
    setReason('');
    setDetails('');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('report.title')}</DialogTitle>
          <DialogDescription>{t('report.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Reason selector */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t('report.reasonLabel')}</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as BulletinReportReason)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder={t('report.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {BULLETIN_REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {t(r.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional details */}
          <div className="space-y-2">
            <Label htmlFor="details">{t('report.detailsLabel')}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t('report.detailsPlaceholder')}
              maxLength={500}
              disabled={isSubmitting}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('report.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason}
            >
              {isSubmitting ? t('report.submitting') : t('report.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
