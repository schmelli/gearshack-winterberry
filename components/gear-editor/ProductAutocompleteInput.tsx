/**
 * ProductAutocompleteInput Component
 *
 * Feature: 044-intelligence-integration
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Input field with product autocomplete suggestions.
 * - When brand is selected: filters products by that brand
 * - When no brand: searches all products
 * - When product selected: auto-fills brand if not already set
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useProductAutocomplete,
  type ProductSuggestion,
} from '@/hooks/useProductAutocomplete';
import type { GearItemFormData } from '@/types/gear';
import { useCategories } from '@/hooks/useCategories';
import { findProductTypeId } from '@/lib/utils/category-helpers';

// =============================================================================
// Types
// =============================================================================

interface ProductAutocompleteInputProps {
  /** Called when a product is selected, passes brand info for auto-fill */
  onProductSelect?: (product: ProductSuggestion) => void;
  /** Optional brand ID to filter products */
  brandId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProductAutocompleteInput({
  onProductSelect,
  brandId,
}: ProductAutocompleteInputProps) {
  const form = useFormContext<GearItemFormData>();
  const { suggestions, isLoading, search, clear } = useProductAutocomplete({
    brandId,
  });

  // Cascading Category Refactor (Phase 6): Get categories for auto-fill
  const { categories } = useCategories();

  // Local state for showing suggestions dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs for click outside detection
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Watch the current name value
  const nameValue = useWatch({ control: form.control, name: 'name' });

  // Handle input change - trigger search
  const handleInputChange = useCallback(
    (value: string) => {
      form.setValue('name', value);
      if (value.length >= 2) {
        search(value);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } else {
        clear();
        setShowSuggestions(false);
      }
    },
    [form, search, clear]
  );

  // Handle suggestion selection - auto-fill all available GearGraph data
  const handleSelectSuggestion = useCallback(
    (suggestion: ProductSuggestion) => {
      // Set name
      form.setValue('name', suggestion.name, { shouldDirty: true });

      // Auto-fill weight if available
      if (suggestion.weightGrams) {
        form.setValue('weightValue', suggestion.weightGrams.toString(), { shouldDirty: true });
        form.setValue('weightDisplayUnit', 'g', { shouldDirty: true });
      }

      // Auto-fill description if available and current description is empty
      if (suggestion.description && !form.getValues('description')) {
        form.setValue('description', suggestion.description, { shouldDirty: true });
      }

      // Auto-fill price if available and current price is empty
      if (suggestion.priceUsd && !form.getValues('pricePaid')) {
        form.setValue('pricePaid', suggestion.priceUsd.toString(), { shouldDirty: true });
        form.setValue('currency', 'USD', { shouldDirty: true });
      }

      // Cascading Category Refactor (Phase 6): Auto-fill productTypeId from GearGraph classification
      if (suggestion.productType && suggestion.subcategory && suggestion.categoryMain && categories.length > 0) {
        const productTypeId = findProductTypeId(
          {
            category: suggestion.categoryMain,
            subcategory: suggestion.subcategory,
            productType: suggestion.productType,
          },
          categories,
          'en'
        );

        if (productTypeId) {
          form.setValue('productTypeId', productTypeId, { shouldDirty: true });
        }
      }

      // Notify parent to handle brand auto-fill
      if (onProductSelect) {
        onProductSelect(suggestion);
      }

      clear();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [form, clear, onProductSelect, categories]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, highlightedIndex, handleSelectSuggestion]
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    if (nameValue && nameValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [nameValue, suggestions.length]);

  // Handle blur - delay to allow click on suggestions
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Nemo Hornet Elite 2P"
                {...field}
                ref={(el) => {
                  field.ref(el);
                  (
                    inputRef as React.MutableRefObject<HTMLInputElement | null>
                  ).current = el;
                }}
                value={field.value || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                autoComplete="off"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{suggestion.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {suggestion.brand && (
                      <span>{suggestion.brand.name}</span>
                    )}
                    {suggestion.categoryMain && (
                      <>
                        {suggestion.brand && <span>•</span>}
                        <span>{suggestion.categoryMain}</span>
                      </>
                    )}
                    {suggestion.subcategory && (
                      <>
                        <span>›</span>
                        <span>{suggestion.subcategory}</span>
                      </>
                    )}
                    {suggestion.productType && (
                      <>
                        <span>›</span>
                        <span>{suggestion.productType}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {suggestion.weightGrams && (
                      <span className="font-medium text-foreground">{suggestion.weightGrams}g</span>
                    )}
                    {suggestion.priceUsd && (
                      <>
                        {suggestion.weightGrams && <span>•</span>}
                        <span className="font-medium text-foreground">${suggestion.priceUsd}</span>
                      </>
                    )}
                    <span className="ml-auto">
                      {Math.round(suggestion.score * 100)}% match
                    </span>
                  </div>
                  {suggestion.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {suggestion.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && showSuggestions && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
          <p className="text-center text-sm text-muted-foreground">
            Searching products...
          </p>
        </div>
      )}
    </div>
  );
}
