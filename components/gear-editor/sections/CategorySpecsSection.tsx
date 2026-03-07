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
import { useTranslations } from 'next-intl';
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

// =============================================================================
// Component
// =============================================================================

export function CategorySpecsSection() {
  const t = useTranslations('GearEditor');
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
      return t('weightSearch.rateLimited');
    }
    if (!searchQuery || searchQuery.length < 3) {
      return t('weightSearch.enterBrandName');
    }
    if (weightSearch.rateLimit && !weightSearch.rateLimit.isUnlimited) {
      return t('weightSearch.searchForWithLimit', {
        query: searchQuery,
        remaining: weightSearch.rateLimit.remaining,
        limit: weightSearch.rateLimit.limit,
      });
    }
    return t('weightSearch.searchFor', { query: searchQuery });
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
          {t('classification.title')}
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-muted-foreground text-sm">
            {t('classification.description')}
          </p>

          {/* Progressive category selection - now ONE dropdown instead of three */}
          <FormField
            control={form.control}
            name="productTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('classification.productTypeLabel')} *</FormLabel>
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
          {t('weightSpecsTitle')}
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-2">

        {/* Weight with Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Weight Value with Search Button */}
          <FormField
            control={form.control}
            name="weightValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('weightLabel')}</FormLabel>
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
                <FormLabel>{t('categorySpecs.unitLabel')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('categorySpecs.unitPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {weightUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {t(`weightUnits.${unit === 'g' ? 'grams' : unit === 'oz' ? 'ounces' : 'pounds'}`)}
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
          {t('weightDescription')}
        </FormDescription>

        {/* Category-Specific Specifications - Conditional rendering based on category (Issue #89) */}
        {(fields.showSize || fields.showColor) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Size (for clothing, footwear) */}
            {fields.showSize && (
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('categorySpecs.sizeLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('categorySpecs.sizePlaceholder')} {...field} />
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
                    <FormLabel>{t('categorySpecs.colorLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('categorySpecs.colorPlaceholder')} {...field} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Volume (for packs, bags) */}
            {fields.showVolume && (
              <FormField
                control={form.control}
                name="volumeLiters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('categorySpecs.volumeLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={t('categorySpecs.volumePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('categorySpecs.volumeDescription')}</FormDescription>
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
                    <FormLabel>{t('categorySpecs.tentConstructionLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('categorySpecs.tentConstructionPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="freestanding">{t('categorySpecs.tentTypes.freestanding')}</SelectItem>
                        <SelectItem value="semi-freestanding">{t('categorySpecs.tentTypes.semiFreestanding')}</SelectItem>
                        <SelectItem value="non-freestanding">{t('categorySpecs.tentTypes.nonFreestanding')}</SelectItem>
                        <SelectItem value="tunnel">{t('categorySpecs.tentTypes.tunnel')}</SelectItem>
                        <SelectItem value="dome">{t('categorySpecs.tentTypes.dome')}</SelectItem>
                        <SelectItem value="pyramid">{t('categorySpecs.tentTypes.pyramid')}</SelectItem>
                        <SelectItem value="tarp">{t('categorySpecs.tentTypes.tarp')}</SelectItem>
                        <SelectItem value="a-frame">{t('categorySpecs.tentTypes.aFrame')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('categorySpecs.tentConstructionDescription')}</FormDescription>
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
                <FormLabel>{t('categorySpecs.materialsLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('categorySpecs.materialsPlaceholder')}
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('categorySpecs.materialsDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dimensions */}
        {fields.showDimensions && (
          <div className="space-y-2">
            <FormLabel className="text-base">{t('dimensions.title')}</FormLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Length */}
              <FormField
                control={form.control}
                name="lengthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      {t('dimensions.length')}
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
                      {t('dimensions.width')}
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
                      {t('dimensions.height')}
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
