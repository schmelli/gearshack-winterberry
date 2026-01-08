/**
 * VIP Loadouts Panel Component
 *
 * Admin panel for managing VIP loadouts with full CRUD operations.
 * Displayed as a tab in the VIP admin dashboard.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, FileText, Trash2, Edit, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVipLoadoutsAdmin, type VipLoadoutSummary } from '@/hooks/admin/vip';
import { LoadoutFormDialog } from './LoadoutFormDialog';
import { LoadoutItemsDialog } from './LoadoutItemsDialog';
import { toast } from 'sonner';

// =============================================================================
// Component
// =============================================================================

interface VipLoadoutsPanelProps {
  vipId: string; // VIP account ID (from vip_accounts table)
  vipName: string;
  claimedByUserId: string | null; // User ID for loadouts (from profiles table)
}

export function VipLoadoutsPanel({ vipId, vipName, claimedByUserId }: VipLoadoutsPanelProps) {
  const t = useTranslations('vip.admin');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLoadout, setEditingLoadout] = useState<VipLoadoutSummary | null>(null);
  const [managingLoadout, setManagingLoadout] = useState<VipLoadoutSummary | null>(null);

  // Use claimedByUserId if available, otherwise undefined (hook will handle)
  const {
    loadouts,
    status,
    error,
    refetch,
    deleteLoadout,
    publishLoadout,
    unpublishLoadout,
  } = useVipLoadoutsAdmin(claimedByUserId ?? undefined);

  // Handle delete
  const handleDelete = async (loadout: VipLoadoutSummary) => {
    if (!confirm(t('confirmDeleteLoadoutFull', { name: loadout.name, count: loadout.itemCount }))) {
      return;
    }

    try {
      await deleteLoadout(loadout.id);
      toast.success(t('loadoutDeletedSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deleteFailedError'));
    }
  };

  // Handle publish toggle
  const handleTogglePublish = async (loadout: VipLoadoutSummary) => {
    try {
      if (loadout.isVipLoadout) {
        await unpublishLoadout(loadout.id);
        toast.success(t('loadoutUnpublishedSuccess'));
      } else {
        if (loadout.itemCount === 0) {
          toast.error(t('cannotPublishEmptyError'));
          return;
        }
        await publishLoadout(loadout.id);
        toast.success(t('loadoutPublishedSuccess'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateFailedError'));
    }
  };

  // Format weight for display
  const formatWeight = (grams: number) => {
    const kg = grams / 1000;
    if (kg >= 1) {
      return `${kg.toFixed(2)} kg`;
    }
    return `${grams} g`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('loadoutsForVip', { name: vipName })}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('loadoutsDescription')}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={!claimedByUserId}
          title={!claimedByUserId ? t('vipMustBeClaimedFirst') : undefined}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('createLoadout')}
        </Button>
      </div>

      {/* Unclaimed VIP Warning */}
      {!claimedByUserId && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('vipNotClaimedWarning')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {status === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <Card className="border-destructive/50">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {status === 'success' && loadouts.length === 0 && claimedByUserId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noLoadoutsYet')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('createFirstLoadout')}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createLoadout')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loadouts Table */}
      {status === 'success' && loadouts.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tableHeaders.name')}</TableHead>
                <TableHead>{t('tableHeaders.status')}</TableHead>
                <TableHead>{t('tableHeaders.items')}</TableHead>
                <TableHead>{t('tableHeaders.totalWeight')}</TableHead>
                <TableHead>{t('tableHeaders.tripType')}</TableHead>
                <TableHead>{t('tableHeaders.source')}</TableHead>
                <TableHead className="text-right">{t('tableHeaders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadouts.map((loadout) => (
                <TableRow key={loadout.id}>
                  <TableCell className="font-medium">{loadout.name}</TableCell>
                  <TableCell>
                    <Badge variant={loadout.isVipLoadout ? 'default' : 'secondary'}>
                      {loadout.isVipLoadout ? t('statusPublished') : t('statusDraft')}
                    </Badge>
                  </TableCell>
                  <TableCell>{t('itemsCount', { count: loadout.itemCount })}</TableCell>
                  <TableCell>{formatWeight(loadout.totalWeightGrams)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {loadout.activityTypes?.join(', ') || loadout.seasons?.join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    {loadout.sourceAttribution?.url ? (
                      <a
                        href={loadout.sourceAttribution.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {t('viewSource')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagingLoadout(loadout)}
                        title={t('manageItems')}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLoadout(loadout)}
                        title={t('editLoadout')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(loadout)}
                        title={loadout.isVipLoadout ? t('unpublishLoadout') : t('publishLoadout')}
                      >
                        {loadout.isVipLoadout ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(loadout)}
                        title={t('deleteLoadout')}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog - only show if VIP has claimed their account */}
      {claimedByUserId && (
        <LoadoutFormDialog
          userId={claimedByUserId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}

      {/* Edit Dialog */}
      {editingLoadout && claimedByUserId && (
        <LoadoutFormDialog
          userId={claimedByUserId}
          loadout={editingLoadout}
          open={true}
          onOpenChange={(open) => !open && setEditingLoadout(null)}
          onSuccess={() => {
            setEditingLoadout(null);
            refetch();
          }}
        />
      )}

      {/* Items Management Dialog */}
      {managingLoadout && (
        <LoadoutItemsDialog
          loadout={managingLoadout}
          open={true}
          onOpenChange={(open) => !open && setManagingLoadout(null)}
        />
      )}
    </div>
  );
}

export default VipLoadoutsPanel;
