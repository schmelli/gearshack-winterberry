'use client';

/**
 * Search Bar Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T044
 *
 * Keyword search input with debounce for filtering posts.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const t = useTranslations('bulletin');
  const [value, setValue] = useState('');

  // Use ref to store latest onSearch callback to avoid recreating debounce timer
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Debounced search - uses ref to avoid dependency on onSearch callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(value.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  const handleClear = useCallback(() => {
    setValue('');
    onSearchRef.current('');
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={t('search.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={handleClear}
          aria-label={t('search.clear')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
