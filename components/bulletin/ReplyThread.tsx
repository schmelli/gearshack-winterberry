'use client';

/**
 * Reply Thread Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T037
 *
 * Reply list with 2-level nesting and client-side tree construction.
 */

import { memo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Reply, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useReplies, isPostError } from '@/hooks/bulletin';
import { ReplyComposer } from './ReplyComposer';
import { RichContentRenderer } from './RichContentRenderer';
import { BULLETIN_CONSTANTS, type ReplyNode } from '@/types/bulletin';

interface ReplyThreadProps {
  postId: string;
  currentUser: { id: string; name: string; avatar: string | null } | null;
  onReplyCountChange?: (delta: number) => void;
  onReportReply?: (replyId: string) => void;
}

export function ReplyThread({
  postId,
  currentUser,
  onReplyCountChange,
  onReportReply,
}: ReplyThreadProps) {
  const t = useTranslations('bulletin');
  const { replyTree, isLoading, loadReplies, createReply, deleteReply } =
    useReplies();

  const [replyingTo, setReplyingTo] = useState<{
    id: string | null;
    name: string;
  } | null>(null);

  // Load replies when mounted
  useEffect(() => {
    loadReplies(postId);
  }, [postId, loadReplies]);

  const handleSubmitReply = async (content: string) => {
    if (!currentUser) return;

    try {
      const reply = await createReply(
        {
          post_id: postId,
          parent_reply_id: replyingTo?.id ?? undefined,
          content,
        },
        { name: currentUser.name, avatar: currentUser.avatar }
      );

      if (reply) {
        onReplyCountChange?.(1);
        setReplyingTo(null);
      }
    } catch (error) {
      // Handle specific error types with appropriate UI feedback (T073, T074)
      if (isPostError(error)) {
        switch (error.type) {
          case 'rate_limit':
            toast.error(
              t('errors.rateLimitReplies', {
                limit: BULLETIN_CONSTANTS.DAILY_REPLY_LIMIT,
              })
            );
            break;
          case 'banned':
            toast.error(t('errors.banned'));
            break;
          default:
            toast.error(t('errors.replyFailed'));
        }
      } else {
        toast.error(t('errors.replyFailed'));
      }
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const success = await deleteReply(replyId);
    if (success) {
      onReplyCountChange?.(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reply list */}
      {replyTree.length > 0 && (
        <div className="space-y-3">
          {replyTree.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUser?.id}
              onReply={(id, name) => setReplyingTo({ id, name })}
              onDelete={handleDeleteReply}
              onReport={(replyId) => onReportReply?.(replyId)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Reply composer */}
      <ReplyComposer
        placeholder={
          replyingTo
            ? t('reply.replyTo', { name: replyingTo.name })
            : t('reply.placeholder')
        }
        onSubmit={handleSubmitReply}
        onCancel={replyingTo ? () => setReplyingTo(null) : undefined}
        disabled={!currentUser}
      />
    </div>
  );
}

interface ReplyItemProps {
  reply: ReplyNode;
  currentUserId?: string;
  onReply: (replyId: string | null, authorName: string) => void;
  onDelete: (replyId: string) => void;
  onReport: (replyId: string) => void;
  t: ReturnType<typeof useTranslations<'bulletin'>>;
  depth?: number;
}

const ReplyItem = memo(function ReplyItem({
  reply,
  currentUserId,
  onReply,
  onDelete,
  onReport,
  t,
  depth = 1,
}: ReplyItemProps) {
  const isAuthor = currentUserId === reply.author_id;
  const authorInitials = getInitials(reply.author_name);
  const timeAgo = formatDistanceToNow(new Date(reply.created_at), {
    addSuffix: true,
  });

  if (reply.is_deleted) {
    return (
      <div className={cn('text-sm text-muted-foreground italic', depth > 1 && 'ml-8')}>
        {t('reply.deleted')}
      </div>
    );
  }

  return (
    <div className={cn(depth > 1 && 'ml-8')}>
      {/* Reply content */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={reply.author_avatar ?? undefined} alt={reply.author_name} />
          <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{reply.author_name}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          <div className="mt-1">
            <RichContentRenderer content={reply.content} className="text-sm" />
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            {/* Only allow reply to depth 1 (creates depth 2) */}
            {depth === 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => onReply(reply.id, reply.author_name)}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}

            {/* Actions menu - always visible for report, delete only for author */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {isAuthor && (
                  <DropdownMenuItem
                    onClick={() => onDelete(reply.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('menu.delete')}
                  </DropdownMenuItem>
                )}
                {!isAuthor && currentUserId && (
                  <DropdownMenuItem onClick={() => onReport(reply.id)}>
                    <Flag className="mr-2 h-4 w-4" />
                    {t('menu.report')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Nested replies (depth 2) */}
      {reply.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              onReport={onReport}
              t={t}
              depth={2}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.reply.id === nextProps.reply.id &&
    prevProps.reply.content === nextProps.reply.content &&
    prevProps.reply.is_deleted === nextProps.reply.is_deleted &&
    prevProps.reply.children.length === nextProps.reply.children.length &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.depth === nextProps.depth
  );
});

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
