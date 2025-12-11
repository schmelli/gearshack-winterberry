/**
 * Gear Insights Section Component
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T054-T058
 *
 * Displays GearGraph insights as styled badges with type-specific styling.
 */

'use client';

import { Lightbulb, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { GearInsight, InsightType } from '@/types/geargraph';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface GearInsightsSectionProps {
  /** Array of gear insights (null = loading) */
  insights: GearInsight[] | null;
  /** Whether insights are loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Insight Type Styling
// =============================================================================

const INSIGHT_TYPE_STYLES: Record<InsightType, { bg: string; text: string; icon?: string }> = {
  seasonality: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-200',
  },
  weight_class: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-200',
  },
  compatibility: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
  },
  category: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-200',
  },
  use_case: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-200',
  },
};

// =============================================================================
// Component
// =============================================================================

export function GearInsightsSection({
  insights,
  isLoading,
  error,
  className,
}: GearInsightsSectionProps) {
  // T056: Loading skeleton state
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  // T058: Error state message
  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <AlertCircle className="h-4 w-4" />
        <span>Insights temporarily unavailable</span>
      </div>
    );
  }

  // T057: Empty state message
  if (!insights || insights.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Lightbulb className="h-4 w-4" />
        <span>Insights not yet available for this product</span>
      </div>
    );
  }

  // T054, T055: Display insights as styled badges
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {insights.map((insight, index) => (
        <InsightBadge key={`${insight.type}-${index}`} insight={insight} />
      ))}
    </div>
  );
}

// =============================================================================
// Insight Badge Sub-Component
// =============================================================================

interface InsightBadgeProps {
  insight: GearInsight;
}

function InsightBadge({ insight }: InsightBadgeProps) {
  const style = INSIGHT_TYPE_STYLES[insight.type] || INSIGHT_TYPE_STYLES.category;

  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0 font-normal',
        style.bg,
        style.text
      )}
      title={insight.confidence ? `Confidence: ${Math.round(insight.confidence * 100)}%` : undefined}
    >
      {insight.label}
    </Badge>
  );
}

export default GearInsightsSection;
