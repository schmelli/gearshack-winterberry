/**
 * GeneralInfoSection Component
 * Feature: 001-gear-item-editor, 044-intelligence-integration, 045-gear-editor-tabs
 * Task: T015, T027 | Constitution: UI components MUST be stateless
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BrandAutocompleteInput,
  type BrandSelection,
} from '@/components/gear-editor/BrandAutocompleteInput';
import { ProductAutocompleteInput } from '@/components/gear-editor/ProductAutocompleteInput';
import { SmartProductSearchButton } from '@/components/gear-editor/SmartProductSearchButton';
import { SmartProductSearchModal } from '@/components/gear-editor/SmartProductSearchModal';
import { useSmartProductSearch } from '@/hooks/useSmartProductSearch';
import type { ProductSuggestion } from '@/hooks/useProductAutocomplete';
import type { GearItem, GearItemFormData } from '@/types/gear';
import type {
  CatalogProductResult,
  ExtractedProductData,
} from '@/types/smart-search';
import {
  createItemsMap,
  validateDependencyLink,
} from '@/lib/dependency-utils';

export interface GeneralInfoSectionProps {
  /** All available gear items for the dependency picker */
  availableItems?: GearItem[];
  /** The ID of the current item being edited (to exclude from picker) */
  currentItemId?: string;
}

export function GeneralInfoSection({
  availableItems = [],
  currentItemId,
}: GeneralInfoSectionProps) {
  const form = useFormContext<GearItemFormData>();

  // Track selected brand for product filtering
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>();

  // Dependencies state
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Smart product search state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const smartSearch = useSmartProductSearch();

  // Watch brand and name for smart search query
  const watchedBrand = useWatch({ control: form.control, name: 'brand' });
  const watchedName = useWatch({ control: form.control, name: 'name' });

  // Handle brand selection
  const handleBrandSelect = useCallback((brand: BrandSelection | null) => {
    setSelectedBrandId(brand?.id);
  }, []);

  // Handle product selection - auto-fill brand from catalog data
  const handleProductSelect = useCallback(
    (product: ProductSuggestion) => {
      // Auto-fill brand when the catalog provides one.
      // Always set it (even if user already typed something) because the
      // catalog brand is the authoritative source for a selected product.
      if (product.brand) {
        form.setValue('brand', product.brand.name, { shouldDirty: true });
        setSelectedBrandId(product.brand.id);

        // Auto-fill brand URL from catalog
        if (product.brand.websiteUrl) {
          form.setValue('brandUrl', product.brand.websiteUrl, { shouldDirty: true });
        }
      }
    },
    [form]
  );

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

  // Build smart search query from brand + name
  const smartSearchQuery = [watchedBrand, watchedName].filter(Boolean).join(' ').trim();

  // Handler: Catalog result selected - populate form fields directly
  const handleCatalogSelect = useCallback(
    (result: CatalogProductResult) => {
      // Set core fields
      form.setValue('name', result.name, { shouldDirty: true });
      if (result.brand) {
        form.setValue('brand', result.brand.name, { shouldDirty: true });
        setSelectedBrandId(result.brand.id);
      }
      if (result.description) {
        form.setValue('description', result.description, { shouldDirty: true });
      }
      if (result.productTypeId) {
        form.setValue('productTypeId', result.productTypeId, { shouldDirty: true });
      }

      // Set weight if available (convert to string for form)
      if (result.weightGrams) {
        form.setValue('weightValue', String(result.weightGrams), { shouldDirty: true });
        form.setValue('weightDisplayUnit', 'g', { shouldDirty: true });
      }

      // Set price if available (convert to string for form)
      if (result.priceUsd) {
        form.setValue('pricePaid', String(result.priceUsd), { shouldDirty: true });
        form.setValue('currency', 'USD', { shouldDirty: true });
      }
    },
    [form]
  );

  // Handler: Internet extraction confirmed - populate form fields
  const handleInternetExtracted = useCallback(
    (data: ExtractedProductData) => {
      // Set name (always)
      if (data.name) {
        form.setValue('name', data.name, { shouldDirty: true });
      }

      // Set brand if extracted
      if (data.brand) {
        form.setValue('brand', data.brand, { shouldDirty: true });
      }

      // Set description if extracted and form field is empty
      if (data.description && !form.getValues('description')) {
        form.setValue('description', data.description, { shouldDirty: true });
      }

      // Set weight if extracted (convert to string, always use grams as unit)
      // Note: data.weightGrams is already converted to grams by the extractor
      if (data.weightGrams) {
        form.setValue('weightValue', String(data.weightGrams), { shouldDirty: true });
        // Map extracted unit to form's WeightUnit (form doesn't support 'kg')
        const displayUnit = data.weightUnit === 'kg' ? 'g' : (data.weightUnit ?? 'g');
        form.setValue('weightDisplayUnit', displayUnit, { shouldDirty: true });
      }

      // Set price if extracted (convert to string for form)
      if (data.priceValue) {
        form.setValue('pricePaid', String(data.priceValue), { shouldDirty: true });
        form.setValue('currency', data.currency ?? 'USD', { shouldDirty: true });
      }

      // Set product URL
      if (data.productUrl) {
        form.setValue('productUrl', data.productUrl, { shouldDirty: true });
      }

      // Set image URL (user can later process it through the image section)
      if (data.imageUrl) {
        form.setValue('primaryImageUrl', data.imageUrl, { shouldDirty: true });
      }
    },
    [form]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">General Information</h3>

      {/* Name - Required, with product autocomplete and smart search */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <ProductAutocompleteInput
            brandId={selectedBrandId}
            brandName={watchedBrand || undefined}
            onProductSelect={handleProductSelect}
          />
        </div>
        <SmartProductSearchButton
          onClick={() => setSearchModalOpen(true)}
          isSearching={smartSearch.status === 'searching'}
          isRateLimited={smartSearch.isRateLimited}
          rateLimit={smartSearch.rateLimit}
          disabled={smartSearchQuery.length < 2}
          searchQuery={smartSearchQuery}
        />
      </div>

      {/* Smart Product Search Modal */}
      <SmartProductSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        initialQuery={smartSearchQuery}
        onCatalogSelect={handleCatalogSelect}
        onInternetExtracted={handleInternetExtracted}
      />

      {/* Brand - with autocomplete */}
      <BrandAutocompleteInput onBrandSelect={handleBrandSelect} />

      {/* Product Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter product details, specifications, or notes..."
                className="min-h-[100px] resize-y"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand URL */}
      <FormField
        control={form.control}
        name="brandUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Website</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.nemoequipment.com"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Model Number */}
      <FormField
        control={form.control}
        name="modelNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Model Number</FormLabel>
            <FormControl>
              <Input placeholder="e.g., HOR2P-2021" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product URL */}
      <FormField
        control={form.control}
        name="productUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Page URL</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.nemoequipment.com/product/hornet-elite"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Dependencies Section - Linked Accessories */}
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-medium mb-2">Linked Accessories</h3>
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
                      <PopoverContent className="w-[min(350px,calc(100vw-2rem))] p-0" align="start">
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
                                <span className="max-w-[200px] truncate">
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
                Link items that should be packed with this gear.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
