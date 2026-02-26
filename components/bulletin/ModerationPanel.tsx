'use client';

/**
 * Moderation Panel Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T061, T062, T065
 *
 * Admin panel for reviewing reported content and taking moderation actions.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Trash2,
  Ban,
  X,
  Loader2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useModerationReports,
  type ModerationReport,
} from '@/hooks/bulletin/useModerationReports';
import type { ModerationAction } from '@/types/bulletin';

export function ModerationPanel() {
  const t = useTranslations('bulletin');
  const { reports, isLoading, error, loadReports, resolveReport, dismissReport } =
    useModerationReports();
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleAction = async (
    report: ModerationReport,
    action: ModerationAction
  ) => {
    setProcessingId(report.id);
    const success = await resolveReport(report.id, action, report.target_author_id);
    setProcessingId(null);

    if (success) {
      toast.success(t('moderation.actionSuccess'));
    } else {
      toast.error(t('moderation.actionFailed'));
    }
  };

  const handleDismiss = async (reportId: string) => {
    setProcessingId(reportId);
    const success = await dismissReport(reportId);
    setProcessingId(null);

    if (success) {
      toast.success(t('moderation.dismissed'));
    } else {
      toast.error(t('moderation.actionFailed'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-destructive">{error}</span>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            {t('moderation.noReports')}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('moderation.noReportsSubtitle')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('moderation.title')}</h2>
        <Badge variant="secondary">
          {t('moderation.pendingCount', { count: reports.length })}
        </Badge>
      </div>

      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          isProcessing={processingId === report.id}
          onAction={(action) => handleAction(report, action)}
          onDismiss={() => handleDismiss(report.id)}
          t={t}
        />
      ))}
    </div>
  );
}

interface ReportCardProps {
  report: ModerationReport;
  isProcessing: boolean;
  onAction: (action: ModerationAction) => void;
  onDismiss: () => void;
  t: ReturnType<typeof useTranslations<'bulletin'>>;
}

function ReportCard({
  report,
  isProcessing,
  onAction,
  onDismiss,
  t,
}: ReportCardProps) {
  const isHighPriority = report.report_count >= 5;
  const timeAgo = formatDistanceToNow(new Date(report.created_at), {
    addSuffix: true,
  });

  return (
    <Card className={isHighPriority ? 'border-destructive' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {isHighPriority && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              {t(`report.reasons.${report.reason}`)}
              <Badge variant={isHighPriority ? 'destructive' : 'secondary'}>
                {t('moderation.reportCount', { count: report.report_count })}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('moderation.reportedBy', { name: report.reporter_name })} •{' '}
              {timeAgo}
            </CardDescription>
          </div>

          <Badge variant="outline">
            {report.target_type === 'post'
              ? t('moderation.targetPost')
              : t('moderation.targetReply')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target content preview */}
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground mb-1">
            {t('moderation.contentBy', { name: report.target_author_name })}
          </p>
          <p className="text-sm line-clamp-3">{report.target_content}</p>
        </div>

        {/* Report details */}
        {report.details && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('moderation.additionalDetails')}
            </p>
            <p className="text-sm italic">{report.details}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}
                {t('moderation.takeAction')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAction('delete_content')}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('moderation.deleteContent')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('warn_user')}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('moderation.warnUser')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('ban_1d')}>
                <Ban className="mr-2 h-4 w-4" />
                {t('moderation.ban1Day')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('ban_7d')}>
                <Ban className="mr-2 h-4 w-4" />
                {t('moderation.ban7Days')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAction('ban_permanent')}
                className="text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" />
                {t('moderation.banPermanent')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            {t('moderation.dismiss')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
