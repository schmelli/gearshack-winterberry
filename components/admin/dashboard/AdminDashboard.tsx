/**
 * AdminDashboard Component
 *
 * Feature: Admin Section Enhancement
 *
 * Main dashboard component showing platform statistics.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Users,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Package,
  FolderOpen,
  FileText,
  MessageSquare,
  Tent,
  TrendingUp,
  Activity,
  Crown,
  Store,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard';
import { StatCard } from './StatCard';

// ============================================================================
// Component
// ============================================================================

export function AdminDashboard() {
  const t = useTranslations('Admin.dashboard');
  const { stats, isLoading, error } = useAdminDashboard();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('sections.users')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('stats.totalUsers')}
            value={stats?.totalUsers || 0}
            icon={Users}
            description={t('stats.allRegistered')}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.newUsers7d')}
            value={stats?.newUsers7d || 0}
            icon={UserPlus}
            description={t('stats.last7Days')}
            isLoading={isLoading}
            iconClassName="text-green-500"
          />
          <StatCard
            title={t('stats.newUsers30d')}
            value={stats?.newUsers30d || 0}
            icon={UserPlus}
            description={t('stats.last30Days')}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.activeUsers')}
            value={stats?.activeUsers7d || 0}
            icon={Activity}
            description={t('stats.last7Days')}
            isLoading={isLoading}
            iconClassName="text-blue-500"
          />
        </div>
      </div>

      {/* User Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {t('sections.userBreakdown')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title={t('stats.admins')}
            value={stats?.adminCount || 0}
            icon={ShieldCheck}
            isLoading={isLoading}
            iconClassName="text-purple-500"
          />
          <StatCard
            title={t('stats.trailblazers')}
            value={stats?.trailblazerCount || 0}
            icon={Crown}
            isLoading={isLoading}
            iconClassName="text-amber-500"
          />
          <StatCard
            title={t('stats.vips')}
            value={stats?.vipCount || 0}
            icon={Crown}
            isLoading={isLoading}
            iconClassName="text-yellow-500"
          />
          <StatCard
            title={t('stats.merchants')}
            value={stats?.merchantCount || 0}
            icon={Store}
            isLoading={isLoading}
            iconClassName="text-green-500"
          />
          <StatCard
            title={t('stats.suspended')}
            value={(stats?.suspendedCount || 0) + (stats?.bannedCount || 0)}
            icon={stats?.bannedCount ? Ban : AlertTriangle}
            description={
              stats?.bannedCount
                ? t('stats.includingBanned', { count: stats.bannedCount })
                : undefined
            }
            isLoading={isLoading}
            iconClassName="text-red-500"
          />
        </div>
      </div>

      {/* Content Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('sections.content')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title={t('stats.gearItems')}
            value={stats?.totalGearItems || 0}
            icon={Package}
            description={t('stats.newItems', {
              count: stats?.newGearItems7d || 0,
            })}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.loadouts')}
            value={stats?.totalLoadouts || 0}
            icon={FolderOpen}
            description={t('stats.newItems', {
              count: stats?.newLoadouts7d || 0,
            })}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.wikiPages')}
            value={stats?.totalWikiPages || 0}
            icon={FileText}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.bulletinPosts')}
            value={stats?.totalBulletinPosts || 0}
            icon={MessageSquare}
            description={t('stats.newItems', { count: stats?.newPosts7d || 0 })}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.shakedowns')}
            value={stats?.totalShakedowns || 0}
            icon={Tent}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Engagement Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {t('sections.engagement')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <StatCard
            title={t('stats.avgGearPerUser')}
            value={stats?.avgGearPerUser || 0}
            icon={TrendingUp}
            description={t('stats.perActiveUser')}
            isLoading={isLoading}
          />
          <StatCard
            title={t('stats.avgLoadoutsPerUser')}
            value={stats?.avgLoadoutsPerUser || 0}
            icon={TrendingUp}
            description={t('stats.perActiveUser')}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Placeholder for Vercel/Sentry (future) */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
