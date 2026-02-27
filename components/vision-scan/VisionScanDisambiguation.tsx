/**
 * VisionScanDisambiguation Component
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Shows all catalog alternatives for a detected item and lets the user
 * choose the correct product. Displayed when an item has multiple matches
 * (e.g. 500ml, 650ml, 750ml variants of the same mug).
 * Stateless - receives all data via props.
 */

'use client';

import Image from 'next/image';
import { Check, Star, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CatalogMatchResult, CatalogMatch } from '@/types/vision-scan';

// =============================================================================
// Types
// =============================================================================

interface VisionScanDisambiguationProps {
  item: CatalogMatchResult;
  onSelect: (match: CatalogMatch) => void;
  onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VisionScanDisambiguation({
  item,
  onSelect,
  onCancel,
}: VisionScanDisambiguationProps) {
  const t = useTranslations('VisionScan');
  const { detected, catalogMatch, alternatives } = item;

  // Combine current best match + alternatives into one list for display
  const allOptions: CatalogMatch[] = [];
  if (catalogMatch) {
    allOptions.push(catalogMatch);
  }
  allOptions.push(...alternatives);

  // Sort by match score descending
  allOptions.sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {t('disambiguationTitle')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('disambiguationDescription', {
            name: detected.brand
              ? `${detected.brand} ${detected.name}`
              : detected.name,
          })}
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {allOptions.map((option) => {
          const isCurrent = option.productId === catalogMatch?.productId;

          return (
            <button
              key={option.productId}
              type="button"
              onClick={() => onSelect(option)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              {/* Product Image */}
              <div className="shrink-0 h-14 w-14 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                {option.imageUrl ? (
                  <Image
                    src={option.imageUrl}
                    alt={option.productName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {option.productName}
                  </span>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      {t('currentMatch')}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  {option.brandName && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {option.brandName}
                    </span>
                  )}

                  {option.weightGrams != null && (
                    <span>{option.weightGrams}g</span>
                  )}

                  {option.priceUsd != null && (
                    <span>${option.priceUsd.toFixed(2)}</span>
                  )}

                  <Badge variant="outline" className="text-xs">
                    {Math.round(option.matchScore * 100)}%
                  </Badge>
                </div>

                {/* Description */}
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Cancel */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('keepCurrent')}
        </Button>
      </div>
    </div>
  );
}
