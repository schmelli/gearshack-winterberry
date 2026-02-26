'use client';

/**
 * VIP Search Input Component
 *
 * Feature: 052-vip-loadouts
 * Task: T061
 *
 * Search input with clear button for VIP search.
 */

import { useTranslations } from 'next-intl';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

interface VipSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VipSearchInput({
  value,
  onChange,
  isLoading = false,
  placeholder,
  className = '',
}: VipSearchInputProps) {
  const t = useTranslations('vip.search');

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon or Loading Spinner */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      {/* Input */}
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('placeholder')}
        className="pl-10 pr-10"
        aria-label={t('placeholder')}
      />

      {/* Clear Button */}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => onChange('')}
          aria-label={t('clearSearch')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default VipSearchInput;
