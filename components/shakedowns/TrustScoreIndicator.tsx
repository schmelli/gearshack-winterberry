/**
 * TrustScoreIndicator Component
 *
 * Feature: Shakedown Detail Enhancement - Expert Trust Score System
 *
 * Displays a trust score (1-100) as a compact visual indicator.
 * Shows score with color-coded ring and tooltip with details.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Types
// =============================================================================

interface TrustScoreIndicatorProps {
  /** Trust score (1-100) */
  score: number;
  /** Number of helpful votes received */
  helpfulVotes?: number;
  /** Number of shakedowns reviewed */
  shakedownsReviewed?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show numeric score */
  showScore?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Trust Score Tiers
// =============================================================================

interface TrustTier {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Shield;
}

function getTrustTier(score: number): TrustTier {
  if (score >= 80) {
    return {
      label: 'expert',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      borderColor: 'border-amber-300 dark:border-amber-700',
      icon: ShieldCheck,
    };
  } else if (score >= 50) {
    return {
      label: 'trusted',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      icon: ShieldCheck,
    };
  } else if (score >= 25) {
    return {
      label: 'established',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
      icon: Shield,
    };
  } else {
    return {
      label: 'newcomer',
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      borderColor: 'border-slate-300 dark:border-slate-600',
      icon: Shield,
    };
  }
}

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CONFIG = {
  sm: {
    iconSize: 12,
    badgeClass: 'px-1.5 py-0.5 text-[10px]',
    ringSize: 'size-4',
  },
  md: {
    iconSize: 14,
    badgeClass: 'px-2 py-0.5 text-xs',
    ringSize: 'size-5',
  },
  lg: {
    iconSize: 16,
    badgeClass: 'px-2.5 py-1 text-sm',
    ringSize: 'size-6',
  },
};

// =============================================================================
// Component
// =============================================================================

export function TrustScoreIndicator({
  score,
  helpfulVotes,
  shakedownsReviewed,
  size = 'md',
  showScore = true,
  className,
}: TrustScoreIndicatorProps): React.ReactElement {
  const t = useTranslations('Shakedowns.trustScore');

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = useMemo(() => getTrustTier(normalizedScore), [normalizedScore]);
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = tier.icon;

  // Calculate ring progress (for potential SVG ring display)
  const ringProgress = (normalizedScore / 100) * 100;

  const indicator = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        tier.bgColor,
        tier.borderColor,
        tier.color,
        sizeConfig.badgeClass,
        className
      )}
    >
      <Icon size={sizeConfig.iconSize} className="shrink-0" aria-hidden="true" />
      {showScore && <span>{normalizedScore}</span>}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{indicator}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">{t(`tiers.${tier.label}`)}</p>
            <span className="text-lg font-bold">{normalizedScore}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', tier.color.replace('text-', 'bg-'))}
              style={{ width: `${ringProgress}%` }}
            />
          </div>

          {/* Stats */}
          {(helpfulVotes !== undefined || shakedownsReviewed !== undefined) && (
            <div className="pt-1 text-xs text-muted-foreground space-y-0.5">
              {helpfulVotes !== undefined && (
                <p>{t('helpfulVotes', { count: helpfulVotes })}</p>
              )}
              {shakedownsReviewed !== undefined && (
                <p>{t('shakedownsReviewed', { count: shakedownsReviewed })}</p>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/70">{t('description')}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default TrustScoreIndicator;
