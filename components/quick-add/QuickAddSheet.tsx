/**
 * QuickAddSheet Component
 *
 * Feature: 054-zero-friction-input
 *
 * Review sheet for low-confidence extractions.
 * Shows pre-filled fields that the user can edit before saving.
 * Uses Sheet (bottom) on mobile, Dialog on desktop.
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useQuickAddForm } from '@/hooks/useQuickAddForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProgressiveCategorySelect } from '@/components/gear-editor/ProgressiveCategorySelect';
import { Badge } from '@/components/ui/badge';
import type { QuickAddExtraction, QuickAddOverrides } from '@/types/quick-add';
import type { GearCondition } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface QuickAddSheetProps {
  extraction: QuickAddExtraction | null;
  onSave: (overrides: QuickAddOverrides) => void;
  onDismiss: () => void;
  isSaving: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function QuickAddSheet({
  extraction,
  onSave,
  onDismiss,
  isSaving,
}: QuickAddSheetProps) {
  const isOpen = extraction !== null;
  const t = useTranslations('QuickAdd');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { form, updateField, handleSave } = useQuickAddForm(extraction, onSave);

  // ── Confidence badge color ──────────────────────────────────────────────
  const confidence = extraction?.confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidence >= 0.6
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';

  // ── Form content (shared between Sheet and Dialog) ──────────────────────
  const formContent = (
    <div className="space-y-4 py-4">
      {/* Confidence Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={confidenceColor}>
          {t('confidence')}: {confidencePercent}%
        </Badge>
        {extraction?.categoryLabel && (
          <Badge variant="secondary" className="text-xs">
            {extraction.categoryLabel}
          </Badge>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="qa-name">{t('name')} *</Label>
        <Input
          id="qa-name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={t('name')}
          autoFocus
        />
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label htmlFor="qa-brand">{t('brand')}</Label>
        <Input
          id="qa-brand"
          value={form.brand}
          onChange={(e) => updateField('brand', e.target.value)}
          placeholder={t('brand')}
        />
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label htmlFor="qa-weight">{t('weight')}</Label>
        <div className="flex gap-2">
          <Input
            id="qa-weight"
            type="number"
            min="0"
            step="any"
            value={form.weightGrams}
            onChange={(e) => updateField('weightGrams', e.target.value)}
            placeholder="0"
            className="flex-1"
          />
          <Select
            value={form.weightUnit}
            onValueChange={(v) => updateField('weightUnit', v as 'g' | 'kg')}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="g">g</SelectItem>
              <SelectItem value="kg">kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <Label>{t('condition')}</Label>
        <Select
          value={form.condition}
          onValueChange={(v) => updateField('condition', v as GearCondition)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">{t('conditionNew')}</SelectItem>
            <SelectItem value="used">{t('conditionUsed')}</SelectItem>
            <SelectItem value="worn">{t('conditionWorn')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>{t('category')}</Label>
        <ProgressiveCategorySelect
          initialProductTypeId={form.productTypeId || undefined}
          onComplete={(id) => updateField('productTypeId', id)}
        />
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="qa-price">{t('price')}</Label>
        <div className="flex gap-2">
          <Input
            id="qa-price"
            type="number"
            min="0"
            step="0.01"
            value={form.pricePaid}
            onChange={(e) => updateField('pricePaid', e.target.value)}
            placeholder="0.00"
            className="flex-1"
          />
          <Select
            value={form.currency}
            onValueChange={(v) => updateField('currency', v)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="CHF">CHF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image preview */}
      {extraction?.primaryImageUrl && (
        <div className="space-y-2">
          <Label>{t('image')}</Label>
          <div className="relative h-32 w-32 overflow-hidden rounded-md border bg-muted">
            <Image
              src={extraction.primaryImageUrl}
              alt={extraction.name ?? ''}
              fill
              sizes="128px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={onDismiss} disabled={isSaving}>
        {t('cancel')}
      </Button>
      <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
        {isSaving ? t('saving') : t('save')}
      </Button>
    </div>
  );

  // ── Desktop: Dialog ─────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && onDismiss()}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('reviewTitle')}</DialogTitle>
            <DialogDescription>{t('reviewDescription')}</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Mobile: Sheet ───────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onDismiss()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('reviewTitle')}</SheetTitle>
          <SheetDescription>{t('reviewDescription')}</SheetDescription>
        </SheetHeader>
        {formContent}
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
