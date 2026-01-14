/**
 * EnhancedWeightDonut Component
 *
 * Feature: loadout-ux-enhancements
 * - Larger donut chart with drill-down interaction
 * - Category level (default) → click to see subcategory breakdown
 * - Animated transitions between levels
 * - Tooltip showing item name and weight on hover
 * - Legend with category/subcategory names and weights
 */

'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/lib/loadout-utils';
import { useCategories } from '@/hooks/useCategories';
import { getLocalizedLabel, getParentCategoryIds } from '@/lib/utils/category-helpers';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

/** Base chart data type with index signature for Recharts compatibility */
interface ChartDataBase {
  id: string;
  label: string;
  weight: number;
  itemCount: number;
  percentage: number;
  color: string;
  [key: string]: unknown; // Index signature for Recharts
}

interface CategoryData extends ChartDataBase {
  /** Subcategories for drill-down */
  subcategories?: SubcategoryData[];
}

interface SubcategoryData {
  id: string;
  label: string;
  weight: number;
  itemCount: number;
  percentage: number;
  parentId: string;
  [key: string]: unknown; // Index signature for Recharts
}

interface EnhancedWeightDonutProps {
  items: GearItem[];
  /** Callback when a category/subcategory is clicked for filtering */
  onSegmentClick?: (categoryId: string, level: 'category' | 'subcategory') => void;
  /** Currently selected segment for highlighting */
  selectedId?: string | null;
  /** Chart size in pixels */
  size?: number;
}

// =============================================================================
// Chart Colors - Extended palette for more categories
// =============================================================================

const CHART_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#dc2626', // Red
  '#ca8a04', // Yellow/Gold
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#be185d', // Pink
  '#4f46e5', // Indigo
  '#059669', // Emerald
];

// =============================================================================
// Chart Sizing Constants
// =============================================================================

/** Outer radius as fraction of chart size */
const OUTER_RADIUS_RATIO = 0.38;
/** Inner radius as fraction of chart size (creates donut hole) */
const INNER_RADIUS_RATIO = 0.22;

// =============================================================================
// Custom Tooltip
// =============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryData | SubcategoryData }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  const t = useTranslations('Loadouts');
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="font-medium">{data.label}</p>
      <p className="text-sm text-muted-foreground">
        {formatWeight(data.weight)} ({data.percentage.toFixed(1)}%)
      </p>
      <p className="text-xs text-muted-foreground">
        {t('itemCount', { count: data.itemCount })}
      </p>
    </div>
  );
}

// =============================================================================
// Component - Memoized to prevent unnecessary re-renders
// Recharts is expensive to re-render, so we memoize this component
// =============================================================================

export const EnhancedWeightDonut = memo(function EnhancedWeightDonut({
  items,
  onSegmentClick,
  selectedId,
  size = 300,
}: EnhancedWeightDonutProps) {
  const { categories } = useCategories();
  const locale = useLocale();
  const t = useTranslations('Loadouts');

  // Drill-down state
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(null);

  // Calculate category data with subcategories
  const categoryData = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0);
    if (totalWeight === 0) return [];

    // Group by category
    const categoryMap = new Map<string, {
      weight: number;
      items: GearItem[];
      subcategories: Map<string, { weight: number; items: GearItem[] }>;
    }>();

    for (const item of items) {
      const { categoryId, subcategoryId } = getParentCategoryIds(item.productTypeId, categories);
      const catId = categoryId ?? 'miscellaneous';
      const subId = subcategoryId ?? 'other';

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { weight: 0, items: [], subcategories: new Map() });
      }

      const catData = categoryMap.get(catId)!;
      catData.weight += item.weightGrams ?? 0;
      catData.items.push(item);

      if (!catData.subcategories.has(subId)) {
        catData.subcategories.set(subId, { weight: 0, items: [] });
      }
      const subData = catData.subcategories.get(subId)!;
      subData.weight += item.weightGrams ?? 0;
      subData.items.push(item);
    }

    // Convert to array with labels
    const result: CategoryData[] = [];
    let colorIndex = 0;

    for (const [catId, catData] of categoryMap) {
      const category = categories.find(c => c.id === catId);
      const label = category ? getLocalizedLabel(category, locale) : t('miscellaneous');
      const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

      // Build subcategories
      const subcategories: SubcategoryData[] = [];
      for (const [subId, subData] of catData.subcategories) {
        const subcategory = categories.find(c => c.id === subId);
        const subLabel = subcategory ? getLocalizedLabel(subcategory, locale) : t('other');
        subcategories.push({
          id: subId,
          label: subLabel,
          weight: subData.weight,
          itemCount: subData.items.length,
          percentage: catData.weight > 0 ? (subData.weight / catData.weight) * 100 : 0,
          parentId: catId,
        });
      }

      // Sort subcategories by weight descending
      subcategories.sort((a, b) => b.weight - a.weight);

      result.push({
        id: catId,
        label,
        weight: catData.weight,
        itemCount: catData.items.length,
        percentage: (catData.weight / totalWeight) * 100,
        color,
        subcategories,
      });

      colorIndex++;
    }

    // Sort by weight descending
    return result.sort((a, b) => b.weight - a.weight);
  }, [items, categories, locale, t]);

  // Get current view data (category or subcategory level)
  const currentData = useMemo(() => {
    if (!drillDownCategoryId) {
      return categoryData;
    }

    const parentCategory = categoryData.find(c => c.id === drillDownCategoryId);
    if (!parentCategory?.subcategories) return categoryData;

    // Assign colors to subcategories
    return parentCategory.subcategories.map((sub, index) => ({
      ...sub,
      color: CHART_COLORS[index % CHART_COLORS.length],
      // Recalculate percentage relative to parent
      percentage: parentCategory.weight > 0 ? (sub.weight / parentCategory.weight) * 100 : 0,
    }));
  }, [categoryData, drillDownCategoryId]);

  // Total weight
  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0),
    [items]
  );

  // Handlers
  const handlePieClick = useCallback((data: CategoryData | SubcategoryData) => {
    // Type guard to check if this is CategoryData with subcategories
    const hasSubcategories = !drillDownCategoryId &&
      'subcategories' in data &&
      Array.isArray(data.subcategories) &&
      data.subcategories.length > 0;

    if (hasSubcategories) {
      // Drill down into category
      setDrillDownCategoryId(data.id);
    } else {
      // Notify parent of selection
      const level = drillDownCategoryId ? 'subcategory' : 'category';
      onSegmentClick?.(data.id, level);
    }
  }, [drillDownCategoryId, onSegmentClick]);

  const handleBackClick = useCallback(() => {
    setDrillDownCategoryId(null);
  }, []);

  // Chart dimensions
  const outerRadius = size * OUTER_RADIUS_RATIO;
  const innerRadius = size * INNER_RADIUS_RATIO;

  // Get parent category label for breadcrumb
  const parentCategoryLabel = drillDownCategoryId
    ? categoryData.find(c => c.id === drillDownCategoryId)?.label
    : null;

  // Empty state
  if (items.length === 0 || totalWeight === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <span className="text-sm">{t('noData')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Back button when drilled down */}
      {drillDownCategoryId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="self-start"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {parentCategoryLabel}
        </Button>
      )}

      {/* Donut Chart */}
      <div
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Weight distribution chart showing ${currentData.length} categories. Use the legend below for details.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={currentData}
              dataKey="weight"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              paddingAngle={2}
              onClick={(_, index) => handlePieClick(currentData[index])}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {currentData.map((entry, _index) => {
                const isSelected = selectedId === entry.id;
                const isOtherSelected = selectedId && !isSelected;

                return (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={entry.color}
                    opacity={isOtherSelected ? 0.3 : 1}
                    stroke={isSelected ? 'hsl(var(--foreground))' : 'transparent'}
                    strokeWidth={isSelected ? 2 : 0}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full max-w-sm space-y-1" role="list" aria-label="Weight breakdown by category">
        {currentData.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePieClick(item)}
            aria-label={`${item.label}: ${formatWeight(item.weight)} (${item.percentage.toFixed(1)}%). Click to ${drillDownCategoryId ? 'filter' : 'view subcategories'}`}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
              'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selectedId === item.id && 'bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-left">{item.label}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{formatWeight(item.weight)}</span>
              <span className="w-12 text-right text-xs">{item.percentage.toFixed(1)}%</span>
            </div>
          </button>
        ))}
      </div>

      {/* Hint for drill-down */}
      {!drillDownCategoryId && categoryData.some(c => c.subcategories && c.subcategories.length > 1) && (
        <p className="text-center text-xs text-muted-foreground">
          {t('clickToDrillDown')}
        </p>
      )}
    </div>
  );
});
