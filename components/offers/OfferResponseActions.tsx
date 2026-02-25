/**
 * OfferResponseActions Component
 *
 * Feature: 053-merchant-integration
 * Task: T060
 *
 * Action buttons for responding to offers: accept, decline, block merchant, report.
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Ban, Flag, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { OfferReportReason } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface OfferResponseActionsProps {
  /** Offer ID */
  offerId: string;
  /** Merchant ID for blocking */
  merchantId: string;
  /** Merchant name for display */
  merchantName: string;
  /** Accept handler */
  onAccept: () => Promise<boolean>;
  /** Decline handler */
  onDecline: () => Promise<boolean>;
  /** Block merchant handler */
  onBlockMerchant: (reason?: string) => Promise<boolean>;
  /** Report handler */
  onReport: (reason: string, details?: string) => Promise<boolean>;
  /** Processing state */
  isProcessing: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const OfferResponseActions = memo(function OfferResponseActions({
  offerId: _offerId,
  merchantId: _merchantId,
  merchantName,
  onAccept,
  onDecline,
  onBlockMerchant,
  onReport,
  isProcessing,
  className,
}: OfferResponseActionsProps) {
  const t = useTranslations('UserOffers');

  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [reportReason, setReportReason] = useState<OfferReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');

  const handleAccept = useCallback(async () => {
    await onAccept();
  }, [onAccept]);

  const handleDecline = useCallback(async () => {
    const success = await onDecline();
    if (success) {
      setShowDeclineConfirm(false);
    }
  }, [onDecline]);

  const handleBlock = useCallback(async () => {
    const success = await onBlockMerchant(blockReason || undefined);
    if (success) {
      setShowBlockDialog(false);
      setBlockReason('');
    }
  }, [onBlockMerchant, blockReason]);

  const handleReport = useCallback(async () => {
    const success = await onReport(reportReason, reportDetails || undefined);
    if (success) {
      setShowReportDialog(false);
      setReportReason('spam');
      setReportDetails('');
    }
  }, [onReport, reportReason, reportDetails]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Actions */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          size="lg"
          onClick={handleAccept}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          {t('accept')}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowDeclineConfirm(true)}
          disabled={isProcessing}
        >
          <XCircle className="h-4 w-4 mr-2" />
          {t('decline')}
        </Button>
      </div>

      {/* Secondary Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
            {t('moreOptions')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
            <Ban className="h-4 w-4 mr-2" />
            {t('blockMerchant', { merchant: '' })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowReportDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="h-4 w-4 mr-2" />
            {t('report')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Decline Confirmation Dialog */}
      <Dialog open={showDeclineConfirm} onOpenChange={setShowDeclineConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('declineConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('declineConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineConfirm(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('confirmDecline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Merchant Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('blockMerchantTitle')}</DialogTitle>
            <DialogDescription>
              {t('blockMerchantDescription', { merchant: merchantName })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="blockReason">{t('blockReasonLabel')}</Label>
            <Textarea
              id="blockReason"
              placeholder={t('blockReasonPlaceholder')}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('confirmBlock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Offer Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('reportTitle')}
            </DialogTitle>
            <DialogDescription>{t('reportDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>{t('reportReasonLabel')}</Label>
              <RadioGroup
                value={reportReason}
                onValueChange={(v) => setReportReason(v as OfferReportReason)}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam" className="font-normal">
                    {t('reportReasons.spam')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="misleading" id="misleading" />
                  <Label htmlFor="misleading" className="font-normal">
                    {t('reportReasons.misleading')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <Label htmlFor="inappropriate" className="font-normal">
                    {t('reportReasons.inappropriate')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal">
                    {t('reportReasons.other')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="reportDetails">{t('reportDetailsLabel')}</Label>
              <Textarea
                id="reportDetails"
                placeholder={t('reportDetailsPlaceholder')}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReport} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('submitReport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
