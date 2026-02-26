/**
 * ExpertBadge Component
 *
 * Feature: 001-community-shakedowns
 * Displays shakedown expertise badges with tier-based styling
 *
 * Badge Tiers:
 * - shakedown_helper (Bronze): 10+ helpful votes
 * - trail_expert (Silver): 50+ helpful votes
 * - community_legend (Gold): 100+ helpful votes
 */

'use client';

import { useTranslations } from 'next-intl';
import { Award, Mountain, Star } from 'lucide-react';

import type { ShakedownBadge } from '@/types/shakedown';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ExpertBadgeProps {
  /** The badge type to display */
  badge: ShakedownBadge;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Show tooltip with description on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Badge Configuration
// =============================================================================

interface BadgeConfig {
  icon: typeof Award;
  styles: string;
  i18nKey: 'shakedownHelper' | 'trailExpert' | 'communityLegend';
}

const BADGE_CONFIG: Record<ShakedownBadge, BadgeConfig> = {
  shakedown_helper: {
    icon: Award,
    styles: cn(
      'bg-amber-100 text-amber-800 border-amber-300',
      'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
    ),
    i18nKey: 'shakedownHelper',
  },
  trail_expert: {
    icon: Mountain,
    styles: cn(
      'bg-slate-200 text-slate-800 border-slate-400',
      'dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600'
    ),
    i18nKey: 'trailExpert',
  },
  community_legend: {
    icon: Star,
    styles: cn(
      'bg-yellow-100 text-yellow-800 border-yellow-400',
      'dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600'
    ),
    i18nKey: 'communityLegend',
  },
};

// =============================================================================
// Size Configuration
// =============================================================================

interface SizeConfig {
  iconSize: number;
  badgeClass: string;
  gapClass: string;
}

const SIZE_CONFIG: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    iconSize: 12,
    badgeClass: 'px-1.5 py-0.5 text-xs',
    gapClass: 'gap-1',
  },
  md: {
    iconSize: 14,
    badgeClass: 'px-2 py-1 text-xs',
    gapClass: 'gap-1.5',
  },
  lg: {
    iconSize: 16,
    badgeClass: 'px-3 py-1.5 text-sm',
    gapClass: 'gap-2',
  },
};

// =============================================================================
// Component
// =============================================================================

export function ExpertBadge({
  badge,
  size = 'md',
  showLabel = true,
  showTooltip = true,
  className,
}: ExpertBadgeProps) {
  const t = useTranslations('Shakedowns.badges');

  const config = BADGE_CONFIG[badge];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const label = t(config.i18nKey);
  const description = t(`${config.i18nKey}Desc`);

  const badgeElement = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-medium',
        config.styles,
        sizeConfig.badgeClass,
        sizeConfig.gapClass,
        className
      )}
    >
      <Icon
        size={sizeConfig.iconSize}
        className="shrink-0"
        aria-hidden="true"
      />
      {showLabel && <span>{label}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { BADGE_CONFIG };
