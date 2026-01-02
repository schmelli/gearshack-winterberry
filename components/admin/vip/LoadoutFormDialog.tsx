/**
 * Loadout Form Dialog Component
 *
 * Dialog for creating or editing a VIP loadout with form validation.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useVipLoadoutsAdmin, type VipLoadoutSummary } from '@/hooks/admin/vip';
import { toast } from 'sonner';

// =============================================================================
// Validation Schema
// =============================================================================

const loadoutFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  sourceUrl: z.string().url('Must be a valid URL').optional(),
  description: z.string().optional(),
});

type LoadoutFormData = z.infer<typeof loadoutFormSchema>;

// =============================================================================
// Component
// =============================================================================

interface LoadoutFormDialogProps {
  vipId: string;
  loadout?: VipLoadoutSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LoadoutFormDialog({
  vipId,
  loadout,
  open,
  onOpenChange,
  onSuccess,
}: LoadoutFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createLoadout, updateLoadout } = useVipLoadoutsAdmin();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoadoutFormData>({
    resolver: zodResolver(loadoutFormSchema),
    defaultValues: loadout
      ? {
          name: loadout.name,
          sourceUrl: loadout.sourceAttribution?.url || '',
          description: loadout.description || '',
        }
      : undefined,
  });

  const onSubmit = async (data: LoadoutFormData) => {
    setIsSubmitting(true);

    try {
      if (loadout) {
        // Update existing loadout
        await updateLoadout(loadout.id, data);
        toast.success('Loadout updated');
      } else {
        // Create new loadout
        await createLoadout(vipId, data);
        toast.success('Loadout created');
      }
      reset();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save loadout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{loadout ? 'Edit Loadout' : 'Create Loadout'}</DialogTitle>
          <DialogDescription>
            {loadout
              ? 'Update the loadout details below'
              : 'Add a new gear list for this VIP from a video or blog post'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Pacific Crest Trail 2023"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              {...register('sourceUrl')}
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              disabled={isSubmitting}
            />
            {errors.sourceUrl && (
              <p className="text-sm text-destructive">{errors.sourceUrl.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              YouTube video, blog post, or other source link
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional notes about this loadout..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loadout ? 'Save Changes' : 'Create Loadout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LoadoutFormDialog;
