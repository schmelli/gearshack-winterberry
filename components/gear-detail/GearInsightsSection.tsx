/**
 * Gear Insights Section Component
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T054-T058
 *
 * Displays GearGraph insights as styled cards with feedback buttons.
 * Users can thumbs up/down insights, and dismissed insights are replaced.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Lightbulb, AlertCircle, ExternalLink, AlertTriangle, GitCompare, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { GearInsight, InsightType } from '@/types/geargraph';
import { cn, sanitizeExternalUrl } from '@/lib/utils';

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
  /** Gear context for feedback */
  gearContext?: {
    gearItemId?: string;
    brand?: string;
    name?: string;
    categoryId?: string;
  };
  /** Callback when an insight is dismissed (thumbs down) */
  onInsightDismissed?: (insight: GearInsight) => void;
}

// =============================================================================
// Insight Type Styling
// =============================================================================

const INSIGHT_TYPE_CONFIG: Record<InsightType, {
  bg: string;
  text: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  tip: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Lightbulb,
    label: 'Tip',
  },
  comparison: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-200 dark:border-purple-800',
    icon: GitCompare,
    label: 'Comparison',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    label: 'Warning',
  },
  recommendation: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-200 dark:border-green-800',
    icon: Sparkles,
    label: 'Recommendation',
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
  gearContext,
  onInsightDismissed,
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

  // T054, T055: Display insights as styled cards with feedback
  return (
    <div className={cn('space-y-3', className)}>
      {insights.map((insight, index) => (
        <InsightCard
          key={`${insight.type}-${index}`}
          insight={insight}
          gearContext={gearContext}
          onDismiss={onInsightDismissed}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Insight Card Sub-Component
// =============================================================================

interface InsightCardProps {
  insight: GearInsight;
  gearContext?: {
    gearItemId?: string;
    brand?: string;
    name?: string;
    categoryId?: string;
  };
  onDismiss?: (insight: GearInsight) => void;
}

function InsightCard({ insight, gearContext, onDismiss }: InsightCardProps) {
  const [feedbackState, setFeedbackState] = useState<'none' | 'positive' | 'negative'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, []);

  const config = INSIGHT_TYPE_CONFIG[insight.type] || INSIGHT_TYPE_CONFIG.tip;
  const Icon = config.icon;

  const submitFeedback = useCallback(async (isPositive: boolean) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/insights/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightContent: insight.content,
          isPositive,
          gearItemId: gearContext?.gearItemId,
          gearBrand: gearContext?.brand,
          gearName: gearContext?.name,
          categoryId: gearContext?.categoryId,
        }),
      });

      if (response.ok) {
        setFeedbackState(isPositive ? 'positive' : 'negative');
        // If thumbs down, dismiss the insight after a short delay
        if (!isPositive && onDismiss) {
          // Clear any existing timeout before setting a new one
          if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current);
          }
          dismissTimeoutRef.current = setTimeout(() => {
            onDismiss(insight);
            dismissTimeoutRef.current = null;
          }, 300);
        }
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [insight, gearContext, onDismiss, isSubmitting]);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-opacity duration-300',
        config.bg,
        config.border,
        feedbackState === 'negative' && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={cn('text-xs font-medium uppercase tracking-wide', config.text)}>
              {config.label}
            </p>
            {/* Feedback buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6',
                  feedbackState === 'positive' && 'text-green-600 bg-green-100'
                )}
                onClick={() => submitFeedback(true)}
                disabled={isSubmitting || feedbackState !== 'none'}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6',
                  feedbackState === 'negative' && 'text-red-600 bg-red-100'
                )}
                onClick={() => submitFeedback(false)}
                disabled={isSubmitting || feedbackState !== 'none'}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-foreground">{insight.content}</p>
          {/* SECURITY: Validate sourceUrl before rendering */}
          {sanitizeExternalUrl(insight.sourceUrl) && (
            <a
              href={sanitizeExternalUrl(insight.sourceUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 mt-2 text-xs hover:underline',
                config.text
              )}
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default GearInsightsSection;
