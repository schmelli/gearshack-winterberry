/**
 * MessageBubble - Individual Message Display Component
 *
 * Feature: 046-user-messaging-system
 * Task: T010
 *
 * Displays a single message with sender info, content, and timestamp.
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import { Check, CheckCheck, MoreVertical, Copy, Trash2, Flag } from 'lucide-react';
import type { MessageWithSender, MessageDeliveryStatus, ReactionEmoji, LocationMetadata, GearReferenceMetadata, VoiceMetadata } from '@/types/messaging';
import { cn } from '@/lib/utils';
import { LocationCard } from './LocationCard';
import { GearReferenceCard } from './GearReferenceCard';
import { VoicePlayer } from './VoicePlayer';

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  showSender?: boolean;
  deliveryStatus?: MessageDeliveryStatus;
  onReact?: (emoji: ReactionEmoji) => void;
  onDelete?: (deleteForAll: boolean) => void;
  onReport?: () => void;
  onCopy?: () => void;
  onViewGear?: (gearItemId: string) => void;
}

const REACTION_EMOJIS: ReactionEmoji[] = ['👍', '❤️', '😂', '😮', '😢'];

// SECURITY: Trusted CDN domains for media uploads
const TRUSTED_MEDIA_DOMAINS = [
  'res.cloudinary.com',
  'cloudinary.com',
] as const;

/**
 * SECURITY: Validate that media URLs are from trusted CDN domains
 * This prevents XSS via malicious URLs (javascript:, data:, etc.)
 */
function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') return false;
    // Must be from trusted CDN
    return TRUSTED_MEDIA_DOMAINS.some(domain => urlObj.host.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Displays a single message bubble with all associated metadata.
 */
export function MessageBubble({
  message,
  isOwnMessage,
  showSender = false,
  deliveryStatus,
  onReact,
  onDelete,
  onReport,
  onCopy,
  onViewGear,
}: MessageBubbleProps) {
  const t = useTranslations('Messaging.messageBubble');
  const [showActions, setShowActions] = useState(false);

  const sender = message.sender;
  const initials = sender?.display_name
    ? sender.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const formattedTime = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });
  const fullTime = format(new Date(message.created_at), 'PPpp');

  // Group reactions by emoji
  const reactionCounts = message.reactions.reduce<Record<ReactionEmoji, number>>(
    (acc, r) => {
      const emoji = r.emoji as ReactionEmoji;
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    },
    {} as Record<ReactionEmoji, number>
  );

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      onCopy?.();
    }
  };

  return (
    <div
      className={cn(
        'group flex gap-2',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar (only for other's messages) */}
      {!isOwnMessage && showSender && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={sender?.avatar_url ?? undefined} alt={sender?.display_name ?? ''} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div
        className={cn(
          'flex max-w-[70%] flex-col',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name (for group messages) */}
        {!isOwnMessage && showSender && sender && (
          <span className="mb-1 text-xs font-medium text-muted-foreground">
            {sender.display_name}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative rounded-2xl px-4 py-2',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {/* Message content based on type */}
          <MessageContent
            message={message}
            isOwnMessage={isOwnMessage}
            onViewGear={onViewGear}
          />

          {/* Actions dropdown */}
          <div
            className={cn(
              'absolute top-0 transition-opacity',
              isOwnMessage ? '-left-8' : '-right-8',
              showActions ? 'opacity-100' : 'opacity-0'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                {/* Reaction picker */}
                {onReact && (
                  <>
                    <div className="flex gap-1.5 px-2 py-1">
                      {REACTION_EMOJIS.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg"
                          onClick={() => onReact(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                {message.content && (
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('copy')}
                  </DropdownMenuItem>
                )}

                {isOwnMessage && onDelete && (
                  <>
                    <DropdownMenuItem onClick={() => onDelete(false)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteForMe')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteForEveryone')}
                    </DropdownMenuItem>
                  </>
                )}

                {!isOwnMessage && onReport && (
                  <DropdownMenuItem onClick={onReport} className="text-destructive">
                    <Flag className="mr-2 h-4 w-4" />
                    {t('report')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="mt-1 flex gap-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span
                key={emoji}
                className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs"
              >
                {emoji}
                {count > 1 && <span className="text-muted-foreground">{count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp and delivery status */}
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{formattedTime}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullTime}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isOwnMessage && deliveryStatus && (
            <DeliveryStatusIcon status={deliveryStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageContentProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  onViewGear?: (gearItemId: string) => void;
}

function MessageContent({ message, isOwnMessage, onViewGear }: MessageContentProps) {
  const t = useTranslations('Messaging.messageBubble');

  switch (message.message_type) {
    case 'text':
      return <p className="whitespace-pre-wrap break-words">{message.content}</p>;

    case 'image':
      // SECURITY: Only render images from trusted CDN domains
      if (!isValidMediaUrl(message.media_url)) {
        return <span className="text-sm text-muted-foreground">{t('imageUnavailable')}</span>;
      }
      return (
        <div className="overflow-hidden rounded-lg">
          <Image
            src={message.media_url ?? ''}
            alt={t('sharedImageAlt')}
            width={512}
            height={256}
            className="max-h-64 max-w-full object-contain"
          />
          {message.content && (
            <p className="mt-2 whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      );

    case 'voice': {
      const voiceMeta = message.metadata as VoiceMetadata | undefined;
      // SECURITY: Only play audio from trusted CDN domains
      if (message.media_url && isValidMediaUrl(message.media_url)) {
        return (
          <VoicePlayer
            audioUrl={message.media_url}
            metadata={voiceMeta}
            isOwnMessage={isOwnMessage}
          />
        );
      }
      return <span className="text-sm">{t('voiceMessageUnavailable')}</span>;
    }

    case 'location': {
      const locationMeta = message.metadata as LocationMetadata;
      if (locationMeta?.latitude && locationMeta?.longitude) {
        return (
          <LocationCard
            metadata={locationMeta}
            isOwnMessage={isOwnMessage}
          />
        );
      }
      return <span className="text-sm">{t('sharedLocation')}</span>;
    }

    case 'gear_reference': {
      const gearMeta = message.metadata as GearReferenceMetadata;
      if (gearMeta?.gear_item_id) {
        return (
          <GearReferenceCard
            metadata={gearMeta}
            isOwnMessage={isOwnMessage}
            onViewGear={onViewGear}
          />
        );
      }
      return <span className="text-sm">{t('sharedGearItem')}</span>;
    }

    case 'gear_trade':
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">{t('gearTradePost')}</span>
          {/* Trade post will be added in Phase 14 */}
        </div>
      );

    case 'trip_invitation':
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">{t('tripInvitation')}</span>
          {/* Trip invite will be added in Phase 14 */}
        </div>
      );

    default:
      return <p className="text-sm">{message.content}</p>;
  }
}

function DeliveryStatusIcon({ status }: { status: MessageDeliveryStatus }) {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    default:
      return null;
  }
}
