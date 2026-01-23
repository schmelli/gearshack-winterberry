/**
 * PresenceAvatars Component
 *
 * Feature: Shakedown Detail Enhancement - Live Collaboration Cursors
 *
 * Displays avatars of users currently viewing the shakedown.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Eye, Users } from 'lucide-react';

import type { PresenceUser } from '@/hooks/shakedowns/useCollaborativePresence';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

interface PresenceAvatarsProps {
  /** Users currently viewing */
  viewers: PresenceUser[];
  /** Whether presence is connected */
  isConnected: boolean;
  /** Maximum avatars to show */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CONFIG = {
  sm: {
    avatar: 'size-6',
    overlap: '-ml-1.5',
    font: 'text-[10px]',
  },
  md: {
    avatar: 'size-8',
    overlap: '-ml-2',
    font: 'text-xs',
  },
  lg: {
    avatar: 'size-10',
    overlap: '-ml-2.5',
    font: 'text-sm',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCursorColor(hue: number): string {
  return `hsl(${hue}, 70%, 50%)`;
}

// =============================================================================
// Component
// =============================================================================

export function PresenceAvatars({
  viewers,
  isConnected,
  maxVisible = 5,
  size = 'md',
  className,
}: PresenceAvatarsProps): React.ReactElement {
  const t = useTranslations('Shakedowns.presence');
  const sizeConfig = SIZE_CONFIG[size];

  const activeViewers = viewers.filter((v) => v.isActive);
  const visibleViewers = activeViewers.slice(0, maxVisible);
  const hiddenCount = activeViewers.length - maxVisible;

  if (!isConnected) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Eye className="size-4 opacity-50" />
        <span className="text-xs">{t('connecting')}</span>
      </div>
    );
  }

  if (activeViewers.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Eye className="size-4" />
        <span className="text-xs">{t('onlyYou')}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        {/* Avatar stack */}
        <div className="flex items-center">
          {visibleViewers.map((viewer, index) => (
            <Tooltip key={viewer.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative',
                    index > 0 && sizeConfig.overlap
                  )}
                >
                  <Avatar
                    className={cn(
                      sizeConfig.avatar,
                      'ring-2 ring-background'
                    )}
                    style={{
                      boxShadow: `0 0 0 2px ${getCursorColor(viewer.color)}`,
                    }}
                  >
                    {viewer.avatar ? (
                      <AvatarImage src={viewer.avatar} alt={viewer.name} />
                    ) : null}
                    <AvatarFallback className={sizeConfig.font}>
                      {getInitials(viewer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Online indicator */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
                    aria-hidden="true"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{viewer.name}</p>
                  {viewer.focusedItemId && (
                    <p className="text-xs text-muted-foreground">
                      {t('viewingItem')}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Hidden count badge */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('relative', sizeConfig.overlap)}>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full',
                      sizeConfig.avatar,
                      'flex items-center justify-center p-0',
                      sizeConfig.font
                    )}
                  >
                    +{hiddenCount}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {activeViewers.slice(maxVisible).map((viewer) => (
                    <p key={viewer.id} className="text-sm">{viewer.name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Viewer count label */}
        <div className="ml-2 flex items-center gap-1 text-muted-foreground">
          <Users className="size-4" />
          <span className="text-xs">
            {t('viewerCount', { count: activeViewers.length })}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default PresenceAvatars;
