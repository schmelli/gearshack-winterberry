/**
 * DependencyPromptDialog Component
 *
 * Feature: 037-gear-dependencies
 * Tasks: T027-T030
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Modal dialog that appears when adding a gear item with dependencies
 * to a loadout. Shows missing dependencies and allows the user to:
 * - Add all dependencies
 * - Select specific dependencies to add
 * - Skip dependencies entirely
 * - Cancel the operation
 */

'use client';

import { Link2, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import type { GearItem } from '@/types/gear';
import type { DependencyPromptItem } from '@/hooks/useDependencyPrompt';
import { formatWeightForDisplay } from '@/lib/gear-utils';

// =============================================================================
// Types
// =============================================================================

export interface DependencyPromptDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** List of pending dependencies to display */
  pendingDependencies: DependencyPromptItem[];
  /** The item that triggered the dependency check */
  triggeringItem: GearItem | null;
  /** Total count of dependencies */
  totalCount: number;
  /** Count of selected dependencies */
  selectedCount: number;
  /** Toggle selection of a dependency */
  toggleSelection: (itemId: string) => void;
  /** Select all dependencies */
  selectAll: () => void;
  /** Deselect all dependencies */
  deselectAll: () => void;
  /** Add all dependencies */
  onAddAll: () => void;
  /** Add only selected dependencies */
  onAddSelected: () => void;
  /** Skip adding dependencies (add only triggering item) */
  onSkip: () => void;
  /** Cancel the operation entirely */
  onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function DependencyPromptDialog({
  isOpen,
  pendingDependencies,
  triggeringItem,
  totalCount,
  selectedCount,
  toggleSelection,
  selectAll,
  deselectAll,
  onAddAll,
  onAddSelected,
  onSkip,
  onCancel,
}: DependencyPromptDialogProps) {
  const t = useTranslations('Loadouts');

  if (!triggeringItem) return null;

  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('dependencies.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dependencies.description', { itemName: triggeringItem.name, count: totalCount })}
          </DialogDescription>
        </DialogHeader>

        {/* Dependency List */}
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-2">
            {pendingDependencies.map((dep) => (
              <button
                key={dep.item.id}
                type="button"
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  dep.isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
                onClick={() => toggleSelection(dep.item.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox indicator */}
                  <div
                    className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      dep.isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/50'
                    }`}
                  >
                    {dep.isSelected && (
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{dep.item.name}</span>
                      {dep.item.weightGrams && (
                        <span className="text-xs text-muted-foreground">
                          {formatWeightForDisplay(dep.item.weightGrams)}
                        </span>
                      )}
                    </div>
                    {dep.item.brand && (
                      <div className="text-sm text-muted-foreground truncate">
                        {dep.item.brand}
                      </div>
                    )}
                    <div className="mt-1">
                      <Badge
                        variant={dep.isDirect ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        {dep.isDirect ? t('dependencies.direct') : t('dependencies.transitive')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Selection controls */}
        <div className="flex items-center gap-2 text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAll}
            disabled={allSelected}
          >
            {t('dependencies.selectAll')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            {t('dependencies.deselectAll')}
          </Button>
          <span className="ml-auto text-muted-foreground">
            {t('dependencies.selectedCount', { selected: selectedCount, total: totalCount })}
          </span>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onSkip}>
            {t('dependencies.skip')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onAddSelected}
            disabled={!hasSelection}
          >
            {t('dependencies.addSelected', { count: selectedCount })}
          </Button>
          <Button type="button" onClick={onAddAll}>
            {t('dependencies.addAll', { count: totalCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
