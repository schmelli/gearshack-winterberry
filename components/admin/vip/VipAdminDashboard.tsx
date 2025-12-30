'use client';

/**
 * VIP Admin Dashboard Component
 *
 * Feature: 052-vip-loadouts
 * Task: T034
 *
 * Main admin dashboard for VIP management with list and actions.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Users, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VipAdminList } from './VipAdminList';
import { VipFormDialog } from './VipFormDialog';
import { useAdminVips } from '@/hooks/vip/useAdminVips';

// =============================================================================
// Component
// =============================================================================

export function VipAdminDashboard() {
  const t = useTranslations('vip.admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    vips,
    status,
    error,
    refetch,
  } = useAdminVips();

  // Filter VIPs by search
  const filteredVips = vips.filter((vip) =>
    vip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vip.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate by status
  const activeVips = filteredVips.filter((v) => !v.archivedAt);
  const archivedVips = filteredVips.filter((v) => v.archivedAt);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addNewVip')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search VIPs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {status === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Failed to load VIPs</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* VIP Lists */}
      {status === 'success' && (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeVips.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({archivedVips.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <VipAdminList vips={activeVips} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="archived">
            <VipAdminList vips={archivedVips} onUpdate={refetch} isArchived />
          </TabsContent>
        </Tabs>
      )}

      {/* Create Dialog */}
      <VipFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
    </div>
  );
}

export default VipAdminDashboard;
