/**
 * SharedLoadoutCommentSection Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Extracted from: VirtualGearShakedown.tsx
 *
 * Reusable comment section for shared loadout views.
 * Handles both authenticated and anonymous users.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Loader2, MessageSquare, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatTripDate } from '@/lib/loadout-utils';
import type { SharedComment, SharedGearItem } from '@/types/sharing';

interface SharedLoadoutCommentSectionProps {
  /** Whether comments are allowed */
  allowComments: boolean;
  /** Author name input value */
  author: string;
  /** Author name change handler */
  onAuthorChange: (value: string) => void;
  /** Selected item ID input value */
  itemId: string;
  /** Item ID change handler */
  onItemIdChange: (value: string) => void;
  /** Message input value */
  message: string;
  /** Message change handler */
  onMessageChange: (value: string) => void;
  /** Submit handler */
  onSubmit: () => void;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether comments are loading */
  isLoadingComments: boolean;
  /** List of comments to display */
  comments: SharedComment[];
  /** Items for the dropdown selector */
  items: SharedGearItem[];
  /** Item lookup map for displaying item names in comments */
  itemLookup: Map<string, SharedGearItem>;
  /** Visual variant */
  variant?: 'sidebar' | 'full-width';
}

export function SharedLoadoutCommentSection({
  allowComments,
  author,
  onAuthorChange,
  itemId,
  onItemIdChange,
  message,
  onMessageChange,
  onSubmit,
  isSubmitting,
  isLoadingComments,
  comments,
  items,
  itemLookup,
  variant = 'full-width',
}: SharedLoadoutCommentSectionProps): React.ReactElement {
  const tShared = useTranslations('SharedLoadout');
  const tComments = useTranslations('SharedLoadout.comments');

  const containerClass =
    variant === 'sidebar'
      ? 'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur'
      : 'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur';

  return (
    <div className={containerClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('realtime')}</p>
          <h2 className="text-xl font-semibold text-white">{tComments('title')}</h2>
        </div>
        <MessageSquare className="h-5 w-5 text-emerald-200" />
      </div>

      {allowComments ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="comment-author" className="text-sm text-slate-200">
              {tComments('nameOptional')}
            </Label>
            <Input
              id="comment-author"
              placeholder={tComments('guestPlaceholder')}
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
              className="border-white/10 bg-black/30 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment-item" className="text-sm text-slate-200">
              {tComments('itemOptional')}
            </Label>
            <select
              id="comment-item"
              value={itemId}
              onChange={(e) => onItemIdChange(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white"
            >
              <option value="">{tComments('generalFeedback')}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment-message" className="text-sm text-slate-200">
              {tComments('commentLabel')}
            </Label>
            <Textarea
              id="comment-message"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder={tComments('messagePlaceholder')}
              className="min-h-[96px] border-white/10 bg-black/30 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={isSubmitting}
            aria-label={tComments('sendAriaLabel')}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tComments('sending')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {tComments('sendComment')}
              </span>
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {tShared('commentsDisabled')}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>{tComments('liveThread')}</span>
          {isLoadingComments && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        <div className="space-y-3">
          {comments.length === 0 && !isLoadingComments && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
              {tComments('noCommentsYet')}
            </div>
          )}
          {comments.map((comment) => {
            const target = comment.item_id ? itemLookup.get(comment.item_id) : null;
            return (
              <div
                key={comment.id}
                className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{comment.author || tComments('guestPlaceholder')}</span>
                  <span className="text-xs text-slate-400">
                    {formatTripDate(new Date(comment.created_at)) ?? ''}
                  </span>
                </div>
                {target && (
                  <p className="mt-1 text-xs text-emerald-100">
                    {tComments('itemLabel')}: <span className="font-medium text-white">{target.name}</span>
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap text-slate-50">{comment.message}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SharedLoadoutCommentSection;
