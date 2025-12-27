/**
 * CategorySpecsSection Component
 *
 * Feature: 045-gear-editor-tabs-marketplace, Issue #89
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Combined section for Classification and Weight/Specifications.
 * - Taxonomy classification (Category → Subcategory → Product Type)
 * - Category-specific specifications (size, color, volume, materials, etc.)
 * - Weight with unit selector
 * - Dimensions (conditionally shown based on category)
 * - Collapsible sections for better UX (Issue #89)
 */

'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Search, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProgressiveCategorySelect } from '@/components/gear-editor/ProgressiveCategorySelect';
import { useWeightSearch } from '@/hooks/useWeightSearch';
import { useCategoryFields } from '@/hooks/useCategoryFields';
import type { GearItemFormData, WeightUnit } from '@/types/gear';
import { WEIGHT_UNIT_LABELS } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function CategorySpecsSection() {
  const form = useFormContext<GearItemFormData>();
  const productTypeId = useWatch({ control: form.control, name: 'productTypeId' });

  // Watch brand and name for weight search query
  const brandValue = useWatch({ control: form.control, name: 'brand' });
  const nameValue = useWatch({ control: form.control, name: 'name' });

  // Weight search hook
  const weightSearch = useWeightSearch();

  // Category-based field visibility (Issue #89)
  const fields = useCategoryFields(productTypeId);

  const weightUnits: WeightUnit[] = ['g', 'oz', 'lb'];

  // Build search query from brand + name
  const searchQuery = [brandValue, nameValue].filter(Boolean).join(' ').trim();
  const canSearchWeight = searchQuery.length >= 3 && !weightSearch.isRateLimited;

  // Build tooltip message based on rate limit status
  const getWeightSearchTooltip = (): string => {
    if (weightSearch.isRateLimited) {
      return 'Daily limit reached. Upgrade to Trailblazer for unlimited searches.';
    }
    if (!searchQuery || searchQuery.length < 3) {
      return 'Enter brand/name to search weight';
    }
    if (weightSearch.rateLimit && !weightSearch.rateLimit.isUnlimited) {
      return `Search weight for "${searchQuery}" (${weightSearch.rateLimit.remaining} of ${weightSearch.rateLimit.limit} left today)`;
    }
    return `Search weight for "${searchQuery}"`;
  };

  // Handle weight search
  const handleWeightSearch = async () => {
    if (!canSearchWeight) return;

    const result = await weightSearch.search(searchQuery);
    if (result) {
      // Populate form with found weight (always in grams)
      form.setValue('weightValue', String(result.weightGrams), { shouldDirty: true });
      form.setValue('weightDisplayUnit', 'g', { shouldDirty: true });
    }
  };

  return (
    <Accordion type="single" collapsible defaultValue="classification" className="w-full">
      {/* Classification Section */}
      <AccordionItem value="classification">
        <AccordionTrigger className="text-lg font-medium">
          Classification
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-muted-foreground text-sm">
            Classify your gear to help organize your inventory and enable better
            filtering and search.
          </p>

          {/* Progressive category selection - now ONE dropdown instead of three */}
          <FormField
            control={form.control}
            name="productTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type *</FormLabel>
                <ProgressiveCategorySelect
                  initialProductTypeId={field.value || undefined}
                  onComplete={(id) => field.onChange(id)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </AccordionContent>
      </AccordionItem>

      {/* Weight & Specifications Section */}
      <AccordionItem value="specifications">
        <AccordionTrigger className="text-lg font-medium">
          Weight & Specifications
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-2">

        {/* Weight with Unit */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Weight Value with Search Button */}
          <FormField
            control={form.control}
            name="weightValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      className="flex-1"
                      {...field}
                    />
                  </FormControl>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleWeightSearch}
                          disabled={!canSearchWeight || weightSearch.status === 'searching'}
                          className="shrink-0"
                        >
                          {weightSearch.status === 'searching' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getWeightSearchTooltip()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Weight Unit */}
          <FormField
            control={form.control}
            name="weightDisplayUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {weightUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {WEIGHT_UNIT_LABELS[unit]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormDescription className="mb-6">
          Weight is stored in grams internally for consistency.
        </FormDescription>

        {/* Category-Specific Specifications - Conditional rendering based on category (Issue #89) */}
        {(fields.showSize || fields.showColor) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Size (for clothing, footwear) */}
            {fields.showSize && (
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., M, L, 42, 10.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Color */}
            {fields.showColor && (
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blue, Red/Black" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Volume & Tent Construction row */}
        {(fields.showVolume || fields.showTentConstruction) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Volume (for packs, bags) */}
            {fields.showVolume && (
              <FormField
                control={form.control}
                name="volumeLiters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (Liters)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g., 65"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>For packs and bags</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tent Construction (for tents) */}
            {fields.showTentConstruction && (
              <FormField
                control={form.control}
                name="tentConstruction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tent Construction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="freestanding">Freestanding</SelectItem>
                        <SelectItem value="semi-freestanding">Semi-freestanding</SelectItem>
                        <SelectItem value="non-freestanding">Non-freestanding</SelectItem>
                        <SelectItem value="tunnel">Tunnel</SelectItem>
                        <SelectItem value="dome">Dome</SelectItem>
                        <SelectItem value="pyramid">Pyramid</SelectItem>
                        <SelectItem value="tarp">Tarp</SelectItem>
                        <SelectItem value="a-frame">A-Frame</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>For tents and shelters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Materials */}
        {fields.showMaterials && (
          <FormField
            control={form.control}
            name="materials"
            render={({ field }) => (
              <FormItem className="mb-6">
                <FormLabel>Materials</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Dyneema, Silnylon, Cuben Fiber, etc."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Materials and fabrics used (for tents, packs, clothing)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dimensions */}
        {fields.showDimensions && (
          <div className="space-y-2">
            <FormLabel className="text-base">Dimensions (cm)</FormLabel>
            <div className="grid grid-cols-3 gap-4">
              {/* Length */}
              <FormField
                control={form.control}
                name="lengthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      Length
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Width */}
              <FormField
                control={form.control}
                name="widthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      Width
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Height */}
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      Height
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
