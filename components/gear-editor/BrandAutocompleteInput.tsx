/**
 * BrandAutocompleteInput Component
 *
 * Feature: 044-intelligence-integration
 * Task: T026
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Input field with brand autocomplete suggestions using fuzzy search.
 * Allows custom values not in the suggestions list (per FR-008).
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useBrandAutocomplete } from '@/hooks/useBrandAutocomplete';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface BrandSelection {
  id: string;
  name: string;
  websiteUrl?: string | null;
}

interface BrandAutocompleteInputProps {
  /** Called when a brand is selected from suggestions */
  onBrandSelect?: (brand: BrandSelection | null) => void;
}

// =============================================================================
// Component
// =============================================================================

export function BrandAutocompleteInput({
  onBrandSelect,
}: BrandAutocompleteInputProps = {}) {
  const t = useTranslations('GearEditor');
  const form = useFormContext<GearItemFormData>();
  const { suggestions, isLoading, search, clear } = useBrandAutocomplete();

  // Local state for showing suggestions dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs for click outside detection and timeout cleanup
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watch the current brand value
  const brandValue = useWatch({ control: form.control, name: 'brand' });

  // Handle input change - trigger search
  const handleInputChange = useCallback(
    (value: string) => {
      form.setValue('brand', value);
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

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (id: string, name: string, websiteUrl?: string | null) => {
      form.setValue('brand', name);
      // If brandUrl field exists and is empty, populate it with the website URL
      if (websiteUrl) {
        const currentBrandUrl = form.getValues('brandUrl');
        if (!currentBrandUrl) {
          form.setValue('brandUrl', websiteUrl);
        }
      }
      // Notify parent of brand selection
      if (onBrandSelect) {
        onBrandSelect({ id, name, websiteUrl });
      }
      clear();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [form, clear, onBrandSelect]
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
            const selected = suggestions[highlightedIndex];
            handleSelectSuggestion(selected.id, selected.name, selected.websiteUrl);
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
    if (brandValue && brandValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [brandValue, suggestions.length]);

  // Handle blur - delay to allow click on suggestions
  const handleBlur = useCallback(() => {
    // Clear any existing blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    // Delay hiding to allow click events on suggestions
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  }, []);

  // Click outside to close suggestions and cleanup blur timeout on unmount
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup blur timeout to prevent memory leaks
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <FormField
        control={form.control}
        name="brand"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('brandLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('brandPlaceholder')}
                {...field}
                ref={(el) => {
                  // Combine refs: react-hook-form's ref and our local ref
                  field.ref(el);
                  (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
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
                onMouseDown={() =>
                  handleSelectSuggestion(suggestion.id, suggestion.name, suggestion.websiteUrl)
                }
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{suggestion.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {suggestion.source === 'catalog' ? t('brandAutocomplete.sourceGearGraph') : t('brandAutocomplete.sourceInventory')}
                  </span>
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
            {t('brandAutocomplete.searching')}
          </p>
        </div>
      )}

      {/* No results message */}
      {showSuggestions &&
        !isLoading &&
        suggestions.length === 0 &&
        brandValue &&
        brandValue.length >= 2 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
            <p className="text-center text-sm text-muted-foreground">
              {t('brandAutocomplete.noResults')}
            </p>
          </div>
        )}
    </div>
  );
}
