/**
 * DependenciesSection Component
 *
 * Feature: 037-gear-dependencies
 * Tasks: T013-T017
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form field for linking accessory items as dependencies.
 * Allows users to search and select items, with validation for
 * circular references and self-referencing.
 */

'use client';

import { useState, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Search, X, Link2, AlertTriangle } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GearItem, GearItemFormData } from '@/types/gear';
import {
  createItemsMap,
  validateDependencyLink,
} from '@/lib/dependency-utils';

// =============================================================================
// Types
// =============================================================================

export interface DependenciesSectionProps {
  /** All available gear items for the dependency picker */
  availableItems: GearItem[];
  /** The ID of the current item being edited (to exclude from picker) */
  currentItemId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DependenciesSection({
  availableItems,
  currentItemId,
}: DependenciesSectionProps) {
  const form = useFormContext<GearItemFormData>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Create items map for efficient lookup and validation
  const itemsMap = useMemo(
    () => createItemsMap(availableItems),
    [availableItems]
  );

  // Get current dependency IDs from form
  const watchedDependencyIds = form.watch('dependencyIds');
  const dependencyIds = useMemo(
    () => watchedDependencyIds ?? [],
    [watchedDependencyIds]
  );

  // Filter available items for the picker
  const filteredItems = useMemo(() => {
    // Exclude current item and already selected items
    const excludeIds = new Set([
      ...(currentItemId ? [currentItemId] : []),
      ...dependencyIds,
    ]);

    let items = availableItems.filter((item) => !excludeIds.has(item.id));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.brand?.toLowerCase().includes(query) ?? false)
      );
    }

    return items;
  }, [availableItems, currentItemId, dependencyIds, searchQuery]);

  // Get linked items (with broken link detection)
  const linkedItems = useMemo(() => {
    return dependencyIds.map((id) => {
      const item = itemsMap.get(id);
      return { id, item, isBroken: !item };
    });
  }, [dependencyIds, itemsMap]);

  // Handler: Add a dependency
  const handleAddDependency = (itemId: string) => {
    // Validate before adding
    if (currentItemId) {
      const validation = validateDependencyLink(currentItemId, itemId, itemsMap);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage ?? 'Invalid dependency');
        return;
      }
    }

    setValidationError(null);
    const newIds = [...dependencyIds, itemId];
    form.setValue('dependencyIds', newIds, { shouldDirty: true });
    setSearchQuery('');
    setIsOpen(false);
  };

  // Handler: Remove a dependency
  const handleRemoveDependency = (itemId: string) => {
    const newIds = dependencyIds.filter((id) => id !== itemId);
    form.setValue('dependencyIds', newIds, { shouldDirty: true });
  };

  // Check if there are no items available for linking
  const hasNoAvailableItems = availableItems.length === 0 ||
    (availableItems.length === 1 && availableItems[0]?.id === currentItemId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Linked Accessories</h3>

      <FormField
        control={form.control}
        name="dependencyIds"
        render={() => (
          <FormItem>
            <FormLabel>Items that typically go with this gear</FormLabel>
            <FormControl>
              <div className="space-y-3">
                {/* Search/Add Picker */}
                {hasNoAvailableItems ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No other items available. Add more gear to your inventory to link accessories.
                  </p>
                ) : (
                  <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-muted-foreground"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search for items to link...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search by name or brand..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="h-[200px]">
                        {filteredItems.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {searchQuery
                              ? 'No items match your search'
                              : 'All available items are already linked'}
                          </div>
                        ) : (
                          <div className="p-1">
                            {filteredItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full text-left p-2 hover:bg-accent rounded-md flex items-center gap-2"
                                onClick={() => handleAddDependency(item.id)}
                              >
                                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate">{item.name}</div>
                                  {item.brand && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {item.brand}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Validation Error Alert */}
                {validationError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Linked Items List */}
                {linkedItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Linked Items ({linkedItems.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {linkedItems.map(({ id, item, isBroken }) => (
                        <Badge
                          key={id}
                          variant={isBroken ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1 pr-1"
                        >
                          {isBroken ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>Missing Item</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3 w-3" />
                              <span className="max-w-[150px] truncate">
                                {item?.name}
                              </span>
                              {item?.brand && (
                                <span className="text-xs opacity-70">
                                  ({item.brand})
                                </span>
                              )}
                            </>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 hover:bg-transparent"
                            onClick={() => handleRemoveDependency(id)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove dependency</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormControl>
            <FormDescription>
              Link items that should be packed with this gear. When you add this item to a loadout, you&apos;ll be reminded about these accessories.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
