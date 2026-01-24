/**
 * SmartRecommendationsCard Component
 *
 * Feature: Shakedown Detail Enhancement - Smart Trip Recommendations
 *
 * Displays AI-powered recommendations for a shakedown loadout.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Cloud,
  Copy,
  Droplet,
  Flame,
  Lightbulb,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';

import type { TripRecommendation, RecommendationSeverity } from '@/hooks/shakedowns/useTripRecommendations';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

// =============================================================================
// Types
// =============================================================================

interface SmartRecommendationsCardProps {
  /** All recommendations */
  recommendations: TripRecommendation[];
  /** Critical recommendations */
  criticalRecommendations: TripRecommendation[];
  /** Warning recommendations */
  warnings: TripRecommendation[];
  /** Info/success recommendations */
  suggestions: TripRecommendation[];
  /** Total count */
  totalCount: number;
  /** Has critical issues */
  hasCriticalIssues: boolean;
  /** Callback when recommendation is dismissed */
  onDismiss?: (recommendationId: string) => void;
  /** Callback when recommendation action is taken */
  onActionClick?: (recommendation: TripRecommendation) => void;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Icon Mapping
// =============================================================================

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle,
  Cloud,
  Copy,
  Droplet,
  Flame,
  Scale,
  Sparkles,
  Lightbulb,
};

function getIcon(iconName?: string) {
  if (!iconName) return Lightbulb;
  return ICON_MAP[iconName] || Lightbulb;
}

// =============================================================================
// Severity Styling
// =============================================================================

interface SeverityStyle {
  badge: string;
  border: string;
  background: string;
  icon: string;
}

const SEVERITY_STYLES: Record<RecommendationSeverity, SeverityStyle> = {
  critical: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    background: 'bg-red-50 dark:bg-red-900/10',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    background: 'bg-amber-50 dark:bg-amber-900/10',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    background: 'bg-blue-50 dark:bg-blue-900/10',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    background: 'bg-emerald-50 dark:bg-emerald-900/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
};

// =============================================================================
// Component
// =============================================================================

export function SmartRecommendationsCard({
  recommendations,
  criticalRecommendations,
  warnings,
  suggestions,
  totalCount,
  hasCriticalIssues,
  onDismiss,
  onActionClick,
  defaultExpanded = false,
  className,
}: SmartRecommendationsCardProps): React.ReactElement {
  const t = useTranslations('Shakedowns.recommendations');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || hasCriticalIssues);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  };

  const visibleRecommendations = recommendations.filter((r) => !dismissedIds.has(r.id));
  const visibleCount = visibleRecommendations.length;

  if (totalCount === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-500" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Check className="size-5" />
            <p className="text-sm">{t('allGood')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(hasCriticalIssues && 'border-red-200 dark:border-red-800', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-full',
                  hasCriticalIssues ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                )}>
                  {hasCriticalIssues ? (
                    <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Lightbulb className="size-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{t('title')}</CardTitle>
                  <CardDescription>
                    {t('subtitle', { count: visibleCount })}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Count badges */}
                {criticalRecommendations.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalRecommendations.length}
                  </Badge>
                )}
                {warnings.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                    {warnings.length}
                  </Badge>
                )}

                {isExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Critical Issues */}
            {criticalRecommendations.length > 0 && (
              <RecommendationSection
                title={t('sections.critical')}
                recommendations={criticalRecommendations.filter((r) => !dismissedIds.has(r.id))}
                onDismiss={handleDismiss}
                onActionClick={onActionClick}
              />
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <>
                {criticalRecommendations.length > 0 && <Separator />}
                <RecommendationSection
                  title={t('sections.warnings')}
                  recommendations={warnings.filter((r) => !dismissedIds.has(r.id))}
                  onDismiss={handleDismiss}
                  onActionClick={onActionClick}
                />
              </>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <>
                {(criticalRecommendations.length > 0 || warnings.length > 0) && <Separator />}
                <RecommendationSection
                  title={t('sections.suggestions')}
                  recommendations={suggestions.filter((r) => !dismissedIds.has(r.id))}
                  onDismiss={handleDismiss}
                  onActionClick={onActionClick}
                />
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================================================
// Section Component
// =============================================================================

interface RecommendationSectionProps {
  title: string;
  recommendations: TripRecommendation[];
  onDismiss: (id: string) => void;
  onActionClick?: (recommendation: TripRecommendation) => void;
}

function RecommendationSection({
  title,
  recommendations,
  onDismiss,
  onActionClick,
}: RecommendationSectionProps): React.ReactElement | null {
  const t = useTranslations('Shakedowns.recommendations');

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-2">
        {recommendations.map((rec) => {
          const styles = SEVERITY_STYLES[rec.severity];
          const Icon = getIcon(rec.icon);

          return (
            <div
              key={rec.id}
              className={cn(
                'relative flex items-start gap-3 p-3 rounded-lg border',
                styles.background,
                styles.border
              )}
            >
              {/* Icon */}
              <Icon className={cn('size-5 shrink-0 mt-0.5', styles.icon)} />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.description}</p>

                {/* Action button */}
                {rec.action && onActionClick && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onActionClick(rec)}
                  >
                    {rec.action}
                  </Button>
                )}
              </div>

              {/* Dismiss button */}
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 shrink-0 opacity-50 hover:opacity-100"
                onClick={() => onDismiss(rec.id)}
              >
                <X className="size-3" />
                <span className="sr-only">{t('dismiss')}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SmartRecommendationsCard;
