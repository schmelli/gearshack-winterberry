/**
 * VisionScanResults Component
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Displays detected gear items with catalog match info.
 * Allows selection/deselection before importing to inventory.
 * Stateless - receives all data via props.
 */

'use client';

import { Check, X, Star, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CatalogMatchResult } from '@/types/vision-scan';

// =============================================================================
// Types
// =============================================================================

interface VisionScanResultsProps {
  results: CatalogMatchResult[];
  selectedIndices: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getConfidenceBadge(
  confidence: number
): { variant: 'default' | 'secondary' | 'outline' } {
  if (confidence >= 0.8) {
    return { variant: 'default' };
  }
  if (confidence >= 0.5) {
    return { variant: 'secondary' };
  }
  return { variant: 'outline' };
}

// =============================================================================
// Component
// =============================================================================

export function VisionScanResults({
  results,
  selectedIndices,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
}: VisionScanResultsProps) {
  const t = useTranslations('VisionScan');
  const selectedCount = selectedIndices.size;
  const allSelected = selectedCount === results.length;

  return (
    <div className="space-y-4">
      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('selectedCount', { selected: selectedCount, total: results.length })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? t('deselectAll') : t('selectAll')}
          </Button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {results.map((result, index) => {
          const { detected, catalogMatch } = result;
          const isSelected = selectedIndices.has(index);
          const confidence = getConfidenceBadge(detected.confidence);

          return (
            <div
              key={index}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
              onClick={() => onToggleItem(index)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggleItem(index);
                }
              }}
            >
              {/* Checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleItem(index)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {catalogMatch?.productName ?? detected.name}
                  </span>
                  <Badge variant={confidence.variant} className="text-xs shrink-0">
                    {Math.round(detected.confidence * 100)}%
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  {/* Brand */}
                  {(catalogMatch?.brandName ?? detected.brand) && (
                    <span className="flex items-center gap-1 truncate">
                      <Star className="h-3 w-3 shrink-0" />
                      <span className="truncate">{catalogMatch?.brandName ?? detected.brand}</span>
                    </span>
                  )}

                  {/* Category */}
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {detected.category}
                  </span>

                  {/* Weight */}
                  {(catalogMatch?.weightGrams ?? detected.estimatedWeightGrams) != null && (
                    <span>
                      {catalogMatch?.weightGrams ?? detected.estimatedWeightGrams}g
                    </span>
                  )}
                </div>

                {/* Catalog Match indicator */}
                {catalogMatch && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    {t('catalogMatch', {
                      score: Math.round(catalogMatch.matchScore * 100),
                    })}
                  </div>
                )}

                {!catalogMatch && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <X className="h-3 w-3" />
                    {t('noCatalogMatch')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
