/**
 * CollaborativeCursor Component
 *
 * Feature: Shakedown Detail Enhancement - Live Collaboration Cursors
 *
 * Displays a colored ring around items that other users are focused on.
 * Also shows attention requests with pulsing animation.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';

import type { PresenceUser, AttentionRequest } from '@/hooks/shakedowns/useCollaborativePresence';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Types
// =============================================================================

interface CollaborativeCursorProps {
  /** Users focused on this item */
  focusedUsers: PresenceUser[];
  /** Whether there's an attention request for this item */
  hasAttentionRequest: boolean;
  /** Additional className for the wrapper */
  className?: string;
  /** Children to wrap */
  children: React.ReactNode;
}

interface AttentionRequestButtonProps {
  /** Callback to request attention */
  onRequestAttention: () => void;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Additional className */
  className?: string;
}

interface AttentionNotificationProps {
  /** The attention request */
  request: AttentionRequest;
  /** Callback to dismiss */
  onDismiss: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getCursorColor(hue: number): string {
  return `hsl(${hue}, 70%, 50%)`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// CollaborativeCursor Component
// =============================================================================

export function CollaborativeCursor({
  focusedUsers,
  hasAttentionRequest,
  className,
  children,
}: CollaborativeCursorProps): React.ReactElement {
  const t = useTranslations('Shakedowns.presence');

  if (focusedUsers.length === 0 && !hasAttentionRequest) {
    return <>{children}</>;
  }

  // Get the primary user's color for the ring
  const primaryUser = focusedUsers[0];
  const ringColor = primaryUser ? getCursorColor(primaryUser.color) : undefined;

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative',
          hasAttentionRequest && 'animate-pulse',
          className
        )}
      >
        {/* Ring indicator */}
        {focusedUsers.length > 0 && (
          <div
            className="absolute inset-0 rounded-lg ring-2 ring-offset-2 ring-offset-background pointer-events-none z-10"
            style={{ '--tw-ring-color': ringColor } as React.CSSProperties}
          />
        )}

        {/* Attention request pulse */}
        {hasAttentionRequest && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-amber-500 animate-ping pointer-events-none z-10" />
        )}

        {/* Children */}
        {children}

        {/* User avatars positioned at corner */}
        {focusedUsers.length > 0 && (
          <div className="absolute -top-2 -left-2 z-20">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  {focusedUsers.slice(0, 3).map((user, index) => (
                    <Avatar
                      key={user.id}
                      className={cn(
                        'size-6 ring-2 ring-background',
                        index > 0 && '-ml-2'
                      )}
                      style={{
                        boxShadow: `0 0 0 2px ${getCursorColor(user.color)}`,
                      }}
                    >
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="text-[8px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {focusedUsers.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="size-6 rounded-full flex items-center justify-center p-0 -ml-2 text-[10px]"
                    >
                      +{focusedUsers.length - 3}
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('focusedOn')}</p>
                  {focusedUsers.map((user) => (
                    <p key={user.id} className="text-sm font-medium">{user.name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// AttentionRequestButton Component
// =============================================================================

export function AttentionRequestButton({
  onRequestAttention,
  size = 'sm',
  className,
}: AttentionRequestButtonProps): React.ReactElement {
  const t = useTranslations('Shakedowns.presence');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          onClick={onRequestAttention}
          className={cn('gap-1', className)}
        >
          <Bell className={size === 'sm' ? 'size-3' : 'size-4'} />
          {size === 'default' && <span>{t('requestAttention')}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('requestAttentionTooltip')}</TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// AttentionNotification Component
// =============================================================================

export function AttentionNotification({
  request,
  onDismiss,
}: AttentionNotificationProps): React.ReactElement {
  const t = useTranslations('Shakedowns.presence');
  const [isVisible, setIsVisible] = useState(true);

  // Use ref to access latest onDismiss without triggering effect re-runs
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Auto-dismiss after animation - only run once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismissRef.current();
    }, 5000);

    return () => clearTimeout(timer);
  }, []); // Empty deps - use ref to access callback

  if (!isVisible) return <></>;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'animate-in slide-in-from-right-full duration-300',
        'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800',
        'rounded-lg p-4 shadow-lg max-w-sm'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          className="size-10"
          style={{
            boxShadow: `0 0 0 2px ${getCursorColor(request.user.color)}`,
          }}
        >
          {request.user.avatar ? (
            <AvatarImage src={request.user.avatar} alt={request.user.name} />
          ) : null}
          <AvatarFallback>{getInitials(request.user.name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{request.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {t('requestedAttention')}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
        >
          {t('dismiss')}
        </Button>
      </div>
    </div>
  );
}

export default CollaborativeCursor;
