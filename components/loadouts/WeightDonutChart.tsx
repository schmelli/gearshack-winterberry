/**
 * WeightDonutChart - Inner Chart Component
 *
 * This component is dynamically imported to reduce bundle size.
 * Contains all recharts dependencies.
 */

'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import type { CategoryWeight } from '@/types/loadout';
import { formatWeight } from '@/lib/loadout-utils';

// =============================================================================
// Types
// =============================================================================

interface ChartDataPoint {
  categoryId: string;
  categoryLabel: string;
  totalWeightGrams: number;
  itemCount: number;
  percentage: number;
  [key: string]: string | number;
}

interface WeightDonutChartProps {
  chartData: ChartDataPoint[];
  totalWeight: number;
  outerRadius: number;
  innerRadius: number;
  width: number;
  height: number;
  isSmall: boolean;
  showCenterLabel: boolean;
  selectedCategoryId?: string | null;
  onSegmentClick?: (categoryId: string) => void;
}

// =============================================================================
// Chart Colors
// =============================================================================

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

// =============================================================================
// Custom Tooltip
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
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="font-medium">{data.categoryLabel}</p>
      <p className="text-sm text-muted-foreground">
        {formatWeight(data.totalWeightGrams)} ({data.percentage.toFixed(1)}%)
      </p>
      <p className="text-xs text-muted-foreground">
        {data.itemCount} {data.itemCount === 1 ? 'item' : 'items'}
      </p>
    </div>
  );
}

// =============================================================================
// Custom Center Label
// =============================================================================

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number };
  totalWeight: number;
}

function CenterLabel({ viewBox, totalWeight }: CenterLabelProps) {
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
        grams
      </tspan>
    </text>
  );
}

// =============================================================================
// Chart Component
// =============================================================================

export const WeightDonutChart = memo(function WeightDonutChart({
  chartData,
  totalWeight,
  outerRadius,
  innerRadius,
  width: _width,
  height: _height,
  isSmall,
  showCenterLabel,
  selectedCategoryId,
  onSegmentClick,
}: WeightDonutChartProps) {
  return (
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
  );
});

export default WeightDonutChart;
