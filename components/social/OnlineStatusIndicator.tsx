/**
 * OnlineStatusIndicator Component
 *
 * Feature: 001-social-graph
 * Task: T045
 *
 * Displays online/away/offline status as a colored dot.
 * Optionally shows last active time for offline users.
 *
 * Variants:
 * - 'dot': Simple colored dot indicator
 * - 'badge': Dot with text label
 * - 'full': Badge with last active time
 */

'use client';

import { cn } from '@/lib/utils';
import { useOnlineStatus, getStatusInfo, formatLastActive } from '@/hooks/social/useOnlineStatus';
import { useTranslations } from 'next-intl';
import type { OnlineStatus } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface OnlineStatusIndicatorProps {
  /** User ID to check status for (if not provided, uses current user) */
  userId?: string;
  /** Override status (useful when you already have the status) */
  status?: OnlineStatus;
  /** Override last active time */
  lastActive?: string | null;
  /** Display variant */
  variant?: 'dot' | 'badge' | 'full';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Show "updating..." when realtime is disconnected */
  showUpdating?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Size Classes
// =============================================================================

const DOT_SIZES = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
} as const;

const TEXT_SIZES = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
} as const;

// =============================================================================
// Status Dot Component
// =============================================================================

interface StatusDotProps {
  status: OnlineStatus;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

function StatusDot({ status, size, className }: StatusDotProps) {
  const info = getStatusInfo(status);

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        DOT_SIZES[size],
        info.dotClass,
        // Animate online status
        status === 'online' && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OnlineStatusIndicator({
  userId,
  status: overrideStatus,
  lastActive: overrideLastActive,
  variant = 'dot',
  size = 'md',
  showLabel = false,
  showUpdating = true,
  className,
}: OnlineStatusIndicatorProps) {
  const t = useTranslations('Social');
  const { isUserOnline, getUserLastActive, isRealtimeConnected } = useOnlineStatus();

  // Determine status
  let status: OnlineStatus;
  let lastActive: string | null;

  if (overrideStatus !== undefined) {
    status = overrideStatus;
    lastActive = overrideLastActive ?? null;
  } else if (userId) {
    status = isUserOnline(userId) ? 'online' : 'offline';
    lastActive = getUserLastActive(userId);
  } else {
    // Default to offline for unknown users
    status = 'offline';
    lastActive = null;
  }

  const info = getStatusInfo(status);

  // Handle updating state
  if (showUpdating && !isRealtimeConnected && status !== 'online') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span className={cn('inline-block rounded-full bg-gray-300 dark:bg-gray-600', DOT_SIZES[size])} />
        {(variant !== 'dot' || showLabel) && (
          <span className={cn(TEXT_SIZES[size], 'text-muted-foreground italic')}>
            {t('presence.updating')}
          </span>
        )}
      </span>
    );
  }

  // Dot variant
  if (variant === 'dot' && !showLabel) {
    return (
      <StatusDot
        status={status}
        size={size}
        className={className}
      />
    );
  }

  // Badge variant
  if (variant === 'badge' || (variant === 'dot' && showLabel)) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <StatusDot status={status} size={size} />
        <span className={cn(TEXT_SIZES[size], info.color)}>
          {t(`presence.${status}`)}
        </span>
      </span>
    );
  }

  // Full variant with last active
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <StatusDot status={status} size={size} />
      <span className={cn(TEXT_SIZES[size], info.color)}>
        {status === 'online' ? (
          t('presence.online')
        ) : status === 'away' ? (
          t('presence.away')
        ) : lastActive ? (
          t('presence.lastActive', { time: formatLastActive(lastActive) })
        ) : (
          t('presence.offline')
        )}
      </span>
    </span>
  );
}

// =============================================================================
// Avatar Overlay Component
// =============================================================================

interface AvatarStatusOverlayProps {
  /** User ID to check status for */
  userId?: string;
  /** Override status */
  status?: OnlineStatus;
  /** Position of the overlay */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

const POSITION_CLASSES = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
} as const;

/**
 * Status indicator overlay for avatars.
 * Position this inside a relative-positioned avatar container.
 */
export function AvatarStatusOverlay({
  userId,
  status: overrideStatus,
  position = 'bottom-right',
  size = 'md',
  className,
}: AvatarStatusOverlayProps) {
  const { isUserOnline } = useOnlineStatus();

  // Determine status
  const status = overrideStatus ?? (userId && isUserOnline(userId) ? 'online' : 'offline');

  // Don't show offline status by default on avatars
  if (status === 'offline') {
    return null;
  }

  const info = getStatusInfo(status);

  return (
    <span
      className={cn(
        'absolute rounded-full border-2 border-background',
        DOT_SIZES[size],
        info.dotClass,
        POSITION_CLASSES[position],
        className
      )}
      aria-label={info.label}
    />
  );
}

// =============================================================================
// Status Selector Component
// =============================================================================

interface StatusSelectorProps {
  /** Current status */
  value: OnlineStatus;
  /** Callback when status changes */
  onChange: (status: OnlineStatus) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, Eye, EyeOff, Moon, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS: { value: OnlineStatus; icon: typeof Circle }[] = [
  { value: 'online', icon: Circle },
  { value: 'away', icon: Moon },
  { value: 'invisible', icon: EyeOff },
  { value: 'offline', icon: Eye },
];

/**
 * Dropdown selector for changing user's online status.
 */
export function StatusSelector({
  value,
  onChange,
  disabled = false,
  className,
}: StatusSelectorProps) {
  const t = useTranslations('Social');
  const info = getStatusInfo(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('gap-2', className)}
        >
          <span className={cn('h-2 w-2 rounded-full', info.dotClass)} />
          <span>{t(`presence.${value}`)}</span>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_OPTIONS.map(({ value: optValue }) => {
          const optInfo = getStatusInfo(optValue);
          return (
            <DropdownMenuItem
              key={optValue}
              onClick={() => onChange(optValue)}
              className={cn(value === optValue && 'bg-muted')}
            >
              <span className={cn('h-2 w-2 rounded-full mr-2', optInfo.dotClass)} />
              <span className={optInfo.color}>{t(`presence.${optValue}`)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default OnlineStatusIndicator;
