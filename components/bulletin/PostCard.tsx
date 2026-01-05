'use client';

/**
 * Post Card Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T028
 *
 * Displays a single bulletin board post with author info,
 * content, tag badge, reply count, and actions menu.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PostMenu } from './PostMenu';
import { LinkedContentPreview } from './LinkedContentPreview';
import { RichContentRenderer } from './RichContentRenderer';
import type { BulletinPostWithAuthor, PostTag } from '@/types/bulletin';
import { POST_TAGS } from '@/types/bulletin';

interface PostCardProps {
  post: BulletinPostWithAuthor;
  currentUserId?: string;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onToggleReplies?: (postId: string) => void;
  isExpanded?: boolean;
  children?: React.ReactNode; // For reply thread
}

const TAG_COLORS: Record<PostTag, string> = {
  question: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shakedown: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  trade: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  trip_planning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  gear_advice: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function PostCard({
  post,
  currentUserId,
  onEdit,
  onDelete,
  onReport,
  onToggleReplies,
  isExpanded = false,
  children,
}: PostCardProps) {
  const t = useTranslations('bulletin');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAuthor = currentUserId === post.author_id;
  const authorInitials = getInitials(post.author_name);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  });
  const isEdited = post.updated_at !== post.created_at;
  const canEdit = isAuthor; // Authors can edit their posts anytime

  if (post.is_deleted) {
    return (
      <Card className="opacity-60">
        <CardContent className="py-4">
          <p className="text-muted-foreground italic">{t('post.deleted')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        {/* Header: Author + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author_avatar ?? undefined} alt={post.author_name} />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.author_name}</p>
              <p className="text-sm text-muted-foreground">
                {timeAgo}
                {isEdited && (
                  <span className="ml-1 text-xs">{t('post.editedLabel')}</span>
                )}
              </p>
            </div>
          </div>

          <PostMenu
            isOpen={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            isAuthor={isAuthor}
            canEdit={canEdit}
            onEdit={() => onEdit?.(post.id)}
            onDelete={() => onDelete?.(post.id)}
            onReport={() => onReport?.(post.id)}
          />
        </div>

        {/* Tag badge */}
        {post.tag && (
          <div className="mt-3">
            <Badge
              variant="secondary"
              className={cn('text-xs', TAG_COLORS[post.tag])}
            >
              {t(POST_TAGS.find((tag) => tag.value === post.tag)?.labelKey ?? 'tags.other')}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="mt-3">
          <RichContentRenderer
            content={post.content}
            className="max-h-48 overflow-y-auto text-sm leading-relaxed"
          />
        </div>

        {/* Linked content preview */}
        {post.linked_content_type && post.linked_content_id && (
          <div className="mt-3">
            <LinkedContentPreview
              contentType={post.linked_content_type}
              contentId={post.linked_content_id}
            />
          </div>
        )}

        {/* Archived indicator */}
        {post.is_archived && (
          <div className="mt-3">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t('post.archived')}
            </Badge>
          </div>
        )}

        {/* Footer: Reply count + expand */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onToggleReplies?.(post.id)}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            {t('post.replies', { count: post.reply_count })}
            {post.reply_count > 0 && (
              isExpanded ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )
            )}
          </Button>
        </div>

        {/* Expanded replies */}
        {isExpanded && children && (
          <div className="mt-4 border-t pt-4">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
