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
import dynamic from 'next/dynamic';
import type { CategoryWeight } from '@/types/loadout';
import { cn } from '@/lib/utils';

// Dynamic import for chart component to reduce bundle size (recharts is heavy)
const WeightDonutChart = dynamic(
  () => import('./WeightDonutChart').then((mod) => mod.WeightDonutChart),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-full bg-muted" style={{ width: 200, height: 200 }} />
    ),
  }
);

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

  // Handle empty state
  if (categoryWeights.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ width, height }}
      >
        <span className="text-sm">No data</span>
      </div>
    );
  }

  // Convert to chart data format
  const chartData: ChartDataPoint[] = categoryWeights.map((cw) => ({
    ...cw,
  }));

  return (
    <div style={{ width, height }} className={cn(onSegmentClick && 'cursor-pointer')}>
      <WeightDonutChart
        chartData={chartData}
        totalWeight={totalWeight}
        outerRadius={outerRadius}
        innerRadius={innerRadius}
        width={width}
        height={height}
        isSmall={isSmall}
        showCenterLabel={showCenterLabel}
        selectedCategoryId={selectedCategoryId}
        onSegmentClick={onSegmentClick}
      />
    </div>
  );
});
