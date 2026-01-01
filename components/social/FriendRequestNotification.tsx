/**
 * FriendRequestNotification Component
 *
 * Feature: 001-social-graph
 * Tasks: T030, T032
 *
 * Displays friend request notifications in notification lists.
 * Shows sender info with accept/decline actions inline.
 *
 * Variants:
 * - 'inline': Compact for notification dropdowns
 * - 'card': Full card for notification pages
 *
 * T032: Integrates with existing notification system.
 */

'use client';

import { useState, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { UserPlus, Check, X, Loader2, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFriendRequests } from '@/hooks/social/useFriendRequests';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { FriendRequestWithProfile } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface FriendRequestNotificationProps {
  /** Friend request data */
  request: FriendRequestWithProfile;
  /** Display variant */
  variant?: 'inline' | 'card';
  /** Callback after accepting request */
  onAccept?: () => void;
  /** Callback after declining request */
  onDecline?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// Inline Variant
// =============================================================================

function InlineNotification({
  request,
  onAccept,
  onDecline,
  className,
}: FriendRequestNotificationProps) {
  const t = useTranslations('Social');
  const { acceptRequest, declineRequest } = useFriendRequests();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isHandled, setIsHandled] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    try {
      await acceptRequest(request.id);
      setIsHandled(true);
      toast.success(t('requests.accepted'));
      onAccept?.();
    } catch (err) {
      console.error('Error accepting request:', err);
      toast.error(t('requests.acceptFailed'));
    } finally {
      setIsAccepting(false);
    }
  }, [request.id, acceptRequest, t, onAccept]);

  const handleDecline = useCallback(async () => {
    setIsDeclining(true);
    try {
      await declineRequest(request.id);
      setIsHandled(true);
      toast.info(t('requests.declined'));
      onDecline?.();
    } catch (err) {
      console.error('Error declining request:', err);
      toast.error(t('requests.declineFailed'));
    } finally {
      setIsDeclining(false);
    }
  }, [request.id, declineRequest, t, onDecline]);

  if (isHandled) {
    return null;
  }

  const sender = request.sender;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50',
        className
      )}
    >
      {/* Avatar */}
      <Link href={`/profile/${sender.id}`} className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          {sender.avatar_url ? (
            <AvatarImage src={sender.avatar_url} alt={sender.display_name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(sender.display_name)}
          </AvatarFallback>
        </Avatar>
      </Link>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link
            href={`/profile/${sender.id}`}
            className="font-medium hover:underline"
          >
            {sender.display_name}
          </Link>
          <span className="text-muted-foreground">
            {' '}
            {t('requests.sentYouRequest')}
          </span>
        </p>
        {request.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            <MessageCircle className="inline h-3 w-3 mr-1" />
            {request.message}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          {getTimeAgo(request.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          variant="default"
          size="icon"
          className="h-8 w-8 bg-green-600 hover:bg-green-700"
          onClick={handleAccept}
          disabled={isAccepting}
          aria-label={t('requests.acceptAriaLabel', { name: sender.display_name })}
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleDecline}
          disabled={isDeclining}
          aria-label={t('requests.declineAriaLabel', { name: sender.display_name })}
        >
          {isDeclining ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Card Variant
// =============================================================================

function CardNotification({
  request,
  onAccept,
  onDecline,
  className,
}: FriendRequestNotificationProps) {
  const t = useTranslations('Social');
  const { acceptRequest, declineRequest } = useFriendRequests();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isHandled, setIsHandled] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    try {
      await acceptRequest(request.id);
      setIsHandled(true);
      toast.success(t('requests.accepted'));
      onAccept?.();
    } catch (err) {
      console.error('Error accepting request:', err);
      toast.error(t('requests.acceptFailed'));
    } finally {
      setIsAccepting(false);
    }
  }, [request.id, acceptRequest, t, onAccept]);

  const handleDecline = useCallback(async () => {
    setIsDeclining(true);
    try {
      await declineRequest(request.id);
      setIsHandled(true);
      toast.info(t('requests.declined'));
      onDecline?.();
    } catch (err) {
      console.error('Error declining request:', err);
      toast.error(t('requests.declineFailed'));
    } finally {
      setIsDeclining(false);
    }
  }, [request.id, declineRequest, t, onDecline]);

  if (isHandled) {
    return null;
  }

  const sender = request.sender;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        {/* Header with icon */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">{t('requests.newRequest')}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {getTimeAgo(request.created_at)}
          </span>
        </div>

        {/* Sender info */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile/${sender.id}`}>
            <Avatar className="h-12 w-12">
              {sender.avatar_url ? (
                <AvatarImage src={sender.avatar_url} alt={sender.display_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(sender.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${sender.id}`}
              className="font-medium hover:underline"
            >
              {sender.display_name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('requests.wantsToBeYourFriend')}
            </p>
          </div>
        </div>

        {/* Message if present */}
        {request.message && (
          <div className="mb-4 rounded-lg bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{request.message}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {t('requests.accept')}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline}
            disabled={isDeclining}
          >
            {isDeclining ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            {t('requests.decline')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FriendRequestNotification(props: FriendRequestNotificationProps) {
  const { variant = 'inline' } = props;

  if (variant === 'card') {
    return <CardNotification {...props} />;
  }

  return <InlineNotification {...props} />;
}

// =============================================================================
// List Component
// =============================================================================

interface FriendRequestListProps {
  /** List of friend requests */
  requests: FriendRequestWithProfile[];
  /** Display variant for items */
  variant?: 'inline' | 'card';
  /** Callback when a request is handled */
  onRequestHandled?: () => void;
  /** Additional class names */
  className?: string;
}

export function FriendRequestList({
  requests,
  variant = 'inline',
  onRequestHandled,
  className,
}: FriendRequestListProps) {
  const t = useTranslations('Social');

  if (requests.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        <UserPlus className="mx-auto h-12 w-12 mb-3 opacity-30" />
        <p>{t('requests.noRequests')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === 'inline' ? 'divide-y divide-border' : 'space-y-4',
        className
      )}
    >
      {requests.map((request) => (
        <FriendRequestNotification
          key={request.id}
          request={request}
          variant={variant}
          onAccept={onRequestHandled}
          onDecline={onRequestHandled}
        />
      ))}
    </div>
  );
}

export default FriendRequestNotification;
