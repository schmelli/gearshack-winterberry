/**
 * CommunityWeightBadge Component
 * Feature: community-verified-weights
 *
 * Displays a small badge indicating whether a product's weight has been
 * community-verified. Shows the verification status and report count.
 * Stateless — receives all data via props.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CommunityWeightBadgeProps {
  /** Whether the weight is community-verified (3+ reports) */
  isVerified: boolean;
  /** Number of weight reports */
  reportCount: number;
  /** Community-averaged weight in grams */
  communityWeightGrams: number | null;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CommunityWeightBadge({
  isVerified,
  reportCount,
  communityWeightGrams,
  className,
}: CommunityWeightBadgeProps) {
  const t = useTranslations('CommunityWeight');

  if (reportCount === 0) return null;

  const weightDisplay = communityWeightGrams
    ? communityWeightGrams >= 1000
      ? `${(communityWeightGrams / 1000).toFixed(2)} kg`
      : `${communityWeightGrams} g`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isVerified ? 'default' : 'secondary'}
            className={cn(
              'gap-1 cursor-default',
              isVerified
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
              className
            )}
          >
            {isVerified ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            {isVerified
              ? t('badge.verified')
              : t('badge.reportsCount', { count: reportCount })}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {isVerified
              ? t('badge.verifiedTooltip', { weight: weightDisplay ?? '--' })
              : t('badge.pendingTooltip', { count: reportCount, needed: 3 - reportCount })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('badge.reportCount', { count: reportCount })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
