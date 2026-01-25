/**
 * WeightDonut Component
 *
 * Feature: 006-ui-makeover
 * FR-011: Display tooltips on chart segment hover showing category name and weight
 * FR-012: Filter loadout list when user clicks a chart segment
 * FR-013: Display total weight in the center of the donut
 * FR-014: Use explicit theme colors for chart segments (no random colors)
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import type { CategoryWeight } from '@/types/loadout';
import { formatWeight } from '@/lib/loadout-utils';
import { cn } from '@/lib/utils';

// =============================================================================
// Chart Data Type (for recharts compatibility)
// =============================================================================

interface ChartDataPoint {
  categoryId: string;
  categoryLabel: string;
  totalWeightGrams: number;
  itemCount: number;
  percentage: number;
  [key: string]: string | number;
}

// =============================================================================
// Chart Colors - FR-014: Explicit theme colors (chart-1 through chart-5)
// =============================================================================

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

// =============================================================================
// Types
// =============================================================================

interface WeightDonutProps {
  categoryWeights: CategoryWeight[];
  size?: 'small' | 'large';
  /** Callback when a segment is clicked (FR-012) */
  onSegmentClick?: (categoryId: string) => void;
  /** Currently selected category ID for highlighting */
  selectedCategoryId?: string | null;
  /** Whether to show total weight in center (FR-013) */
  showCenterLabel?: boolean;
}

// =============================================================================
// Custom Tooltip - FR-011
// =============================================================================

interface TooltipPayload {
  name: string;
  value: number;
  payload: CategoryWeight;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const t = useTranslations('Loadouts');
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="font-medium">{data.categoryLabel}</p>
      <p className="text-sm text-muted-foreground">
        {formatWeight(data.totalWeightGrams)} ({data.percentage.toFixed(1)}%)
      </p>
      <p className="text-xs text-muted-foreground">
        {t('itemCount', { count: data.itemCount })}
      </p>
    </div>
  );
}

// =============================================================================
// Custom Center Label - FR-013
// =============================================================================

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number };
  totalWeight: number;
}

function CenterLabel({ viewBox, totalWeight }: CenterLabelProps) {
  const t = useTranslations('Loadouts');
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;

  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan
        x={cx}
        dy="-0.3em"
        className="fill-foreground text-xl font-bold"
      >
        {formatWeight(totalWeight).replace(' g', '')}
      </tspan>
      <tspan
        x={cx}
        dy="1.4em"
        className="fill-muted-foreground text-xs"
      >
        {t('weightDonut.grams')}
      </tspan>
    </text>
  );
}

// =============================================================================
// Component - Memoized to prevent unnecessary re-renders
// Recharts is expensive to re-render, so we memoize this component
// =============================================================================

export const WeightDonut = memo(function WeightDonut({
  categoryWeights,
  size = 'large',
  onSegmentClick,
  selectedCategoryId,
  showCenterLabel = true,
}: WeightDonutProps) {
  const isSmall = size === 'small';
  const outerRadius = isSmall ? 40 : 80;
  const innerRadius = isSmall ? 25 : 50;
  const width = isSmall ? 100 : 200;
  const height = isSmall ? 100 : 200;

  // Calculate total weight for center label
  const totalWeight = categoryWeights.reduce(
    (sum, cw) => sum + cw.totalWeightGrams,
    0
  );

  const t = useTranslations('Loadouts');

  // Handle empty state
  if (categoryWeights.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ width, height }}
      >
        <span className="text-sm">{t('noData')}</span>
      </div>
    );
  }

  // Convert to chart data format
  const chartData: ChartDataPoint[] = categoryWeights.map((cw) => ({
    ...cw,
  }));

  return (
    <div style={{ width, height }} className={cn(onSegmentClick && 'cursor-pointer')}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="totalWeightGrams"
            nameKey="categoryLabel"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => {
              const isSelected = selectedCategoryId === entry.categoryId;
              const isOtherSelected = selectedCategoryId && !isSelected;

              return (
                <Cell
                  key={`cell-${entry.categoryId}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={isOtherSelected ? 0.3 : 1}
                  stroke={isSelected ? 'hsl(var(--foreground))' : 'transparent'}
                  strokeWidth={isSelected ? 2 : 0}
                  style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                  onClick={() => onSegmentClick?.(entry.categoryId)}
                />
              );
            })}
            {/* Center label showing total weight - FR-013 */}
            {!isSmall && showCenterLabel && (
              <Label
                content={<CenterLabel totalWeight={totalWeight} />}
                position="center"
              />
            )}
          </Pie>
          {!isSmall && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
