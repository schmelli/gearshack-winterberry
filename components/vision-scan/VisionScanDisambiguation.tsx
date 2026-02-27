/**
 * VisionScanDisambiguation Component
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Shows all catalog alternatives for a detected item and lets the user
 * choose the correct product. Displayed when an item has multiple matches
 * (e.g. 500ml, 650ml, 750ml variants of the same mug).
 *
 * Images for alternatives are lazy-loaded on mount via /api/vision/product-image
 * to avoid N+1 Serper calls during the initial scan.
 *
 * Stateless - receives all data via props.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, Star, ImageIcon, Loader2 } from 'lucide-react';
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
// Hook: lazy-load images for alternatives
// =============================================================================

function useAlternativeImages(options: CatalogMatch[]) {
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;

    // Only fetch images for options that don't have one yet
    const toFetch = options.filter(
      (o) => o.imageUrl === null && !(o.productId in imageMap)
    );

    if (toFetch.length === 0) return;

    // Fetch sequentially to avoid hammering Serper (max ~5 alternatives)
    const fetchImages = async () => {
      const results: PromiseSettledResult<{ productId: string; imageUrl: string | null }>[] = [];
      for (const option of toFetch) {
        if (cancelled) break;
        try {
          const res = await fetch('/api/vision/product-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand: option.brandName,
              productName: option.productName,
            }),
          });
          const value = !res.ok
            ? { productId: option.productId, imageUrl: null }
            : { productId: option.productId, imageUrl: ((await res.json())?.imageUrl as string) ?? null };
          results.push({ status: 'fulfilled', value });
        } catch (err) {
          results.push({ status: 'rejected', reason: err });
        }
      }

      if (cancelled) return;

      const newMap: Record<string, string | null> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          newMap[result.value.productId] = result.value.imageUrl;
        }
      }

      setImageMap((prev) => ({ ...prev, ...newMap }));
    };

    void fetchImages();

    return () => {
      cancelled = true;
    };
    // Only re-run when the set of option productIds changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.map((o) => o.productId).join(',')]);

  return imageMap;
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

  // Combine current best match + alternatives into one sorted list (memoized)
  const allOptions = useMemo(() => {
    const options: CatalogMatch[] = [];
    if (catalogMatch) {
      options.push(catalogMatch);
    }
    options.push(...alternatives);
    return options.sort((a, b) => b.matchScore - a.matchScore);
  }, [catalogMatch, alternatives]);

  // Lazy-load images for alternatives that don't have one
  const lazyImages = useAlternativeImages(allOptions);

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
          // Use the option's own image, or the lazy-loaded one
          const resolvedImage =
            option.imageUrl ?? lazyImages[option.productId] ?? null;
          const isLoadingImage =
            option.imageUrl === null && !(option.productId in lazyImages);

          return (
            <button
              key={option.productId}
              type="button"
              onClick={() => {
                // If we lazy-loaded an image, attach it to the match before selecting
                const matchWithImage: CatalogMatch =
                  resolvedImage && !option.imageUrl
                    ? { ...option, imageUrl: resolvedImage }
                    : option;
                onSelect(matchWithImage);
              }}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              {/* Product Image */}
              <div className="shrink-0 h-14 w-14 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                {resolvedImage ? (
                  <Image
                    src={resolvedImage}
                    alt={option.productName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : isLoadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
