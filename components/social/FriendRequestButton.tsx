/**
 * FriendRequestButton Component
 *
 * Feature: 001-social-graph
 * Tasks: T029, T031, T033
 *
 * Multi-state button for managing friend relationships.
 *
 * States:
 * - 'Add Friend': Can send request (blue outline)
 * - 'Pending': Request sent, waiting for response (yellow)
 * - 'Accept': Has incoming request (green)
 * - 'Friends': Already friends (green checkmark)
 * - 'Message First': Need to exchange messages first (gray, disabled)
 *
 * T033: Handles edge case where they have a pending incoming request.
 * Shows "Accept" instead of "Add Friend" in this case.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserPlus, Clock, UserCheck, Users, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useFriendRequests, useFriendRequestStatus } from '@/hooks/social/useFriendRequests';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { areFriends } from '@/lib/supabase/social-queries';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface FriendRequestButtonProps {
  /** ID of the user to send request to */
  userId: string;
  /** Display name for accessibility and notifications */
  userName?: string;
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Show only icon (for compact views) */
  iconOnly?: boolean;
  /** Additional class names */
  className?: string;
  /** Callback when friend status changes */
  onStatusChange?: (newStatus: 'none' | 'pending' | 'friends') => void;
  /** Callback to initiate messaging (for "Message First" state) */
  onMessageClick?: () => void;
}

type ButtonState =
  | 'loading'
  | 'add_friend'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends'
  | 'message_first'
  | 'self';

// =============================================================================
// Component
// =============================================================================

export function FriendRequestButton({
  userId,
  userName = 'this user',
  size = 'sm',
  iconOnly = false,
  className,
  onStatusChange,
  onMessageClick,
}: FriendRequestButtonProps) {
  const t = useTranslations('Social');
  const { user: currentUser } = useAuthContext();
  const { sendRequest, acceptRequest, cancelRequest, declineRequest } = useFriendRequests();
  const friendRequestStatus = useFriendRequestStatus(userId);
  const { status, requestId, canSend, isLoading: isStatusLoading } = friendRequestStatus;
  const [isOperating, setIsOperating] = useState(false);
  const [isFriends, setIsFriends] = useState(false);
  const [isCheckingFriends, setIsCheckingFriends] = useState(true);

  // Check if already friends
  useEffect(() => {
    const checkFriendship = async () => {
      if (!currentUser?.uid) {
        setIsCheckingFriends(false);
        return;
      }

      try {
        const friends = await areFriends(currentUser.uid, userId);
        setIsFriends(friends);
      } catch (err) {
        console.error('Error checking friendship:', err);
      } finally {
        setIsCheckingFriends(false);
      }
    };

    checkFriendship();
  }, [currentUser?.uid, userId]);

  // Determine button state
  const getButtonState = (): ButtonState => {
    if (currentUser?.uid === userId) return 'self';
    if (isStatusLoading || isCheckingFriends) return 'loading';
    if (isFriends) return 'friends';
    if (status === 'pending_outgoing') return 'pending_outgoing';
    if (status === 'pending_incoming') return 'pending_incoming';
    if (canSend) return 'add_friend';
    return 'message_first';
  };

  const buttonState = getButtonState();

  // Handle sending friend request
  const handleSendRequest = useCallback(async () => {
    if (isOperating) return;

    setIsOperating(true);
    try {
      const response = await sendRequest(userId);

      if (response.success) {
        toast.success(t('requests.sent'));
        onStatusChange?.('pending');
      } else {
        // Handle specific errors
        switch (response.error) {
          case 'rate_limit_exceeded':
            toast.error(t('requests.rateLimitExceeded'));
            break;
          case 'no_message_exchange':
            toast.error(t('requests.noMessageExchange'));
            break;
          case 'already_friends':
            setIsFriends(true);
            toast.info(t('requests.alreadyFriends'));
            break;
          case 'request_already_sent':
            toast.info(t('requests.alreadySent'));
            break;
          case 'request_pending_from_them':
            toast.info(t('requests.pendingFromThem'));
            break;
          default:
            toast.error(t('requests.sendFailed'));
        }
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      toast.error(t('requests.sendFailed'));
    } finally {
      setIsOperating(false);
    }
  }, [isOperating, sendRequest, userId, t, onStatusChange]);

  // Handle accepting request
  const handleAcceptRequest = useCallback(async () => {
    if (isOperating || !requestId) return;

    setIsOperating(true);
    try {
      await acceptRequest(requestId);
      setIsFriends(true);
      toast.success(t('requests.accepted'));
      onStatusChange?.('friends');
    } catch (err) {
      console.error('Error accepting friend request:', err);
      toast.error(t('requests.acceptFailed'));
    } finally {
      setIsOperating(false);
    }
  }, [isOperating, requestId, acceptRequest, t, onStatusChange]);

  // Handle declining request
  const handleDeclineRequest = useCallback(async () => {
    if (isOperating || !requestId) return;

    setIsOperating(true);
    try {
      await declineRequest(requestId);
      toast.info(t('requests.declined'));
      onStatusChange?.('none');
    } catch (err) {
      console.error('Error declining friend request:', err);
      toast.error(t('requests.declineFailed'));
    } finally {
      setIsOperating(false);
    }
  }, [isOperating, requestId, declineRequest, t, onStatusChange]);

  // Handle canceling request
  const handleCancelRequest = useCallback(async () => {
    if (isOperating || !requestId) return;

    setIsOperating(true);
    try {
      await cancelRequest(requestId);
      toast.info(t('requests.cancelled'));
      onStatusChange?.('none');
    } catch (err) {
      console.error('Error cancelling friend request:', err);
      toast.error(t('requests.cancelFailed'));
    } finally {
      setIsOperating(false);
    }
  }, [isOperating, requestId, cancelRequest, t, onStatusChange]);

  // Don't render for self
  if (buttonState === 'self') {
    return null;
  }

  // Loading state
  if (buttonState === 'loading') {
    return (
      <Button
        variant="outline"
        size={iconOnly ? 'icon' : size}
        disabled
        className={cn(iconOnly && 'h-8 w-8', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {!iconOnly && <span className="ml-2">{t('common.loading')}</span>}
      </Button>
    );
  }

  // Friends state - show badge
  if (buttonState === 'friends') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size={iconOnly ? 'icon' : size}
              className={cn(
                'cursor-default border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
                iconOnly && 'h-8 w-8',
                className
              )}
              disabled
            >
              <Users className="h-4 w-4" />
              {!iconOnly && <span className="ml-2">{t('friends.label')}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('friends.alreadyFriends', { name: userName })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Message first state
  if (buttonState === 'message_first') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={iconOnly ? 'icon' : size}
              className={cn(iconOnly && 'h-8 w-8', className)}
              onClick={onMessageClick}
              disabled={!onMessageClick}
            >
              <MessageCircle className="h-4 w-4" />
              {!iconOnly && <span className="ml-2">{t('requests.messageFirst')}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('requests.messageFirstTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Pending incoming - show accept/decline dropdown
  if (buttonState === 'pending_incoming') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size={iconOnly ? 'icon' : size}
            className={cn(
              'bg-green-600 hover:bg-green-700',
              iconOnly && 'h-8 w-8',
              className
            )}
            disabled={isOperating}
          >
            {isOperating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {!iconOnly && <span className="ml-2">{t('requests.respond')}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleAcceptRequest}>
            <UserCheck className="h-4 w-4 mr-2 text-green-600" />
            {t('requests.accept')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeclineRequest}>
            {t('requests.decline')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Pending outgoing - show cancel option
  if (buttonState === 'pending_outgoing') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={iconOnly ? 'icon' : size}
            className={cn(
              'border-yellow-500/50 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400',
              iconOnly && 'h-8 w-8',
              className
            )}
            disabled={isOperating}
          >
            {isOperating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {!iconOnly && <span className="ml-2">{t('requests.pending')}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCancelRequest}>
            {t('requests.cancel')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Add Friend state (default)
  return (
    <Button
      variant="outline"
      size={iconOnly ? 'icon' : size}
      className={cn(
        'border-primary/50 hover:bg-primary/10',
        iconOnly && 'h-8 w-8',
        className
      )}
      onClick={handleSendRequest}
      disabled={isOperating}
      aria-label={t('requests.addFriendAriaLabel', { name: userName })}
    >
      {isOperating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {!iconOnly && <span className="ml-2">{t('requests.addFriend')}</span>}
    </Button>
  );
}

export default FriendRequestButton;
