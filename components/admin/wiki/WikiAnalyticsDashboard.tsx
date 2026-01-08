/**
 * Wiki Analytics Dashboard
 *
 * Feature: Admin Section Enhancement
 *
 * Displays wiki statistics, most viewed pages, and recent activity.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  FileText,
  Eye,
  History,
  AlertTriangle,
  BookOpen,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import type { WikiAdminStats } from '@/types/admin';

// ============================================================================
// Types
// ============================================================================

interface WikiAnalyticsDashboardProps {
  stats: WikiAdminStats | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Component
// ============================================================================

export function WikiAnalyticsDashboard({
  stats,
  isLoading,
  error,
}: WikiAnalyticsDashboardProps) {
  const t = useTranslations('Admin.wiki');

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="mb-3 h-10" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="mb-3 h-10" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Pages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.totalPages')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.publishedPages} {t('stats.published')}, {stats.draftPages}{' '}
              {t('stats.drafts')}
            </p>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.totalViews')}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalViews)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.acrossAllPages')}
            </p>
          </CardContent>
        </Card>

        {/* Total Revisions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.revisions')}
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevisions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lockedPages} {t('stats.lockedPages')}
            </p>
          </CardContent>
        </Card>

        {/* Pending Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.pendingReports')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingReportsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingReportsCount > 0
                ? t('stats.needsAttention')
                : t('stats.allClear')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Most Viewed Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('mostViewed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostViewedPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noPages')}</p>
            ) : (
              <div className="space-y-3">
                {stats.mostViewedPages.map((page, index) => (
                  <Link
                    key={page.id}
                    href={`/community/wiki/${page.slug}`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{page.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {page.is_locked && (
                            <Lock className="h-3 w-3 text-amber-500" />
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {page.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {formatNumber(page.view_count)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noActivity')}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.editor_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(activity.editor_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.editor_name || 'Unknown'}
                        </span>{' '}
                        {t('edited')}{' '}
                        <Link
                          href={`/community/wiki/${activity.page_slug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {activity.page_title}
                        </Link>
                      </p>
                      {activity.edit_summary && (
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.edit_summary}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(activity.created_at)} · Rev{' '}
                        {activity.revision_number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('categoryBreakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('noCategories')}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.categoryBreakdown.map((cat) => (
                <div
                  key={cat.category_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{cat.category_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.page_count} {t('pages')} ·{' '}
                      {formatNumber(cat.total_views)} {t('views')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
