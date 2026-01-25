/**
 * GearGraph Status Page
 *
 * Displays the health and stats of the GearGraph server.
 * Fetches data from geargraph.gearshack.app/health and /stats
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw,
  CheckCircle2,
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

// Use local API proxy to avoid CORS issues
const API_BASE_URL = '/api/geargraph';

interface HealthMetrics {
  totalNodes: number;
  totalRelationships: number;
  orphanCount: number;
  duplicatesDetected: number;
  mergesExecuted24h: number;
  deletions24h: number;
}

interface HealthResponse {
  status: 'ok' | 'healthy' | 'degraded' | 'error';
  statusReasons?: string[];
  memgraphConnected?: boolean;
  workflowsRunning?: number;
  pendingApprovals?: number;
  lastHygieneRun?: string;
  lastDeduplicationRun?: string;
  metrics?: HealthMetrics;
  timestamp?: string;
  version?: string;
  [key: string]: unknown;
}

interface StatsResponse {
  status?: string;
  statusReasons?: string[];
  memgraphConnected?: boolean;
  workflowsRunning?: number;
  pendingApprovals?: number;
  lastHygieneRun?: string;
  lastDeduplicationRun?: string;
  metrics?: HealthMetrics;
  timestamp?: string;
  nodes?: number;
  edges?: number;
  categories?: number;
  brands?: number;
  products?: number;
  [key: string]: unknown;
}

// Helper to format relative time
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'gestern';
  return `vor ${diffDays} Tagen`;
}

// Helper to format date/time
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GearGraphStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setHealthError(null);
    setStatsError(null);

    // Fetch health
    try {
      const healthRes = await fetch(`${API_BASE_URL}/health`, {
        cache: 'no-store',
      });
      if (!healthRes.ok) {
        throw new Error(`HTTP ${healthRes.status}: ${healthRes.statusText}`);
      }
      const healthData = await healthRes.json();
      if (isMountedRef.current) {
        setHealth(healthData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setHealthError(err instanceof Error ? err.message : 'Failed to fetch health');
        setHealth(null);
      }
    }

    // Fetch stats
    try {
      const statsRes = await fetch(`${API_BASE_URL}/stats`, {
        cache: 'no-store',
      });
      if (!statsRes.ok) {
        throw new Error(`HTTP ${statsRes.status}: ${statsRes.statusText}`);
      }
      const statsData = await statsRes.json();
      if (isMountedRef.current) {
        setStats(statsData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
        setStats(null);
      }
    }

    if (isMountedRef.current) {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  const getStatusBadge = () => {
    if (loading) return <Badge variant="secondary">Laden...</Badge>;
    if (healthError) return <Badge variant="destructive">Offline</Badge>;
    if (health?.status === 'ok' || health?.status === 'healthy') {
      return <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>;
    }
    if (health?.status === 'degraded') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Eingeschränkt</Badge>;
    }
    if (health?.status === 'error') {
      return <Badge variant="destructive">Fehler</Badge>;
    }
    return <Badge variant="secondary">Unbekannt</Badge>;
  };

  const _getStatusIcon = () => {
    if (loading) return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    if (healthError) return <XCircle className="h-5 w-5 text-destructive" />;
    if (health?.status === 'ok' || health?.status === 'healthy') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (health?.status === 'degraded') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  // Metric card component
  const MetricCard = ({
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
  }) => {
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
          {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
        </div>
        {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GearGraph Status</h1>
          <p className="text-muted-foreground">
            Server: geargraph.gearshack.app
          </p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-muted-foreground">
          Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')}
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
                <p className="font-medium text-destructive">Verbindungsfehler</p>
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
                  <CardTitle className="text-base">Warnungen</CardTitle>
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
              label="Memgraph"
              value={health.memgraphConnected ? 'Verbunden' : 'Getrennt'}
              variant={health.memgraphConnected ? 'success' : 'warning'}
            />
            <MetricCard
              icon={Workflow}
              label="Laufende Workflows"
              value={health.workflowsRunning ?? 0}
              variant={health.workflowsRunning && health.workflowsRunning > 0 ? 'default' : 'muted'}
            />
            <MetricCard
              icon={Users}
              label="Ausstehende Genehmigungen"
              value={health.pendingApprovals ?? 0}
              variant={health.pendingApprovals && health.pendingApprovals > 100 ? 'warning' : 'default'}
            />
            <MetricCard
              icon={Clock}
              label="Letzter Hygiene-Lauf"
              value={health.lastHygieneRun ? formatRelativeTime(health.lastHygieneRun) : '–'}
              subtext={health.lastHygieneRun ? formatDateTime(health.lastHygieneRun) : undefined}
            />
          </div>

          {/* Graph Metrics */}
          {health.metrics && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Graph-Metriken</CardTitle>
                </div>
                <CardDescription>
                  Statistiken der Knowledge-Graph-Datenbank
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <MetricCard
                    icon={Database}
                    label="Knoten gesamt"
                    value={health.metrics.totalNodes}
                  />
                  <MetricCard
                    icon={GitBranch}
                    label="Beziehungen"
                    value={health.metrics.totalRelationships}
                  />
                  <MetricCard
                    icon={AlertCircle}
                    label="Verwaiste Knoten"
                    value={health.metrics.orphanCount}
                    variant={health.metrics.orphanCount > 100 ? 'warning' : 'default'}
                  />
                  <MetricCard
                    icon={Copy}
                    label="Duplikate erkannt"
                    value={health.metrics.duplicatesDetected}
                    variant={health.metrics.duplicatesDetected > 0 ? 'warning' : 'success'}
                  />
                  <MetricCard
                    icon={GitMerge}
                    label="Merges (24h)"
                    value={health.metrics.mergesExecuted24h}
                  />
                  <MetricCard
                    icon={Trash2}
                    label="Löschungen (24h)"
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
                <CardTitle>Zeitstempel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {health.lastHygieneRun && (
                  <div>
                    <p className="text-sm text-muted-foreground">Letzter Hygiene-Lauf</p>
                    <p className="font-medium">{formatDateTime(health.lastHygieneRun)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(health.lastHygieneRun)}</p>
                  </div>
                )}
                {health.lastDeduplicationRun && (
                  <div>
                    <p className="text-sm text-muted-foreground">Letzter Deduplizierungs-Lauf</p>
                    <p className="font-medium">{formatDateTime(health.lastDeduplicationRun)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(health.lastDeduplicationRun)}</p>
                  </div>
                )}
                {health.timestamp && (
                  <div>
                    <p className="text-sm text-muted-foreground">Daten-Zeitstempel</p>
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
            <CardTitle>Zusätzliche Statistiken</CardTitle>
            <CardDescription>Aus dem /stats Endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.nodes !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  <Database className="h-4 w-4 mr-2" />
                  {stats.nodes.toLocaleString('de-DE')} Knoten
                </Badge>
              )}
              {stats.edges !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  <GitBranch className="h-4 w-4 mr-2" />
                  {stats.edges.toLocaleString('de-DE')} Kanten
                </Badge>
              )}
              {stats.categories !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.categories.toLocaleString('de-DE')} Kategorien
                </Badge>
              )}
              {stats.brands !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.brands.toLocaleString('de-DE')} Marken
                </Badge>
              )}
              {stats.products !== undefined && (
                <Badge variant="outline" className="text-base py-1 px-3">
                  {stats.products.toLocaleString('de-DE')} Produkte
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
                <p className="font-medium">Stats-Endpoint nicht erreichbar</p>
                <p className="text-sm text-muted-foreground">{statsError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
