/**
 * Loadout Item Form Component
 *
 * Form for adding or editing individual items in a VIP loadout.
 * Uses react-hook-form with Zod validation.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoadoutItemsAdmin } from '@/hooks/admin/vip';
import { toast } from 'sonner';
import type { VipLoadoutItem } from '@/types/vip';

// =============================================================================
// Validation Schema
// =============================================================================

const itemFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  weightGrams: z.number().int().positive('Weight must be a positive number'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

// =============================================================================
// Component
// =============================================================================

interface LoadoutItemFormProps {
  loadoutId: string;
  item?: VipLoadoutItem;
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
  const { addItem, updateItem } = useLoadoutItemsAdmin(loadoutId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item
      ? {
          name: item.name,
          brand: item.brand || '',
          weightGrams: item.weightGrams,
          quantity: item.quantity,
          category: item.category,
          notes: item.notes || '',
        }
      : {
          quantity: 1,
        },
  });

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);

    try {
      if (item) {
        await updateItem(item.id, data);
        toast.success('Item updated');
      } else {
        await addItem(data);
        toast.success('Item added');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item ? 'Edit Item' : 'Add Item'}</CardTitle>
        <CardDescription>
          {item ? 'Update the item details' : 'Add a new gear item to this loadout'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Zpacks Duplex Tent"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                {...register('brand')}
                placeholder="e.g., Zpacks"
                disabled={isSubmitting}
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weightGrams">
                Weight (grams) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weightGrams"
                type="number"
                {...register('weightGrams', { valueAsNumber: true })}
                placeholder="e.g., 540"
                disabled={isSubmitting}
              />
              {errors.weightGrams && (
                <p className="text-sm text-destructive">{errors.weightGrams.message}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="1"
                disabled={isSubmitting}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="e.g., Shelter, Sleep System, Kitchen"
                disabled={isSubmitting}
              />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Optional notes about this item..."
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default LoadoutItemForm;
