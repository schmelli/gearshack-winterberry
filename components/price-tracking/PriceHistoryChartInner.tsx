/**
 * PriceHistoryChartInner - Inner Chart Component
 *
 * This component is dynamically imported to reduce bundle size.
 * Contains all recharts dependencies.
 */

'use client';

import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

interface ChartDataPoint {
  date: string;
  lowest: number;
  average: number;
  highest: number;
  sources: number;
}

interface PriceHistoryChartInnerProps {
  chartData: ChartDataPoint[];
  formatCurrency: (value: number) => string;
}

// =============================================================================
// Chart Component
// =============================================================================

export const PriceHistoryChartInner = memo(function PriceHistoryChartInner({
  chartData,
  formatCurrency,
}: PriceHistoryChartInnerProps) {
  const t = useTranslations('PriceHistory');

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => formatCurrency(value)}
          className="text-muted-foreground"
          width={60}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelClassName="font-medium"
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
        />
        <Line
          type="monotone"
          dataKey="lowest"
          name={t('legend.lowest')}
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="average"
          name={t('legend.average')}
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="highest"
          name={t('legend.highest')}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

export default PriceHistoryChartInner;
