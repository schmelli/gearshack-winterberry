/**
 * Loadout Editor Page
 *
 * Feature: 006-ui-makeover
 * FR-001: Max-width container with proper padding
 * FR-002: Inventory picker on the left column on desktop
 * FR-003: Loadout list on the right column with sticky positioning
 * FR-004: Stack loadout list above picker on mobile
 * FR-005: Bottom sheet/drawer for adding items on mobile
 * FR-006-010: Enhanced header with Rock Salt title, badges, weight progress
 */

'use client';

import { use, useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLoadout, useStore, useItems } from '@/hooks/useSupabaseStore';
import { formatWeightForDisplay } from '@/lib/gear-utils';
import { useLoadoutEditor } from '@/hooks/useLoadoutEditor';
import { useLoadoutMetadata } from '@/hooks/useLoadoutMetadata';
import { useLoadoutItemState } from '@/hooks/useLoadoutItemState';
import { useChartFilter } from '@/hooks/useChartFilter';
import { useDependencyPrompt } from '@/hooks/useDependencyPrompt';
import { useCategories } from '@/hooks/useCategories';
import { useLighterAlternatives } from '@/hooks/useLighterAlternatives';
import { useUserPreferences } from '@/hooks/settings/useUserPreferences';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MEDIA_QUERIES } from '@/lib/constants/breakpoints';
import { LoadoutHeader } from '@/components/loadouts/LoadoutHeader';
import { LoadoutList } from '@/components/loadouts/LoadoutList';
import { LoadoutPicker } from '@/components/loadouts/LoadoutPicker';
import { LoadoutMetadataDialog } from '@/components/loadouts/LoadoutMetadataDialog';
import { DependencyPromptDialog } from '@/components/loadouts/DependencyPromptDialog';
import { WeightBar } from '@/components/loadouts/WeightBar';
import { LoadoutSortFilter, type SortOption } from '@/components/loadouts/LoadoutSortFilter';
import { sortAndFilterItems } from '@/lib/loadout-utils';
import {
  LoadoutHeroActionButtons,
  LoadoutHeroBadges,
} from '@/components/loadouts/LoadoutHeroActions';

import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Season } from '@/types/loadout';
import { LoadoutHeroImageSection } from '@/components/loadout/LoadoutHeroImageSection';
import { useLoadoutScreenEffect } from '@/hooks/useScreenEffect';

// =============================================================================
// Types
// =============================================================================

interface LoadoutEditorPageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// Page Component
// =============================================================================

export default function LoadoutEditorPage({ params }: LoadoutEditorPageProps) {
  const { id } = use(params);
  const t = useTranslations('Loadouts');
  const loadout = useLoadout(id);
  const allItems = useItems();
  const userId = useStore((state) => state.userId);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const updateLoadout = useStore((state) => state.updateLoadout);
  const updateLoadoutMetadata = useStore((state) => state.updateLoadoutMetadata);
  const addItemToLoadout = useStore((state) => state.addItemToLoadout);

  // AI Agent Context-Awareness: Set screen context
  useLoadoutScreenEffect(id, loadout?.name);

  // Swipe gesture configuration
  const { preferences } = useUserPreferences();
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop);
  // Detect actual touch capability via coarse pointer, not just viewport width.
  // This prevents hiding desktop controls on narrow non-touch windows.
  const hasTouchPointer = useMediaQuery('(pointer: coarse)');

  // Editor state and actions
  const {
    loadoutItems,
    searchQuery,
    setSearchQuery,
    filteredPickerItems,
    addItem,
    removeItem,
    swapItem,
    totalWeight,
    baseWeight,
    itemStates,
  } = useLoadoutEditor(id);

  // Dependency prompt (Feature: 037)
  const dependencyPrompt = useDependencyPrompt({
    loadoutId: id,
    addItemToLoadout,
    currentLoadoutItemIds: loadout?.itemIds ?? [],
    allItems,
  });

  // Metadata state
  const { activityTypes, seasons, toggleActivity, toggleSeason } =
    useLoadoutMetadata(id);

  // Chart filter state
  const { selectedCategoryId, toggleCategory, clearFilter } = useChartFilter();

  // Sort and filter state
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [sortFilterCategoryId, setSortFilterCategoryId] = useState<string | null>(null);
  const { categories } = useCategories();

  const sortedFilteredPickerItems = useMemo(
    () => sortAndFilterItems(filteredPickerItems, sortBy, sortFilterCategoryId, categories),
    [filteredPickerItems, sortBy, sortFilterCategoryId, categories]
  );

  const sortedFilteredLoadoutItems = useMemo(
    () => sortAndFilterItems(loadoutItems, sortBy, sortFilterCategoryId, categories),
    [loadoutItems, sortBy, sortFilterCategoryId, categories]
  );

  // Item state tracking
  const { isWorn, isConsumable, toggleWorn, toggleConsumable, canAddItem } =
    useLoadoutItemState(id);

  // Lighter alternatives
  const { getLighterAlternative } = useLighterAlternatives(loadoutItems);

  // Gear detail modal
  const [selectedGearId, setSelectedGearId] = useState<string | null>(null);
  const [gearModalOpen, setGearModalOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const selectedGearItem = selectedGearId
    ? loadoutItems.find((item) => item.id === selectedGearId) ?? null
    : null;

  function handleGearClick(itemId: string): void {
    setSelectedGearId(itemId);
    setGearModalOpen(true);
  }

  if (!loadout) {
    notFound();
  }

  function handleAddItem(itemId: string): void {
    if (!canAddItem(itemId)) return;
    const hasPrompt = dependencyPrompt.triggerCheck(itemId);
    if (!hasPrompt) {
      addItem(itemId);
    }
  }

  function handleDuplicateItem(itemId: string): void {
    if (!canAddItem(itemId)) return;
    addItemToLoadout(id, itemId);
  }

  async function handleMetadataSave(data: {
    name: string;
    description: string | null;
    season: Season | null;
    tripDate: Date | null;
  }): Promise<void> {
    await updateLoadout(id, {
      name: data.name,
      description: data.description,
      tripDate: data.tripDate,
    });
    updateLoadoutMetadata(id, { seasons: data.season ? [data.season] : [] });
  }

  async function handleDescriptionChange(description: string | null): Promise<void> {
    await updateLoadout(id, { description });
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Hero Image Section */}
      {userId && (
        <LoadoutHeroImageSection
          loadout={loadout}
          userId={userId}
          totalWeight={formatWeightForDisplay(totalWeight)}
          itemCount={loadoutItems.length}
          backHref="/loadouts"
          backLabel={t('backToLoadouts')}
          actionButtons={
            <LoadoutHeroActionButtons
              loadout={loadout}
              items={loadoutItems}
              itemStates={itemStates}
              activityTypes={activityTypes}
              seasons={seasons}
              totalWeight={totalWeight}
              baseWeight={baseWeight}
              userId={userId}
              onEditClick={() => setMetadataDialogOpen(true)}
            />
          }
          badges={
            <LoadoutHeroBadges
              activityTypes={activityTypes}
              seasons={seasons}
            />
          }
        />
      )}

      {/* Header with description and weight chart */}
      <LoadoutHeader
        loadout={loadout}
        items={loadoutItems}
        itemStates={itemStates}
        activityTypes={activityTypes}
        seasons={seasons}
        onToggleActivity={toggleActivity}
        onToggleSeason={toggleSeason}
        selectedCategoryId={selectedCategoryId}
        onSegmentClick={(categoryId) => toggleCategory(categoryId)}
        onDescriptionChange={handleDescriptionChange}
      />

      {/* Metadata Dialog */}
      <LoadoutMetadataDialog
        loadout={loadout}
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        onSave={handleMetadataSave}
      />

      {/* Two-Column Layout */}
      <div className="container mx-auto max-w-6xl flex-1 px-2 py-4 sm:px-4 sm:py-6 lg:px-8">
        {/* Sort/Filter Controls (desktop) */}
        <div className="mb-4 hidden md:block">
          <LoadoutSortFilter
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterCategoryId={sortFilterCategoryId}
            onFilterChange={setSortFilterCategoryId}
          />
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-[2fr_3fr]">
          {/* Left: Item Picker (desktop) */}
          <div className="hidden space-y-4 md:block">
            <h2 className="text-lg font-semibold">{t('editor.addFromInventory')}</h2>
            <LoadoutPicker
              items={sortedFilteredPickerItems}
              loadoutItemIds={loadout.itemIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddItem={handleAddItem}
              sortBy={sortBy}
            />
          </div>

          {/* Right: Loadout List */}
          <div className="space-y-4 md:sticky md:top-28 md:self-start">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t('editor.loadoutItems')}</h2>
              {selectedCategoryId && (
                <button
                  onClick={clearFilter}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('editor.clearFilter')}
                </button>
              )}
            </div>
            <LoadoutList
              items={sortedFilteredLoadoutItems}
              onRemoveItem={removeItem}
              onSwapItem={swapItem}
              filterCategoryId={selectedCategoryId}
              sortBy={sortBy}
              isWorn={isWorn}
              isConsumable={isConsumable}
              onToggleWorn={toggleWorn}
              onToggleConsumable={toggleConsumable}
              onItemClick={handleGearClick}
              getLighterAlternative={getLighterAlternative}
              swipeConfig={preferences.swipeActions}
              isTouchDevice={hasTouchPointer && !isDesktop}
              onDuplicateItem={handleDuplicateItem}
              reduceAnimations={preferences.reduceAnimations}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Add Items Sheet */}
      <div className="fixed bottom-20 left-0 right-0 p-3 sm:p-4 md:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button className="w-full" size="default">
              <Plus className="mr-2 h-4 w-4" />
              {t('editor.addItems')}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>{t('editor.addFromInventory')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <LoadoutSortFilter
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterCategoryId={sortFilterCategoryId}
                onFilterChange={setSortFilterCategoryId}
              />
              <div className="h-[calc(80vh-12rem)] overflow-y-auto pb-8">
                <LoadoutPicker
                  items={sortedFilteredPickerItems}
                  loadoutItemIds={loadout.itemIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onAddItem={handleAddItem}
                  sortBy={sortBy}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Sticky Weight Bar */}
      <WeightBar totalWeight={totalWeight} itemCount={loadoutItems.length} />

      {/* Dependency Prompt Dialog */}
      <DependencyPromptDialog
        isOpen={dependencyPrompt.isOpen}
        pendingDependencies={dependencyPrompt.pendingDependencies}
        triggeringItem={dependencyPrompt.triggeringItem}
        totalCount={dependencyPrompt.totalCount}
        selectedCount={dependencyPrompt.selectedCount}
        toggleSelection={dependencyPrompt.toggleSelection}
        selectAll={dependencyPrompt.selectAll}
        deselectAll={dependencyPrompt.deselectAll}
        onAddAll={dependencyPrompt.onAddAll}
        onAddSelected={dependencyPrompt.onAddSelected}
        onSkip={dependencyPrompt.onSkip}
        onCancel={dependencyPrompt.onCancel}
      />

      {/* Gear Detail Modal */}
      <GearDetailModal
        open={gearModalOpen}
        onOpenChange={setGearModalOpen}
        item={selectedGearItem}
        isMobile={isMobile}
      />
    </div>
  );
}
