/**
 * ProductSearchGrid Component
 *
 * Feature: 039-product-search-cloudinary
 *
 * A stateless component that renders image search results in a 3x2 grid (6 images).
 * Handles user selection and displays upload state.
 *
 * Constitution Compliance:
 * - Principle I: Stateless component (all data via props)
 * - Principle II: Uses shadcn/ui patterns and Tailwind CSS
 * - Principle III: Accessibility with proper button semantics
 */

'use client';

import Image from 'next/image';
import { ImageSearchResult } from '@/app/actions/image-search';
import { Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ProductSearchGridProps {
  /** Search results to display */
  results: ImageSearchResult[];
  /** Callback when user clicks an image */
  onSelect: (imageUrl: string) => void;
  /** Whether an image is currently being uploaded */
  isUploading?: boolean;
  /** Currently selected/uploading image URL */
  selectedUrl?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function ProductSearchGrid({
  results,
  onSelect,
  isUploading = false,
  selectedUrl = null,
}: ProductSearchGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {results.map((result) => {
        const isSelected = selectedUrl === result.imageUrl;
        const isDisabled = isUploading;

        return (
          <button
            key={result.imageUrl}
            type="button"
            onClick={() => !isDisabled && onSelect(result.imageUrl)}
            disabled={isDisabled}
            className="relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:border-primary hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: isSelected ? 'hsl(var(--primary))' : 'transparent',
            }}
            aria-label={`Select ${result.title}`}
          >
            {/* Thumbnail Image */}
            <Image
              src={result.thumbnailUrl}
              alt={result.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />

            {/* Upload Indicator Overlay */}
            {isSelected && isUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
          </button>
        );
      })}
    </div>
  );
}
