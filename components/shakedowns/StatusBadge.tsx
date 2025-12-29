/**
 * StatusBadge Component
 *
 * Feature: 001-community-shakedowns
 * Displays shakedown status with appropriate color coding and optional tooltip
 */

'use client';

import { useTranslations } from 'next-intl';

import type { ShakedownStatus } from '@/types/shakedown';
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

interface StatusBadgeProps {
  /** The shakedown status to display */
  status: ShakedownStatus;
  /** Show description tooltip on hover */
  showDescription?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Status Color Configuration
// =============================================================================

const STATUS_STYLES: Record<ShakedownStatus, string> = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  completed:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  archived:
    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
};

// =============================================================================
// Component
// =============================================================================

export function StatusBadge({
  status,
  showDescription = false,
  className,
}: StatusBadgeProps) {
  const t = useTranslations('Shakedowns.status');

  const label = t(status);
  const description = t(`${status}Desc`);
  const styleClass = STATUS_STYLES[status];

  const badge = (
    <Badge
      variant="outline"
      className={cn(styleClass, className)}
    >
      {label}
    </Badge>
  );

  if (!showDescription) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { STATUS_STYLES };
