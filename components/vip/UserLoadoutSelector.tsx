'use client';

/**
 * User Loadout Selector Component
 *
 * Feature: 052-vip-loadouts
 * Task: T068
 *
 * Dropdown for selecting user's own loadout for comparison.
 */

import { useState, useMemo } from 'react';
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
import { formatWeightFromGrams } from '@/lib/utils/weight';
import type { Loadout } from '@/hooks/useLoadouts';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface UserLoadoutSelectorProps {
  loadouts: Loadout[];
  gearItems: GearItem[];
  selectedLoadoutId?: string;
  onSelect: (loadout: LoadoutWithWeight) => void;
  isLoading?: boolean;
  className?: string;
}

export interface LoadoutWithWeight extends Loadout {
  totalWeightGrams: number;
}

// =============================================================================
// Component
// =============================================================================

export function UserLoadoutSelector({
  loadouts,
  gearItems,
  selectedLoadoutId,
  onSelect,
  isLoading = false,
  className,
}: UserLoadoutSelectorProps) {
  const t = useTranslations('vip.compare');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Create a map of gear item ID to weight for efficient lookup
  const gearWeightMap = useMemo(() => {
    const map = new Map<string, number>();
    gearItems.forEach((item) => {
      map.set(item.id, item.weightGrams ?? 0);
    });
    return map;
  }, [gearItems]);

  // Calculate total weight for each loadout
  const loadoutsWithWeight = useMemo(() => {
    return loadouts.map((loadout) => {
      const totalWeightGrams = loadout.items.reduce((sum, item) => {
        const weight = gearWeightMap.get(item.gearItemId) ?? 0;
        return sum + weight * item.quantity;
      }, 0);

      return {
        ...loadout,
        totalWeightGrams,
      };
    });
  }, [loadouts, gearWeightMap]);

  // Filter loadouts by search
  const filteredLoadouts = useMemo(() => {
    if (!search.trim()) return loadoutsWithWeight;

    const lowerSearch = search.toLowerCase();
    return loadoutsWithWeight.filter((loadout) =>
      loadout.name.toLowerCase().includes(lowerSearch)
    );
  }, [loadoutsWithWeight, search]);

  // Find selected loadout
  const selectedLoadout = loadoutsWithWeight.find(
    (l) => l.id === selectedLoadoutId
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
          {selectedLoadout ? (
            <span className="truncate">
              {selectedLoadout.name} ({formatWeightFromGrams(selectedLoadout.totalWeightGrams, 'g')})
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('selectYourLoadout')}
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
            placeholder={t('searchLoadoutsPlaceholder')}
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
          ) : filteredLoadouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Backpack className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {loadouts.length === 0
                  ? t('noLoadouts')
                  : t('noLoadoutsFound')}
              </p>
            </div>
          ) : (
            <div className="p-1">
              {filteredLoadouts.map((loadout) => (
                <button
                  key={loadout.id}
                  onClick={() => {
                    onSelect(loadout);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent',
                    selectedLoadoutId === loadout.id && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      selectedLoadoutId === loadout.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{loadout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatWeightFromGrams(loadout.totalWeightGrams, 'g')} •{' '}
                      {t('loadoutItems', { count: loadout.items.length })}
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

export default UserLoadoutSelector;
