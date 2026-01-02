/**
 * Loadout Items Dialog Component
 *
 * Dialog for managing individual items within a VIP loadout.
 * Provides add, edit, delete, and reorder functionality.
 */

'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLoadoutItemsAdmin, type VipLoadoutSummary } from '@/hooks/admin/vip';
import { LoadoutItemForm } from './LoadoutItemForm';
import { toast } from 'sonner';
import type { VipLoadoutItem } from '@/types/vip';

// =============================================================================
// Component
// =============================================================================

interface LoadoutItemsDialogProps {
  loadout: VipLoadoutSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadoutItemsDialog({
  loadout,
  open,
  onOpenChange,
}: LoadoutItemsDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VipLoadoutItem | null>(null);

  const { items, status, deleteItem, refetch } = useLoadoutItemsAdmin(loadout.id);

  // Handle delete
  const handleDelete = async (item: VipLoadoutItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
      await deleteItem(item.id);
      toast.success('Item deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Format weight
  const formatWeight = (grams: number, quantity: number) => {
    const total = grams * quantity;
    if (total >= 1000) {
      return `${(total / 1000).toFixed(2)} kg`;
    }
    return `${total} g`;
  };

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, VipLoadoutItem[]>);

  const totalWeight = items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loadout.name} - Items</DialogTitle>
          <DialogDescription>
            Manage the gear items in this loadout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">{items.length} items</Badge>
            <Badge variant="outline">
              Total: {formatWeight(totalWeight, 1)}
            </Badge>
          </div>

          {/* Add Button */}
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          {/* Items Table by Category */}
          {Object.keys(itemsByCategory).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items yet. Add the first item to this loadout.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-2 uppercase text-muted-foreground">
                    {category}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.brand || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.weightGrams} g
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatWeight(item.weightGrams, item.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item)}
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
                </div>
              ))}
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <LoadoutItemForm
              loadoutId={loadout.id}
              onSuccess={() => {
                setShowAddForm(false);
                refetch();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Edit Form */}
          {editingItem && (
            <LoadoutItemForm
              loadoutId={loadout.id}
              item={editingItem}
              onSuccess={() => {
                setEditingItem(null);
                refetch();
              }}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LoadoutItemsDialog;
