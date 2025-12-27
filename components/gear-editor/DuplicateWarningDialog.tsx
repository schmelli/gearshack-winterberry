/**
 * DuplicateWarningDialog Component (Stateless)
 *
 * Feature: XXX-duplicate-detection
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Shows a side-by-side comparison of the new item vs an existing item
 * that appears to be a duplicate. Offers three actions:
 * - Cancel: Stay on form to edit
 * - +1 to Existing: Increment quantity on existing item
 * - Save as New: Create new item despite duplicate
 */

'use client';

import Image from 'next/image';
import { AlertTriangle, Plus, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type { DuplicateMatch } from '@/lib/duplicate-detection';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface DuplicateWarningDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The best matching duplicate */
  bestMatch: DuplicateMatch | null;
  /** The new item form data */
  newItem: GearItemFormData | null;
  /** Whether the increase quantity operation is in progress */
  isIncreasingQuantity: boolean;
  /** Save anyway despite duplicate */
  onConfirmSave: () => void;
  /** Cancel and return to form */
  onCancel: () => void;
  /** Increase quantity on existing item */
  onIncreaseQuantity: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

interface ItemCardProps {
  label: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: number;
  isNew?: boolean;
}

function ItemCard({ label, name, brand, imageUrl, quantity, isNew }: ItemCardProps) {
  return (
    <Card className={isNew ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {label}
        </div>

        {/* Image */}
        <div className="aspect-square w-full bg-muted rounded-md mb-3 overflow-hidden relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="150px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1">
          <div className="font-medium text-sm line-clamp-2" title={name}>
            {name}
          </div>
          {brand && (
            <div className="text-xs text-muted-foreground truncate">{brand}</div>
          )}
          <div className="text-xs text-muted-foreground">
            Qty: {quantity}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DuplicateWarningDialog({
  isOpen,
  bestMatch,
  newItem,
  isIncreasingQuantity,
  onConfirmSave,
  onCancel,
  onIncreaseQuantity,
}: DuplicateWarningDialogProps) {
  const t = useTranslations('GearEditor.duplicateWarning');

  // Don't render if no match or new item
  if (!bestMatch || !newItem) {
    return null;
  }

  const existingItem = bestMatch.existingItem;
  const matchPercentage = Math.round(bestMatch.score * 100);
  const existingQuantity = existingItem.quantity || 1;
  const newQuantity = parseInt(newItem.quantity, 10) || 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-3">
          <ItemCard
            label={t('newItem')}
            name={newItem.name}
            brand={newItem.brand || null}
            imageUrl={newItem.primaryImageUrl || null}
            quantity={newQuantity}
            isNew
          />
          <ItemCard
            label={t('existingItem')}
            name={existingItem.name}
            brand={existingItem.brand}
            imageUrl={existingItem.primaryImageUrl}
            quantity={existingQuantity}
          />
        </div>

        {/* Match info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={bestMatch.confidence === 'high' ? 'destructive' : 'secondary'}
          >
            {t('matchScore', { score: matchPercentage })}
          </Badge>
          {bestMatch.matchReasons.map((reason, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isIncreasingQuantity}
            className="sm:mr-auto"
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onIncreaseQuantity}
            disabled={isIncreasingQuantity}
            className="gap-1 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            {t('actions.increaseQuantity')}
          </Button>
          <Button
            type="button"
            onClick={onConfirmSave}
            disabled={isIncreasingQuantity}
            className="gap-1 whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            {t('actions.saveAsNew')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
