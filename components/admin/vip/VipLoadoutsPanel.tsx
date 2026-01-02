/**
 * VIP Loadouts Panel Component
 *
 * Admin panel for managing VIP loadouts with full CRUD operations.
 * Displayed as a tab in the VIP admin dashboard.
 */

'use client';

import { useState } from 'react';
import { Plus, FileText, Trash2, Edit, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVipLoadoutsAdmin } from '@/hooks/admin/vip';
import { LoadoutFormDialog } from './LoadoutFormDialog';
import { LoadoutItemsDialog } from './LoadoutItemsDialog';
import { toast } from 'sonner';
import type { VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Component
// =============================================================================

interface VipLoadoutsPanelProps {
  vipId: string;
  vipName: string;
}

export function VipLoadoutsPanel({ vipId, vipName }: VipLoadoutsPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLoadout, setEditingLoadout] = useState<VipLoadoutSummary | null>(null);
  const [managingLoadout, setManagingLoadout] = useState<VipLoadoutSummary | null>(null);

  const {
    loadouts,
    status,
    error,
    refetch,
    deleteLoadout,
    publishLoadout,
    unpublishLoadout,
  } = useVipLoadoutsAdmin(vipId);

  // Handle delete
  const handleDelete = async (loadout: VipLoadoutSummary) => {
    if (!confirm(`Delete "${loadout.name}"? This will remove all ${loadout.itemCount} items.`)) {
      return;
    }

    try {
      await deleteLoadout(loadout.id);
      toast.success('Loadout deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Handle publish toggle
  const handleTogglePublish = async (loadout: VipLoadoutSummary) => {
    try {
      if (loadout.status === 'published') {
        await unpublishLoadout(loadout.id);
        toast.success('Loadout unpublished');
      } else {
        if (loadout.itemCount === 0) {
          toast.error('Cannot publish loadout with no items');
          return;
        }
        await publishLoadout(loadout.id);
        toast.success('Loadout published');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
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
          <h2 className="text-2xl font-bold">Loadouts for {vipName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage gear lists sourced from videos and blog posts
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Loadout
        </Button>
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
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {status === 'success' && loadouts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No loadouts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create the first loadout for this VIP
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Loadout
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
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Weight</TableHead>
                <TableHead>Trip Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadouts.map((loadout) => (
                <TableRow key={loadout.id}>
                  <TableCell className="font-medium">{loadout.name}</TableCell>
                  <TableCell>
                    <Badge variant={loadout.status === 'published' ? 'default' : 'secondary'}>
                      {loadout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{loadout.itemCount} items</TableCell>
                  <TableCell>{formatWeight(loadout.totalWeightGrams)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {loadout.tripType || '—'}
                  </TableCell>
                  <TableCell>
                    <a
                      href={loadout.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagingLoadout(loadout)}
                        title="Manage items"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLoadout(loadout)}
                        title="Edit loadout"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(loadout)}
                        title={loadout.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {loadout.status === 'published' ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(loadout)}
                        title="Delete loadout"
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

      {/* Create Dialog */}
      <LoadoutFormDialog
        vipId={vipId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {/* Edit Dialog */}
      {editingLoadout && (
        <LoadoutFormDialog
          vipId={vipId}
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
