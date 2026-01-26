/**
 * Price History Chart Component
 * Feature: 050-price-tracking
 *
 * Displays price history over time using a line chart.
 * Shows min, max, and average price trends.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriceHistoryEntry } from '@/types/price-tracking';

interface PriceHistoryChartProps {
  history: PriceHistoryEntry[];
  isLoading?: boolean;
  error?: string | null;
  currency?: string;
  className?: string;
}

export function PriceHistoryChart({
  history,
  isLoading = false,
  error = null,
  currency = 'USD',
  className,
}: PriceHistoryChartProps) {
  const t = useTranslations('PriceHistory');

  // Format data for recharts
  const chartData = useMemo(() => {
    return history.map((entry) => ({
      date: new Date(entry.recorded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      lowest: entry.lowest_price,
      average: entry.average_price,
      highest: entry.highest_price,
      sources: entry.num_sources,
    }));
  }, [history]);

  // Calculate trend
  const trend = useMemo(() => {
    if (history.length < 2) return 'stable';
    const first = history[0].average_price;
    const last = history[history.length - 1].average_price;
    // Guard against division by zero and invalid values
    if (!Number.isFinite(first) || first <= 0) return 'stable';
    if (!Number.isFinite(last)) return 'stable';
    const change = ((last - first) / first) * 100;
    if (change < -5) return 'down';
    if (change > 5) return 'up';
    return 'stable';
  }, [history]);

  // Calculate stats
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const allLowest = Math.min(...history.map((h) => h.lowest_price));
    const allHighest = Math.max(...history.map((h) => h.highest_price));
    const currentAvg = history[history.length - 1]?.average_price ?? 0;
    return { lowest: allLowest, highest: allHighest, current: currentAvg };
  }, [history]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('noHistory')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend === 'down' && 'text-green-600',
            trend === 'up' && 'text-red-600',
            trend === 'stable' && 'text-muted-foreground'
          )}>
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'stable' && <Minus className="h-3 w-3" />}
            {trend === 'down' && t('trend.dropping')}
            {trend === 'up' && t('trend.rising')}
            {trend === 'stable' && t('trend.stable')}
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <span>
              {t('stats.low')}: <span className="font-medium text-green-600">{formatCurrency(stats.lowest)}</span>
            </span>
            <span>
              {t('stats.avg')}: <span className="font-medium">{formatCurrency(stats.current)}</span>
            </span>
            <span>
              {t('stats.high')}: <span className="font-medium text-red-600">{formatCurrency(stats.highest)}</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
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
        </div>
      </CardContent>
    </Card>
  );
}
