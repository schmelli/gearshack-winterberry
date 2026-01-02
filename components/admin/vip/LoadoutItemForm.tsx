/**
 * Loadout Item Form Component (SIMPLIFIED - Feature 052)
 *
 * Simplified form for updating quantity of items in VIP loadouts.
 * Full catalog integration pending (next task: Create admin catalog search component).
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoadoutItemsAdmin, type LoadoutItem } from '@/hooks/admin/vip';
import { toast } from 'sonner';

// =============================================================================
// Validation Schema
// =============================================================================

const itemFormSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

// =============================================================================
// Component
// =============================================================================

interface LoadoutItemFormProps {
  loadoutId: string;
  item?: LoadoutItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LoadoutItemForm({
  loadoutId,
  item,
  onSuccess,
  onCancel,
}: LoadoutItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateItem } = useLoadoutItemsAdmin(loadoutId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      quantity: item?.quantity || 1,
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    if (!item) {
      toast.error('Cannot add items yet - catalog search integration pending');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateItem(item.id, data.quantity);
      toast.success('Item quantity updated');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if trying to add new item (not edit)
  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add VIP Item</CardTitle>
          <CardDescription>
            Catalog search integration pending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Catalog Search Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Adding VIP items requires catalog integration, which is the next feature to be implemented.
                For now, items must be added directly to the VIP user's gear inventory first, then added to loadouts.
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Item Quantity</CardTitle>
        <CardDescription>
          Editing: {item.name} {item.brand ? `(${item.brand})` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Display item details (read-only) */}
          <div className="space-y-2 p-4 bg-muted rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{item.name}</span>
            </div>
            {item.brand && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand:</span>
                <span>{item.brand}</span>
              </div>
            )}
            {item.weightGrams && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Weight:</span>
                <span>{item.weightGrams}g</span>
              </div>
            )}
          </div>

          {/* Quantity (editable) */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              {...register('quantity', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default LoadoutItemForm;
