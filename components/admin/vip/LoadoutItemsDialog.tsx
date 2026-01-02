/**
 * Loadout Items Dialog Component
 *
 * Dialog for managing individual items within a VIP loadout.
 * Provides add, edit, delete, and reorder functionality.
 */

'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
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
import { useLoadoutItemsAdmin, type VipLoadoutSummary, type LoadoutItem } from '@/hooks/admin/vip';
import { LoadoutItemForm } from './LoadoutItemForm';
import { CatalogSearchModal } from './CatalogSearchModal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { CatalogProductResult } from '@/types/smart-search';
import type { Database } from '@/types/database';

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
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const [editingItem, setEditingItem] = useState<LoadoutItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const { items, status, addItem, deleteItem, refetch } = useLoadoutItemsAdmin(loadout.id);
  const supabase = createClient();

  // Handle catalog item selection
  const handleCatalogSelect = async (catalogItem: CatalogProductResult) => {
    setIsAddingItem(true);
    try {
      // 1. Create gear_item in VIP user's inventory
      const insertData: Database['public']['Tables']['gear_items']['Insert'] = {
        user_id: loadout.userId,
        name: catalogItem.name,
        brand: catalogItem.brand?.name || null,
        weight_grams: catalogItem.weightGrams,
        product_type_id: null, // Category mapping would require additional logic
        status: 'own', // VIP items are owned
        source_attribution: {
          type: 'catalog',
          catalog_product_id: catalogItem.id,
        },
      };

      const { data: gearItem, error: createError } = await supabase
        .from('gear_items')
        .insert(insertData)
        .select('id')
        .single();

      if (createError) throw createError;
      if (!gearItem) throw new Error('Failed to create gear item');

      // 2. Add gear_item to loadout
      await addItem(gearItem.id, 1);

      toast.success(`Added ${catalogItem.name} to loadout`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      toast.error(message);
      console.error('Error adding catalog item:', err);
    } finally {
      setIsAddingItem(false);
    }
  };

  // Handle delete
  const handleDelete = async (item: LoadoutItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
      await deleteItem(item.id);
      toast.success('Item deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Format weight
  const formatWeight = (grams: number | null, quantity: number) => {
    if (!grams) return '—';
    const total = grams * quantity;
    if (total >= 1000) {
      return `${(total / 1000).toFixed(2)} kg`;
    }
    return `${total} g`;
  };

  // Calculate total weight (items with weight only)
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.weightGrams || 0) * item.quantity;
  }, 0);

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
          <Button onClick={() => setShowCatalogSearch(true)} size="sm" disabled={isAddingItem}>
            <Plus className="h-4 w-4 mr-2" />
            {isAddingItem ? 'Adding...' : 'Add Item from Catalog'}
          </Button>

          {/* Items Table by Category */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items yet. Add the first item to this loadout.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.brand || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.weightGrams ? `${item.weightGrams} g` : '—'}
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
          )}

          {/* Catalog Search Modal */}
          <CatalogSearchModal
            open={showCatalogSearch}
            onOpenChange={setShowCatalogSearch}
            onSelect={handleCatalogSelect}
          />

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
