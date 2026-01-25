/**
 * LocationAutocomplete Component
 *
 * Feature: 041-loadout-ux-profile
 * Task: T018
 *
 * Provides location autocomplete with Google Places API integration.
 * Shows suggestions dropdown, handles selection, and supports clearing.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, X, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete';
import type { LocationSelection } from '@/types/profile';

// =============================================================================
// Types
// =============================================================================

export interface LocationAutocompleteProps {
  /** Current location name to display */
  value: string;
  /** Callback when location is selected */
  onSelect: (location: LocationSelection | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
}

// =============================================================================
// Component
// =============================================================================

export function LocationAutocomplete({
  value,
  onSelect,
  placeholder = 'Search for a city...',
  disabled = false,
  error: externalError,
}: LocationAutocompleteProps) {
  const t = useTranslations('LocationSearch');
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    suggestions,
    isLoading,
    error: searchError,
    search,
    selectPlace,
    clear,
  } = useLocationAutocomplete();

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    search(newValue);
    setIsOpen(true);
  };

  // Handle suggestion selection
  const handleSuggestionClick = async (placeId: string) => {
    try {
      const location = await selectPlace(placeId);
      if (location) {
        setInputValue(location.formattedAddress);
        onSelect(location);
      }
    } catch (err) {
      console.error('Failed to select location:', err);
      // Error will be shown via the searchError state from the hook
    } finally {
      setIsOpen(false);
      clear();
    }
  };

  // Handle clear button
  const handleClear = () => {
    setInputValue('');
    onSelect(null);
    clear();
    inputRef.current?.focus();
  };

  // Handle input focus
  const handleFocus = () => {
    if (inputValue.length >= 3) {
      setIsOpen(true);
    }
  };

  // Display error
  const displayError = externalError || searchError;
  const showSuggestions = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Input with icon and clear button */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-16"
          aria-label="Location search"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {inputValue && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
              aria-label="Clear location"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {displayError && (
        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              role="option"
              aria-selected={false}
              className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleSuggestionClick(suggestion.placeId)}
            >
              <div className="font-medium">{suggestion.mainText}</div>
              {suggestion.secondaryText && (
                <div className="text-xs text-muted-foreground">{suggestion.secondaryText}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && !isLoading && inputValue.length >= 3 && suggestions.length === 0 && !searchError && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          {t('noCitiesFound')}
        </div>
      )}
    </div>
  );
}
