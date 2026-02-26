/**
 * AdminMerchantDetail Component
 *
 * Feature: 053-merchant-integration
 * Task: T083
 *
 * Detailed view of a merchant application for admin review.
 * Includes approve/reject actions with feedback forms.
 */

'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Building2,
  Globe,
  Store,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MerchantWithUser } from '@/hooks/admin/useAdminMerchants';
import type { MerchantStatus } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface AdminMerchantDetailProps {
  merchant: MerchantWithUser | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string, note?: string) => Promise<boolean>;
  onReject: (id: string, reason: string) => Promise<boolean>;
  onSuspend: (id: string, reason: string) => Promise<boolean>;
  isProcessing: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function getBusinessTypeIcon(type: string) {
  switch (type) {
    case 'local':
      return <Store className="h-5 w-5" />;
    case 'chain':
      return <Building2 className="h-5 w-5" />;
    case 'online':
      return <Globe className="h-5 w-5" />;
    default:
      return <Store className="h-5 w-5" />;
  }
}

function getStatusInfo(status: MerchantStatus) {
  switch (status) {
    case 'approved':
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        variant: 'default' as const,
        label: 'Approved',
      };
    case 'pending':
      return {
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        variant: 'secondary' as const,
        label: 'Pending Review',
      };
    case 'rejected':
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        variant: 'destructive' as const,
        label: 'Rejected',
      };
    case 'suspended':
      return {
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        variant: 'outline' as const,
        label: 'Suspended',
      };
    default:
      return {
        icon: <Clock className="h-5 w-5" />,
        variant: 'secondary' as const,
        label: status,
      };
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// =============================================================================
// Component
// =============================================================================

export const AdminMerchantDetail = memo(function AdminMerchantDetail({
  merchant,
  open,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  isProcessing,
}: AdminMerchantDetailProps) {
  const t = useTranslations('AdminMerchants');

  // Action dialog state
  const [actionType, setActionType] = useState<
    'approve' | 'reject' | 'suspend' | null
  >(null);
  const [actionNote, setActionNote] = useState('');

  const handleAction = async () => {
    if (!merchant || !actionType) return;

    let success = false;
    switch (actionType) {
      case 'approve':
        success = await onApprove(merchant.id, actionNote || undefined);
        break;
      case 'reject':
        success = await onReject(merchant.id, actionNote);
        break;
      case 'suspend':
        success = await onSuspend(merchant.id, actionNote);
        break;
    }

    if (success) {
      setActionType(null);
      setActionNote('');
    }
  };

  const openActionDialog = (type: 'approve' | 'reject' | 'suspend') => {
    setActionType(type);
    setActionNote('');
  };

  if (!merchant) return null;

  const statusInfo = getStatusInfo(merchant.status);

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {getBusinessTypeIcon(merchant.businessType)}
              {merchant.businessName}
            </SheetTitle>
            <SheetDescription>{t('detailDescription')}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              <Badge variant={statusInfo.variant} className="text-sm">
                {t(`status${merchant.status.charAt(0).toUpperCase()}${merchant.status.slice(1)}`)}
              </Badge>
            </div>

            {/* Business Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('businessInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {getBusinessTypeIcon(merchant.businessType)}
                  <span className="capitalize">{merchant.businessType}</span>
                  <span className="text-muted-foreground">
                    {t(`type${merchant.businessType.charAt(0).toUpperCase()}${merchant.businessType.slice(1)}Desc`)}
                  </span>
                </div>

                {merchant.description && (
                  <p className="text-sm text-muted-foreground">
                    {merchant.description}
                  </p>
                )}

                {merchant.taxId && (
                  <div className="text-sm">
                    <span className="font-medium">{t('taxId')}:</span>{' '}
                    <span className="font-mono">{merchant.taxId}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('contactInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${merchant.contactEmail}`}
                    className="hover:underline"
                  >
                    {merchant.contactEmail}
                  </a>
                </div>

                {merchant.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${merchant.contactPhone}`}
                      className="hover:underline"
                    >
                      {merchant.contactPhone}
                    </a>
                  </div>
                )}

                {merchant.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={merchant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {merchant.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applicant Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('applicantInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {merchant.user?.displayName || merchant.user?.email || t('unknownUser')}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('appliedOn')}: {formatDate(merchant.createdAt)}
                </div>
                {merchant.verifiedAt && (
                  <div className="text-sm text-muted-foreground">
                    {t('verifiedOn')}: {formatDate(merchant.verifiedAt)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-medium">{t('actions')}</h4>

              {merchant.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => openActionDialog('approve')}
                    disabled={isProcessing}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openActionDialog('reject')}
                    disabled={isProcessing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('reject')}
                  </Button>
                </div>
              )}

              {merchant.status === 'approved' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openActionDialog('suspend')}
                  disabled={isProcessing}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {t('suspend')}
                </Button>
              )}

              {merchant.status === 'suspended' && (
                <Button
                  className="w-full"
                  onClick={() => openActionDialog('approve')}
                  disabled={isProcessing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('reactivate')}
                </Button>
              )}

              {merchant.status === 'rejected' && (
                <Button
                  className="w-full"
                  onClick={() => openActionDialog('approve')}
                  disabled={isProcessing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('approveAnyway')}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' && t('confirmApproveTitle')}
              {actionType === 'reject' && t('confirmRejectTitle')}
              {actionType === 'suspend' && t('confirmSuspendTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' && t('confirmApproveDesc')}
              {actionType === 'reject' && t('confirmRejectDesc')}
              {actionType === 'suspend' && t('confirmSuspendDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="action-note">
              {actionType === 'approve' ? t('noteOptional') : t('reasonRequired')}
            </Label>
            <Textarea
              id="action-note"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? t('approveNotePlaceholder')
                  : actionType === 'reject'
                    ? t('rejectReasonPlaceholder')
                    : t('suspendReasonPlaceholder')
              }
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={
                isProcessing ||
                (actionType !== 'approve' && !actionNote.trim())
              }
              className={cn(
                actionType === 'reject' && 'bg-destructive hover:bg-destructive/90',
                actionType === 'suspend' && 'bg-orange-500 hover:bg-orange-600'
              )}
            >
              {isProcessing
                ? t('processing')
                : actionType === 'approve'
                  ? t('confirmApprove')
                  : actionType === 'reject'
                    ? t('confirmReject')
                    : t('confirmSuspend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default AdminMerchantDetail;
