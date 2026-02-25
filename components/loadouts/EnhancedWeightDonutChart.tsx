/**
 * EnhancedWeightDonutChart - Inner Chart Component
 *
 * This component is dynamically imported to reduce bundle size.
 * Contains all recharts dependencies.
 */

'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { formatWeight } from '@/lib/loadout-utils';

// =============================================================================
// Types
// =============================================================================

interface ChartDataBase {
  id: string;
  label: string;
  weight: number;
  itemCount: number;
  percentage: number;
  color: string;
  [key: string]: unknown;
}

interface EnhancedWeightDonutChartProps {
  data: ChartDataBase[];
  size: number;
  outerRadius: number;
  innerRadius: number;
  selectedId?: string | null;
  onSegmentClick: (index: number) => void;
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataBase }>;
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
// Chart Component
// =============================================================================

export const EnhancedWeightDonutChart = memo(function EnhancedWeightDonutChart({
  data,
  size,
  outerRadius,
  innerRadius,
  selectedId,
  onSegmentClick,
}: EnhancedWeightDonutChartProps) {
  return (
    <div
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Weight distribution chart showing ${data.length} categories. Use the legend below for details.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="weight"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
            onClick={(_, index) => onSegmentClick(index)}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {data.map((entry) => {
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
  );
});

export default EnhancedWeightDonutChart;
