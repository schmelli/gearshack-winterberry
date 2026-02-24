/**
 * GearGraph Status Page
 *
 * Displays the health and stats of the GearGraph server.
 * Fetches data from geargraph.gearshack.app/health and /stats
 *
 * Business logic extracted to useGearGraphStatus hook
 * following Feature-Sliced Light architecture.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import {
  RefreshCw,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Database,
  GitBranch,
  Clock,
  Activity,
  Workflow,
  Trash2,
  GitMerge,
  Copy,
  Users,
} from 'lucide-react';
import {
  useGearGraphStatus,
  formatRelativeTime,
  formatDateTime,
  type HealthResponse,
} from '@/hooks/admin/useGearGraphStatus';

// =============================================================================
// Helper Components
// =============================================================================

function StatusBadge({
  loading,
  healthError,
  health,
  t,
}: {
  loading: boolean;
  healthError: string | null;
  health: HealthResponse | null;
  t: (key: string) => string;
}) {
  if (loading) return <Badge variant="secondary">{t('status.loading')}</Badge>;
  if (healthError) return <Badge variant="destructive">{t('status.offline')}</Badge>;
  if (health?.status === 'ok' || health?.status === 'healthy') {
    return <Badge className="bg-green-500 hover:bg-green-600">{t('status.online')}</Badge>;
  }
  if (health?.status === 'degraded') {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">{t('status.degraded')}</Badge>;
  }
  if (health?.status === 'error') {
    return <Badge variant="destructive">{t('status.error')}</Badge>;
  }
  return <Badge variant="secondary">{t('status.unknown')}</Badge>;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'default',
}: {
  icon: typeof Database;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'warning' | 'success' | 'muted';
}) {
  const variantClasses = {
    default: 'border-border',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    success: 'border-green-500/50 bg-green-500/5',
    muted: 'border-border bg-muted/30',
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default function GearGraphStatusPage() {
  const { health, stats, healthError, statsError, loading, lastUpdated, fetchData } =
    useGearGraphStatus();
  const t = useTranslations('GearGraphStatus');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('serverLabel')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge loading={loading} healthError={healthError} health={health} t={t} />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-muted-foreground">
          {t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
        </p>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error State */}
      {healthError && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium text-destructive">{t('connectionError')}</p>
                <p className="text-sm text-muted-foreground">{healthError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!loading && health && (
        <div className="space-y-6">
          {/* Status Warnings */}
          {health.statusReasons && health.statusReasons.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-base">{t('warnings')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {health.statusReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Connection Status */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Database}
              label={t('memgraph')}
              value={health.memgraphConnected ? t('connected') : t('disconnected')}
              variant={health.memgraphConnected ? 'success' : 'warning'}
            />
            <MetricCard
              icon={Workflow}
              label={t('runningWorkflows')}
              value={health.workflowsRunning ?? 0}
              variant={health.workflowsRunning && health.workflowsRunning > 0 ? 'default' : 'muted'}
            />
            <MetricCard
              icon={Users}
              label={t('pendingApprovals')}
              value={health.pendingApprovals ?? 0}
              variant={health.pendingApprovals && health.pendingApprovals > 100 ? 'warning' : 'default'}
            />
            <MetricCard
              icon={Clock}
              label={t('lastHygieneRun')}
              value={health.lastHygieneRun ? formatRelativeTime(health.lastHygieneRun) : '\u2013'}
              subtext={health.lastHygieneRun ? formatDateTime(health.lastHygieneRun) : undefined}
            />
          </div>

          {/* Graph Metrics */}
          {health.metrics && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>{t('graphMetrics')}</CardTitle>
                </div>
                <CardDescription>
                  {t('graphMetricsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <MetricCard
                    icon={Database}
                    label={t('totalNodes')}
                    value={health.metrics.totalNodes}
                  />
                  <MetricCard
                    icon={GitBranch}
                    label={t('relationships')}
                    value={health.metrics.totalRelationships}
                  />
                  <MetricCard
                    icon={AlertCircle}
                    label={t('orphanedNodes')}
                    value={health.metrics.orphanCount}
                    variant={health.metrics.orphanCount > 100 ? 'warning' : 'default'}
                  />
                  <MetricCard
                    icon={Copy}
                    label={t('duplicatesDetected')}
                    value={health.metrics.duplicatesDetected}
                    variant={health.metrics.duplicatesDetected > 0 ? 'warning' : 'success'}
                  />
                  <MetricCard
                    icon={GitMerge}
                    label={t('merges24h')}
                    value={health.metrics.mergesExecuted24h}
                  />
                  <MetricCard
                    icon={Trash2}
                    label={t('deletions24h')}
                    value={health.metrics.deletions24h}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t('timestamps')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {health.lastHygieneRun && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('lastHygieneRun')}</p>
                    <p className="font-medium">{formatDateTime(health.lastHygieneRun)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(health.lastHygieneRun)}</p>
                  </div>
                )}
                {health.lastDeduplicationRun && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('lastDeduplicationRun')}</p>
                    <p className="font-medium">{formatDateTime(health.lastDeduplicationRun)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(health.lastDeduplicationRun)}</p>
                  </div>
                )}
                {health.timestamp && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dataTimestamp')}</p>
                    <p className="font-medium">{formatDateTime(health.timestamp)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Section (if different from health) */}
      {!loading && stats && !statsError && (
        stats.nodes !== undefined || stats.edges !== undefined || stats.categories !== undefined
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('additionalStats')}</CardTitle>
            <CardDescription>{t('fromStatsEndpoint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.nodes !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  <Database className="h-4 w-4 mr-2" />
                  {stats.nodes.toLocaleString()} {t('nodes')}
                </Badge>
              )}
              {stats.edges !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  <GitBranch className="h-4 w-4 mr-2" />
                  {stats.edges.toLocaleString()} {t('edges')}
                </Badge>
              )}
              {stats.categories !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.categories.toLocaleString()} {t('categories')}
                </Badge>
              )}
              {stats.brands !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.brands.toLocaleString()} {t('brands')}
                </Badge>
              )}
              {stats.products !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.products.toLocaleString()} {t('products')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {statsError && !loading && (
        <Card className="border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">{t('statsEndpointUnavailable')}</p>
                <p className="text-sm text-muted-foreground">{statsError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
