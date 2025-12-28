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

import { useLoadout, useStore, useItems } from '@/hooks/useSupabaseStore';
import { formatWeightForDisplay } from '@/lib/gear-utils';
import { useLoadoutEditor } from '@/hooks/useLoadoutEditor';
import { useLoadoutMetadata } from '@/hooks/useLoadoutMetadata';
import { useLoadoutItemState } from '@/hooks/useLoadoutItemState';
import { useChartFilter } from '@/hooks/useChartFilter';
import { useDependencyPrompt } from '@/hooks/useDependencyPrompt';
import { useCategories } from '@/hooks/useCategories';
import { useLighterAlternatives } from '@/hooks/useLighterAlternatives';
import { LoadoutHeader } from '@/components/loadouts/LoadoutHeader';
import { LoadoutList } from '@/components/loadouts/LoadoutList';
import { LoadoutPicker } from '@/components/loadouts/LoadoutPicker';
import { LoadoutMetadataDialog } from '@/components/loadouts/LoadoutMetadataDialog';
import { DependencyPromptDialog } from '@/components/loadouts/DependencyPromptDialog';
import { WeightBar } from '@/components/loadouts/WeightBar';
import { LoadoutSortFilter, type SortOption } from '@/components/loadouts/LoadoutSortFilter';
import { sortAndFilterItems } from '@/lib/loadout-utils';

import { LoadoutExportMenu } from '@/components/loadouts/LoadoutExportMenu';

import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useMediaQuery } from '@/hooks/useGearDetailModal';

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
  const loadout = useLoadout(id);
  const allItems = useItems();
  const userId = useStore((state) => state.userId);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const updateLoadout = useStore((state) => state.updateLoadout);
  const updateLoadoutMetadata = useStore((state) => state.updateLoadoutMetadata);
  const addItemToLoadout = useStore((state) => state.addItemToLoadout);

  // Editor state and actions
  const {
    loadoutItems,
    searchQuery,
    setSearchQuery,
    filteredPickerItems,
    addItem,
    removeItem,
    totalWeight,
    baseWeight,
    categoryWeights,
    itemStates,
  } = useLoadoutEditor(id);

  // Dependency prompt (Feature: 037-gear-dependencies)
  const dependencyPrompt = useDependencyPrompt({
    loadoutId: id,
    addItemToLoadout,
    currentLoadoutItemIds: loadout?.itemIds ?? [],
    allItems,
  });

  // Metadata state (activity types, seasons)
  const { activityTypes, seasons, toggleActivity, toggleSeason } =
    useLoadoutMetadata(id);

  // Chart filter state (FR-012: filter list by chart segment click)
  const { selectedCategoryId, toggleCategory, clearFilter } = useChartFilter();

  // Sort and filter state for both panels
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [sortFilterCategoryId, setSortFilterCategoryId] = useState<string | null>(null);
  const { categories } = useCategories();

  // Apply sorting and filtering to picker items
  const sortedFilteredPickerItems = useMemo(
    () => sortAndFilterItems(filteredPickerItems, sortBy, sortFilterCategoryId, categories),
    [filteredPickerItems, sortBy, sortFilterCategoryId, categories]
  );

  // Apply sorting and filtering to loadout items
  const sortedFilteredLoadoutItems = useMemo(
    () => sortAndFilterItems(loadoutItems, sortBy, sortFilterCategoryId, categories),
    [loadoutItems, sortBy, sortFilterCategoryId, categories]
  );

  // Item state for worn/consumable tracking (US4)
  const { isWorn, isConsumable, toggleWorn, toggleConsumable } = useLoadoutItemState(id);

  // Lighter alternatives detection (Feature: loadout-ux-enhancements)
  const { getLighterAlternative } = useLighterAlternatives(loadoutItems);

  // Feature 045: Gear detail modal state
  const [selectedGearId, setSelectedGearId] = useState<string | null>(null);
  const [gearModalOpen, setGearModalOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Find selected gear item
  const selectedGearItem = selectedGearId
    ? loadoutItems.find((item) => item.id === selectedGearId) ?? null
    : null;

  // Open gear detail modal
  const handleGearClick = (itemId: string) => {
    setSelectedGearId(itemId);
    setGearModalOpen(true);
  };

  // Handle not found
  if (!loadout) {
    notFound();
  }

  // Wrapper for addItem with dependency check (Feature: 037-gear-dependencies)
  const handleAddItem = (itemId: string) => {
    // Check for dependencies - if modal is shown, it handles the add flow
    const hasPrompt = dependencyPrompt.triggerCheck(itemId);
    if (!hasPrompt) {
      // No dependencies, add item directly
      addItem(itemId);
    }
  };

  // Handle metadata save (US5)
  const handleMetadataSave = async (data: { name: string; description: string | null; season: Season | null; tripDate: Date | null }) => {
    await updateLoadout(id, {
      name: data.name,
      description: data.description,
      tripDate: data.tripDate,
    });
    if (data.season) {
      updateLoadoutMetadata(id, { seasons: [data.season] });
    } else {
      updateLoadoutMetadata(id, { seasons: [] });
    }
  };

  // Handle inline description change (FR-014)
  const handleDescriptionChange = async (description: string | null) => {
    await updateLoadout(id, { description });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Hero Image Section (Feature 048) */}
      {userId && (
        <div className="container max-w-4xl px-4 pt-6 sm:px-6">
          <LoadoutHeroImageSection
            loadout={loadout}
            userId={userId}
            totalWeight={formatWeightForDisplay(totalWeight)}
            itemCount={loadoutItems.length}
          />
        </div>
      )}

      {/* Enhanced Header with sans-serif title, badges, weight summary */}
      <LoadoutHeader
        loadout={loadout}
        items={loadoutItems}
        itemStates={itemStates}
        activityTypes={activityTypes}
        seasons={seasons}
        onToggleActivity={toggleActivity}
        onToggleSeason={toggleSeason}
        selectedCategoryId={selectedCategoryId}
        onSegmentClick={(categoryId, _level) => toggleCategory(categoryId)}
        onEdit={() => setMetadataDialogOpen(true)}
        onDescriptionChange={handleDescriptionChange}
      />

      {/* Metadata Edit Dialog (US5) */}
      <LoadoutMetadataDialog
        loadout={loadout}
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        onSave={handleMetadataSave}
      />

      {/* Two-Column Layout - FR-001, FR-002, FR-003 */}
      <div className="container max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* Sort/Filter Controls (shared across both panels) */}
        <div className="mb-4 hidden md:block">
          <LoadoutSortFilter
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterCategoryId={sortFilterCategoryId}
            onFilterChange={setSortFilterCategoryId}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
          {/* Left: Item Picker (hidden on mobile, shown in sheet) - FR-002 */}
          <div className="hidden space-y-4 md:block">
            <h2 className="text-lg font-semibold">Add from Inventory</h2>
            <LoadoutPicker
              items={sortedFilteredPickerItems}
              loadoutItemIds={loadout.itemIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddItem={handleAddItem}
            />
          </div>

          {/* Right: Loadout List with sticky positioning - FR-003, FR-009 (header buffer) */}
          <div className="space-y-4 md:sticky md:top-28 md:self-start">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Loadout Items</h2>
              <div className="flex items-center gap-2">
                {selectedCategoryId && (
                  <button
                    onClick={clearFilter}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear filter
                  </button>
                )}
                <LoadoutExportMenu
                  loadout={loadout}
                  items={loadoutItems}
                  itemStates={itemStates}
                  activityTypes={activityTypes}
                  seasons={seasons}
                  totalWeight={totalWeight}
                  baseWeight={baseWeight}
                />
              </div>
            </div>
            <LoadoutList
              items={sortedFilteredLoadoutItems}
              onRemoveItem={removeItem}
              filterCategoryId={selectedCategoryId}
              sortBy={sortBy}
              isWorn={isWorn}
              isConsumable={isConsumable}
              onToggleWorn={toggleWorn}
              onToggleConsumable={toggleConsumable}
              onItemClick={handleGearClick}
              getLighterAlternative={getLighterAlternative}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Add Items Button - FR-004, FR-005 */}
      <div className="fixed bottom-20 left-0 right-0 p-4 md:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Items
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Add from Inventory</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <LoadoutSortFilter
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterCategoryId={sortFilterCategoryId}
                onFilterChange={setSortFilterCategoryId}
              />
              <div className="h-[calc(85vh-12rem)] overflow-y-auto pb-8">
                <LoadoutPicker
                  items={sortedFilteredPickerItems}
                  loadoutItemIds={loadout.itemIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onAddItem={handleAddItem}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Sticky Weight Bar */}
      <WeightBar totalWeight={totalWeight} itemCount={loadoutItems.length} />

      {/* Dependency Prompt Dialog (Feature: 037-gear-dependencies) */}
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

      {/* Feature 045: Gear Detail Modal */}
      <GearDetailModal
        open={gearModalOpen}
        onOpenChange={setGearModalOpen}
        item={selectedGearItem}
        isMobile={isMobile}
      />
    </div>
  );
}
