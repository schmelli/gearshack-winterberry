'use client';

/**
 * VIP Loadout Selector Component
 *
 * Feature: 052-vip-loadouts
 * Task: T067
 *
 * Dropdown for selecting a VIP loadout for comparison.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown, Loader2, Search, Backpack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VipLoadoutSummary, VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutOption {
  vip: VipWithStats;
  loadout: VipLoadoutSummary;
}

interface VipLoadoutSelectorProps {
  selectedLoadoutId?: string;
  onSelect: (option: VipLoadoutOption) => void;
  excludeLoadoutId?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VipLoadoutSelector({
  selectedLoadoutId,
  onSelect,
  excludeLoadoutId,
  className,
}: VipLoadoutSelectorProps) {
  const t = useTranslations('vip.compare');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<VipLoadoutOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load VIP loadouts using optimized endpoint
  useEffect(() => {
    const fetchLoadouts = async () => {
      setIsLoading(true);
      try {
        // Use new optimized endpoint that fetches all VIPs with loadouts in one query
        const url = new URL('/api/vip-loadout-options', window.location.origin);
        if (excludeLoadoutId) {
          url.searchParams.set('excludeLoadoutId', excludeLoadoutId);
        }

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Failed to fetch VIP loadout options');

        const data = await response.json();
        setOptions(data.options || []);
      } catch (err) {
        console.error('Failed to load VIP loadouts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && options.length === 0) {
      fetchLoadouts();
    }
  }, [open, excludeLoadoutId, options.length]);

  // Filter options by search
  const filteredOptions = options.filter((option) =>
    option.vip.name.toLowerCase().includes(search.toLowerCase()) ||
    option.loadout.name.toLowerCase().includes(search.toLowerCase())
  );

  // Find selected option
  const selectedOption = options.find(
    (opt) => opt.loadout.id === selectedLoadoutId
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedOption ? (
            <span className="truncate">
              {selectedOption.vip.name} - {selectedOption.loadout.name}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('selectVipLoadout')}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            placeholder={t('searchVipsPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Backpack className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('noVipsFound')}
              </p>
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.loadout.id}
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent',
                    selectedLoadoutId === option.loadout.id && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      selectedLoadoutId === option.loadout.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{option.loadout.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      by {option.vip.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default VipLoadoutSelector;
