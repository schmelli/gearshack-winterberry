/**
 * ContributionsOverview Component
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Displays aggregated contribution statistics in card format.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContributionStats } from '@/types/contributions';
import {
  Users,
  Package,
  TrendingUp,
  Globe,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ContributionsOverviewProps {
  stats: ContributionStats | null;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function ContributionsOverview({
  stats,
  isLoading,
  error,
}: ContributionsOverviewProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Failed to load statistics</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Contributions',
      value: stats.totalContributions.toLocaleString(),
      description: `${stats.totalContributions7d} last 7 days`,
      icon: Package,
      color: 'text-blue-500',
    },
    {
      title: 'Unique Contributors',
      value: stats.uniqueContributors.toLocaleString(),
      description: 'Anonymous contributor hashes',
      icon: Users,
      color: 'text-purple-500',
    },
    {
      title: 'Match Rate',
      value: `${stats.matchRate}%`,
      description: `${stats.matchedCount} matched, ${stats.unmatchedCount} new`,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Missing Brands',
      value: stats.missingBrandsCount.toLocaleString(),
      description: 'Pending review',
      icon: AlertTriangle,
      color: 'text-amber-500',
    },
    {
      title: '30-Day Contributions',
      value: stats.totalContributions30d.toLocaleString(),
      description: 'Last 30 days',
      icon: TrendingUp,
      color: 'text-cyan-500',
    },
    {
      title: 'Top Country',
      value: stats.countryDistribution[0]?.countryCode || 'N/A',
      description: stats.countryDistribution[0]
        ? `${stats.countryDistribution[0].percentage}% of contributions`
        : 'No data yet',
      icon: Globe,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Country distribution */}
      {stats.countryDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Country Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.countryDistribution.map((country) => (
                <div
                  key={country.countryCode}
                  className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  <span className="font-medium">{country.countryCode}</span>
                  <span className="text-muted-foreground">
                    {country.count} ({country.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequently added fields */}
      {stats.frequentlyAddedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Frequently Added Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.frequentlyAddedFields.map((field) => (
                <div key={field.field} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{field.field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${field.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {field.count} ({field.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top missing brands */}
      {stats.topMissingBrands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Missing Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topMissingBrands.map((brand, index) => (
                <div
                  key={brand.brandName}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-medium">{brand.brandName}</span>
                      {brand.countriesSeen.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Seen in: {brand.countriesSeen.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {brand.count} occurrences
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
