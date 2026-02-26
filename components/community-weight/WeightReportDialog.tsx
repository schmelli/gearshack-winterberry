/**
 * WeightReportDialog Component
 * Feature: community-verified-weights
 *
 * Dialog for submitting or updating a community weight report.
 * Uses react-hook-form + Zod for validation.
 * Stateless — receives handlers via props.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  weightReportSchema,
  type WeightReportFormData,
} from '@/lib/validations/weight-report-schema';

// =============================================================================
// Types
// =============================================================================

interface WeightReportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when form is submitted */
  onSubmit: (weightGrams: number, context?: string) => Promise<void>;
  /** Whether a submission is in progress */
  isSubmitting: boolean;
  /** Existing report data for editing (if any) */
  existingReport?: {
    reportedWeightGrams: number;
    measurementContext: string | null;
  } | null;
  /** Manufacturer weight for reference */
  manufacturerWeightGrams?: number | null;
  /** Product name for context */
  productName?: string;
}

// =============================================================================
// Component
// =============================================================================

export function WeightReportDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  existingReport,
  manufacturerWeightGrams,
  productName,
}: WeightReportDialogProps) {
  const t = useTranslations('CommunityWeight');
  const isEditMode = !!existingReport;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WeightReportFormData>({
    resolver: zodResolver(weightReportSchema),
    defaultValues: {
      reportedWeightGrams: existingReport?.reportedWeightGrams?.toString() ?? '',
      measurementContext: existingReport?.measurementContext ?? '',
    },
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(
        Number(data.reportedWeightGrams),
        data.measurementContext || undefined
      );
      reset();
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('dialog.titleEdit') : t('dialog.titleNew')}
          </DialogTitle>
          <DialogDescription>
            {productName
              ? t('dialog.descriptionWithName', { name: productName })
              : t('dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Manufacturer reference */}
          {manufacturerWeightGrams && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t('dialog.manufacturerWeight')}
              </p>
              <p className="font-medium">{manufacturerWeightGrams.toLocaleString()} g</p>
            </div>
          )}

          {/* Weight input */}
          <div className="space-y-2">
            <Label htmlFor="reportedWeightGrams">
              {t('dialog.weightLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reportedWeightGrams"
                type="number"
                inputMode="numeric"
                min={1}
                max={99999}
                step={1}
                placeholder={t('dialog.weightPlaceholder')}
                disabled={isSubmitting}
                className="flex-1"
                {...register('reportedWeightGrams')}
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
            {errors.reportedWeightGrams && (
              <p className="text-sm text-destructive">
                {t(
                  (errors.reportedWeightGrams.message ?? 'errors.required') as
                    | 'errors.required'
                    | 'errors.mustBeInteger'
                    | 'errors.tooLight'
                    | 'errors.tooHeavy'
                )}
              </p>
            )}
          </div>

          {/* Measurement context */}
          <div className="space-y-2">
            <Label htmlFor="measurementContext">
              {t('dialog.contextLabel')}
            </Label>
            <Textarea
              id="measurementContext"
              placeholder={t('dialog.contextPlaceholder')}
              disabled={isSubmitting}
              rows={2}
              {...register('measurementContext')}
            />
            {errors.measurementContext && (
              <p className="text-sm text-destructive">
                {t(
                  (errors.measurementContext.message ?? 'errors.contextTooLong') as
                    | 'errors.contextTooLong'
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? t('dialog.update') : t('dialog.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
