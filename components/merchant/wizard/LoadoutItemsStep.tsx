/**
 * LoadoutItemsStep Component
 *
 * Feature: 053-merchant-integration
 * Task: T035
 *
 * Second step of the loadout creation wizard.
 * Allows selecting and configuring items from the merchant's catalog.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Plus,
  Minus,
  X,
  GripVertical,
  Package,
  MessageSquare,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { LoadoutItemInput } from '@/types/merchant-loadout';
import type { MerchantCatalogItem } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutItemsStepProps {
  /** Selected items */
  items: LoadoutItemInput[];
  /** Available catalog items */
  catalogItems: MerchantCatalogItem[];
  /** Map for quick catalog item lookup */
  catalogItemsMap: Map<string, MerchantCatalogItem>;
  /** Callbacks */
  onAddItem: (item: LoadoutItemInput) => void;
  onUpdateItem: (catalogItemId: string, updates: Partial<LoadoutItemInput>) => void;
  onRemoveItem: (catalogItemId: string) => void;
  onReorderItems: (newOrder: LoadoutItemInput[]) => void;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutItemsStep({
  items,
  catalogItems,
  catalogItemsMap,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
}: LoadoutItemsStepProps) {
  const t = useTranslations('MerchantLoadouts.wizard.items');

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Get IDs of already-selected items
  const selectedItemIds = useMemo(
    () => new Set(items.map((i) => i.catalogItemId)),
    [items]
  );

  // Filter catalog items by search
  const filteredCatalogItems = useMemo(() => {
    if (!searchQuery.trim()) return catalogItems.filter((c) => !selectedItemIds.has(c.id));

    const query = searchQuery.toLowerCase();
    return catalogItems.filter(
      (item) =>
        !selectedItemIds.has(item.id) &&
        (item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query))
    );
  }, [catalogItems, searchQuery, selectedItemIds]);

  // Handle adding an item
  const handleAddItem = useCallback(
    (catalogItem: MerchantCatalogItem) => {
      onAddItem({
        catalogItemId: catalogItem.id,
        quantity: 1,
        sortOrder: items.length,
      });
      setSearchQuery('');
    },
    [items.length, onAddItem]
  );

  // Handle quantity change
  const handleQuantityChange = useCallback(
    (catalogItemId: string, delta: number) => {
      const item = items.find((i) => i.catalogItemId === catalogItemId);
      if (!item) return;

      const newQuantity = Math.max(1, (item.quantity ?? 1) + delta);
      onUpdateItem(catalogItemId, { quantity: newQuantity });
    },
    [items, onUpdateItem]
  );

  // Handle drag and drop
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder items
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, removed);
    onReorderItems(newItems);
    setDraggedIndex(index);
  }, [draggedIndex, items, onReorderItems]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search and Add Section */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
            {filteredCatalogItems.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No items found
              </div>
            ) : (
              filteredCatalogItems.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.brand && `${item.brand} · `}
                      {item.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-medium">
                      ${item.price.toFixed(2)}
                    </span>
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Items List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t('selected', { count: items.length })}
          </h3>
          {items.length > 1 && (
            <span className="text-xs text-muted-foreground">{t('reorder')}</span>
          )}
        </div>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-muted-foreground">
                {t('emptyState')}
              </p>
              <p className="text-sm text-muted-foreground/75 mt-1">
                {t('emptyStateHint')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const catalogItem = catalogItemsMap.get(item.catalogItemId);
              if (!catalogItem) return null;

              const isExpanded = expandedNoteId === item.catalogItemId;

              return (
                <Card
                  key={item.catalogItemId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'transition-opacity cursor-move',
                    draggedIndex === index && 'opacity-50'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      <div className="pt-1 text-muted-foreground/50">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {catalogItem.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {catalogItem.brand && `${catalogItem.brand} · `}
                              {catalogItem.weightGrams &&
                                `${catalogItem.weightGrams}g`}
                            </p>
                          </div>

                          {/* Price & Remove */}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              ${(
                                catalogItem.price * (item.quantity ?? 1)
                              ).toFixed(2)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onRemoveItem(item.catalogItemId)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">{t('removeItem')}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Quantity & Expert Note Controls */}
                        <div className="flex items-center gap-4 mt-2">
                          {/* Quantity */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {t('quantity')}:
                            </span>
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQuantityChange(item.catalogItemId, -1)
                                }
                                disabled={(item.quantity ?? 1) <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">
                                {item.quantity ?? 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQuantityChange(item.catalogItemId, 1)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Expert Note Toggle */}
                          <Collapsible
                            open={isExpanded}
                            onOpenChange={() =>
                              setExpandedNoteId(isExpanded ? null : item.catalogItemId)
                            }
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-7 text-xs',
                                  item.expertNote && 'text-primary'
                                )}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {t('expertNote')}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </div>

                        {/* Expert Note Input */}
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() =>
                            setExpandedNoteId(isExpanded ? null : item.catalogItemId)
                          }
                        >
                          <CollapsibleContent className="mt-2">
                            <Textarea
                              value={item.expertNote ?? ''}
                              onChange={(e) =>
                                onUpdateItem(item.catalogItemId, {
                                  expertNote: e.target.value,
                                })
                              }
                              placeholder={t('expertNotePlaceholder')}
                              rows={2}
                              className="text-sm resize-none"
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadoutItemsStep;
