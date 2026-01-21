/**
 * Admin Contributions Dashboard Page
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Displays contribution statistics, missing brands management,
 * and data quality insights for administrators.
 */

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useContributionsDashboard } from '@/hooks/admin/useContributionsDashboard';
import { ContributionsOverview } from '@/components/admin/contributions/ContributionsOverview';
import { MissingBrandsTable } from '@/components/admin/contributions/MissingBrandsTable';
import { RefreshCw } from 'lucide-react';

export default function AdminContributionsPage() {
  const {
    stats,
    isLoadingStats,
    statsError,
    refreshStats,
    missingBrands,
    missingBrandsTotal,
    missingBrandsPage,
    missingBrandsTotalPages,
    isLoadingMissingBrands,
    missingBrandsError,
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    goToPage,
    updateBrandStatus,
    isUpdatingStatus,
  } = useContributionsDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contributions Dashboard</h1>
          <p className="text-muted-foreground">
            Track user contributions and manage missing brands
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStats}
          disabled={isLoadingStats}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="missing-brands">
            Missing Brands
            {stats && stats.missingBrandsCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {stats.missingBrandsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ContributionsOverview
            stats={stats}
            isLoading={isLoadingStats}
            error={statsError}
          />
        </TabsContent>

        <TabsContent value="missing-brands" className="space-y-4">
          <MissingBrandsTable
            brands={missingBrands}
            total={missingBrandsTotal}
            page={missingBrandsPage}
            totalPages={missingBrandsTotalPages}
            isLoading={isLoadingMissingBrands}
            error={missingBrandsError}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchQuery}
            onPageChange={goToPage}
            onUpdateStatus={updateBrandStatus}
            isUpdatingStatus={isUpdatingStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
