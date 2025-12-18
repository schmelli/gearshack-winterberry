/**
 * CategoryEditDialog Component
 *
 * Feature: Admin Panel with Category Management
 * Dialog form for creating and editing categories
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category } from '@/types/category';

// =============================================================================
// Types
// =============================================================================

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSave: (data: {
    label: string;
    slug: string;
    i18n: { en?: string; de?: string };
  }) => Promise<void>;
  isLoading: boolean;
}

interface FormData {
  label: string;
  slug: string;
  enLabel: string;
  deLabel: string;
}

// =============================================================================
// Component
// =============================================================================

export function CategoryEditDialog({
  open,
  onOpenChange,
  category,
  onSave,
  isLoading,
}: CategoryEditDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      label: '',
      slug: '',
      enLabel: '',
      deLabel: '',
    },
  });

  const labelValue = watch('label');

  // Auto-generate slug from label
  useEffect(() => {
    if (labelValue && !category) {
      const autoSlug = labelValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', autoSlug);
    }
  }, [labelValue, category, setValue]);

  // Load category data when dialog opens
  useEffect(() => {
    if (open && category) {
      reset({
        label: category.label,
        slug: category.slug,
        enLabel: category.i18n.en || '',
        deLabel: category.i18n.de || '',
      });
    } else if (open && !category) {
      reset({
        label: '',
        slug: '',
        enLabel: '',
        deLabel: '',
      });
    }
  }, [open, category, reset]);

  const onSubmit = async (data: FormData) => {
    await onSave({
      label: data.label,
      slug: data.slug,
      i18n: {
        en: data.enLabel || undefined,
        de: data.deLabel || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Update category information and translations'
              : 'Add a new category with English and German translations'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Legacy Label */}
          <div className="space-y-2">
            <Label htmlFor="label">
              Label (Legacy)
              <span className="ml-1 text-xs text-muted-foreground">
                Auto-generates slug
              </span>
            </Label>
            <Input
              id="label"
              {...register('label', { required: true })}
              placeholder="e.g., Backpacks"
              disabled={isLoading}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug (Unique ID)
            </Label>
            <Input
              id="slug"
              {...register('slug', { required: true })}
              placeholder="e.g., backpacks"
              disabled={isLoading}
            />
          </div>

          {/* English Label */}
          <div className="space-y-2">
            <Label htmlFor="enLabel">
              English Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="enLabel"
              {...register('enLabel', { required: true })}
              placeholder="e.g., Backpacks"
              disabled={isLoading}
            />
          </div>

          {/* German Label */}
          <div className="space-y-2">
            <Label htmlFor="deLabel">
              German Label
            </Label>
            <Input
              id="deLabel"
              {...register('deLabel')}
              placeholder="e.g., Rucksäcke"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
