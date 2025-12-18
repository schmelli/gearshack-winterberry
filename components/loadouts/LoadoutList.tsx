/**
 * LoadoutList Component
 *
 * Feature: 005-loadout-management
 * FR-012: Group loadout items by category in the List panel
 * FR-015: Remove items from loadout on single click/tap
 *
 * Feature: 006-ui-makeover
 * FR-012: Filter loadout list when user clicks a chart segment
 * FR-023: Empty state with "Your pack is empty" message and guidance
 *
 * Feature: 007-grand-polish-sprint
 * US4: Advanced Weight Calculations - Worn/Consumable toggles
 */

'use client';

import { X, Package, Shirt, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import type { GearItem } from '@/types/gear';
import { getSortedCategoryGroups, CATEGORY_LABELS, formatWeight } from '@/lib/loadout-utils';
import { useCategories } from '@/hooks/useCategories';

// =============================================================================
// Types
// =============================================================================

interface LoadoutListProps {
  items: GearItem[];
  onRemoveItem: (itemId: string) => void;
  /** Filter to show only items from this category (FR-012: chart segment filter) */
  filterCategoryId?: string | null;
  /** Check if item is worn (US4) */
  isWorn: (itemId: string) => boolean;
  /** Check if item is consumable (US4) */
  isConsumable: (itemId: string) => boolean;
  /** Toggle worn state (US4) */
  onToggleWorn: (itemId: string) => void;
  /** Toggle consumable state (US4) */
  onToggleConsumable: (itemId: string) => void;
  /** Feature 045: Click to view gear details in modal */
  onItemClick?: (itemId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutList({
  items,
  onRemoveItem,
  filterCategoryId,
  isWorn,
  isConsumable,
  onToggleWorn,
  onToggleConsumable,
  onItemClick,
}: LoadoutListProps) {
  const { categories } = useCategories();
  const categoryGroups = getSortedCategoryGroups(items, categories);
  const isEmpty = items.length === 0;

  // Filter groups if a category is selected (FR-012: chart segment filter)
  const filteredGroups = filterCategoryId
    ? categoryGroups.filter(([categoryId]) => categoryId === filterCategoryId)
    : categoryGroups;

  // FR-023: Empty state with helpful guidance (visible without scroll)
  if (isEmpty) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Your pack is empty</p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Browse your gear inventory on the left and click &quot;Add&quot; to start building your loadout.
        </p>
        <p className="mt-4 hidden text-center text-xs text-muted-foreground md:block">
          Tip: Click the donut chart segments to filter by category
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-20rem)]">
      <div className="space-y-6 pr-4">
        {filteredGroups.map(([categoryId, categoryItems]) => (
          <div key={categoryId}>
            {/* Category Header */}
            <h3 className="sticky top-0 z-10 mb-3 bg-background py-2 text-sm font-medium text-muted-foreground">
              {CATEGORY_LABELS[categoryId] ?? categoryId}
            </h3>

            {/* Items in Category */}
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <LoadoutListItem
                  key={item.id}
                  item={item}
                  onRemove={() => onRemoveItem(item.id)}
                  isWorn={isWorn(item.id)}
                  isConsumable={isConsumable(item.id)}
                  onToggleWorn={() => onToggleWorn(item.id)}
                  onToggleConsumable={() => onToggleConsumable(item.id)}
                  onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// =============================================================================
// List Item Sub-Component
// =============================================================================

interface LoadoutListItemProps {
  item: GearItem;
  onRemove: () => void;
  isWorn: boolean;
  isConsumable: boolean;
  onToggleWorn: () => void;
  onToggleConsumable: () => void;
  /** Feature 045: Click to view gear details */
  onClick?: () => void;
}

function LoadoutListItem({
  item,
  onRemove,
  isWorn,
  isConsumable,
  onToggleWorn,
  onToggleConsumable,
  onClick,
}: LoadoutListItemProps) {
  // Handle click on item body to open detail modal (Feature 045)
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      className={cn(
        'group flex items-center justify-between rounded-lg border bg-card p-3',
        'transition-colors',
        onClick ? 'cursor-pointer hover:border-primary/50 hover:bg-muted/50' : 'hover:border-destructive/50 hover:bg-destructive/5'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {item.brand && <span>{item.brand} · </span>}
          <span>{formatWeight(item.weightGrams)}</span>
        </p>
      </div>

      {/* Worn and Consumable Toggles (US4) - stopPropagation to not trigger modal */}
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <WornToggle pressed={isWorn} onPressedChange={onToggleWorn} />
        <ConsumableToggle pressed={isConsumable} onPressedChange={onToggleConsumable} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          aria-label={`Remove ${item.name} from loadout`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// WornToggle Sub-Component (US4)
// =============================================================================

interface WornToggleProps {
  pressed: boolean;
  onPressedChange: () => void;
}

function WornToggle({ pressed, onPressedChange }: WornToggleProps) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      size="sm"
      aria-label="Mark as worn"
      className={cn(
        'h-8 w-8 data-[state=on]:bg-primary/20 data-[state=on]:text-primary',
        'hover:bg-muted'
      )}
    >
      <Shirt className="h-4 w-4" />
    </Toggle>
  );
}

// =============================================================================
// ConsumableToggle Sub-Component (US4)
// =============================================================================

interface ConsumableToggleProps {
  pressed: boolean;
  onPressedChange: () => void;
}

function ConsumableToggle({ pressed, onPressedChange }: ConsumableToggleProps) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      size="sm"
      aria-label="Mark as consumable"
      className={cn(
        'h-8 w-8 data-[state=on]:bg-accent/20 data-[state=on]:text-accent',
        'hover:bg-muted'
      )}
    >
      <Apple className="h-4 w-4" />
    </Toggle>
  );
}
