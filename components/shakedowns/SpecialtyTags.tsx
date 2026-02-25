/**
 * SpecialtyTags Component
 *
 * Feature: Shakedown Detail Enhancement - Expert Trust Score System
 *
 * Displays specialty tags for expert users indicating their areas of expertise.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Mountain,
  Compass,
  Snowflake,
  Sun,
  Feather,
  Backpack,
  Map,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Types
// =============================================================================

export type SpecialtyType =
  | 'pct_veteran'
  | 'at_veteran'
  | 'cdt_veteran'
  | 'ul_expert'
  | 'winter_specialist'
  | 'desert_specialist'
  | 'alpine_expert'
  | 'bikepacking'
  | 'fastpacking';

interface SpecialtyTagsProps {
  /** Array of specialty types */
  specialties: SpecialtyType[];
  /** Maximum tags to show before collapsing */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

// =============================================================================
// Specialty Configuration
// =============================================================================

interface SpecialtyConfig {
  icon: typeof Mountain;
  color: string;
  bgColor: string;
}

const SPECIALTY_CONFIG: Record<SpecialtyType, SpecialtyConfig> = {
  pct_veteran: {
    icon: Mountain,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  },
  at_veteran: {
    icon: Compass,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  },
  cdt_veteran: {
    icon: Map,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  },
  ul_expert: {
    icon: Feather,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  },
  winter_specialist: {
    icon: Snowflake,
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700',
  },
  desert_specialist: {
    icon: Sun,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  },
  alpine_expert: {
    icon: Mountain,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
  },
  bikepacking: {
    icon: Backpack,
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
  },
  fastpacking: {
    icon: Compass,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700',
  },
};

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CONFIG = {
  sm: {
    iconSize: 10,
    badgeClass: 'px-1.5 py-0 text-[10px] gap-0.5',
  },
  md: {
    iconSize: 12,
    badgeClass: 'px-2 py-0.5 text-xs gap-1',
  },
};

// =============================================================================
// Component
// =============================================================================

export function SpecialtyTags({
  specialties,
  maxVisible = 3,
  size = 'sm',
  className,
}: SpecialtyTagsProps): React.ReactElement | null {
  const t = useTranslations('Shakedowns.specialties');

  if (specialties.length === 0) {
    return null;
  }

  const sizeConfig = SIZE_CONFIG[size];
  const visibleSpecialties = specialties.slice(0, maxVisible);
  const hiddenCount = specialties.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        {visibleSpecialties.map((specialty) => {
          const config = SPECIALTY_CONFIG[specialty];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <Tooltip key={specialty}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'inline-flex items-center font-medium',
                    config.bgColor,
                    config.color,
                    sizeConfig.badgeClass
                  )}
                >
                  <Icon size={sizeConfig.iconSize} className="shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-[80px]">{t(specialty)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{t(specialty)}</p>
                <p className="text-xs text-muted-foreground">{t(`${specialty}Desc`)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn('font-medium', sizeConfig.badgeClass)}
              >
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {specialties.slice(maxVisible).map((specialty) => (
                  <p key={specialty} className="text-sm">{t(specialty)}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export default SpecialtyTags;
