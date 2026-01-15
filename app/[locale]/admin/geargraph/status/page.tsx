/**
 * GearGraph Status Page
 *
 * Displays the health and stats of the GearGraph server.
 * Fetches data from geargraph.gearshack.app/health and /stats
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// Use local API proxy to avoid CORS issues
const API_BASE_URL = '/api/geargraph';

interface HealthResponse {
  status: string;
  timestamp?: string;
  version?: string;
  [key: string]: unknown;
}

interface StatsResponse {
  nodes?: number;
  edges?: number;
  categories?: number;
  brands?: number;
  products?: number;
  [key: string]: unknown;
}

export default function GearGraphStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
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
      setHealth(healthData);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to fetch health');
      setHealth(null);
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
      setStats(statsData);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setStats(null);
    }

    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = () => {
    if (loading) return <Badge variant="secondary">Loading...</Badge>;
    if (healthError) return <Badge variant="destructive">Offline</Badge>;
    if (health?.status === 'ok' || health?.status === 'healthy') {
      return <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getStatusIcon = () => {
    if (loading) return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    if (healthError) return <XCircle className="h-5 w-5 text-destructive" />;
    if (health?.status === 'ok' || health?.status === 'healthy') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
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
            Refresh
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Health Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle>Health Check</CardTitle>
            </div>
            <CardDescription>
              Response from /health endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : healthError ? (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Error</p>
                <p className="text-sm">{healthError}</p>
              </div>
            ) : health ? (
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {JSON.stringify(health, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>
              Response from /stats endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : statsError ? (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Error</p>
                <p className="text-sm">{statsError}</p>
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Show key stats as badges if they exist */}
                {(stats.nodes !== undefined || stats.edges !== undefined) && (
                  <div className="flex flex-wrap gap-2">
                    {stats.nodes !== undefined && (
                      <Badge variant="outline" className="text-base">
                        {stats.nodes.toLocaleString()} Nodes
                      </Badge>
                    )}
                    {stats.edges !== undefined && (
                      <Badge variant="outline" className="text-base">
                        {stats.edges.toLocaleString()} Edges
                      </Badge>
                    )}
                    {stats.categories !== undefined && (
                      <Badge variant="outline" className="text-base">
                        {stats.categories.toLocaleString()} Categories
                      </Badge>
                    )}
                    {stats.brands !== undefined && (
                      <Badge variant="outline" className="text-base">
                        {stats.brands.toLocaleString()} Brands
                      </Badge>
                    )}
                    {stats.products !== undefined && (
                      <Badge variant="outline" className="text-base">
                        {stats.products.toLocaleString()} Products
                      </Badge>
                    )}
                  </div>
                )}
                {/* Full JSON response */}
                <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
