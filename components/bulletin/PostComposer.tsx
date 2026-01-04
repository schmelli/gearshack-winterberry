'use client';

/**
 * Post Composer Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T027
 *
 * Modal/form for creating new bulletin board posts.
 * Includes character counter, tag selector, and Ctrl+Enter submit.
 */

import { useState, useCallback, useEffect, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createPostSchema, type CreatePostSchema } from '@/lib/validations/bulletin';
import {
  POST_TAGS,
  BULLETIN_CONSTANTS,
  type PostTag,
  type LinkedContentType,
} from '@/types/bulletin';

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostSchema) => Promise<void>;
  isSubmitting?: boolean;
  linkedContent?: {
    type: LinkedContentType;
    id: string;
    title: string;
  };
  /** When provided, the composer opens in edit mode with pre-filled values */
  editPost?: {
    id: string;
    content: string;
    tag: PostTag | null;
  };
}

export function PostComposer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  linkedContent,
  editPost,
}: PostComposerProps) {
  const t = useTranslations('bulletin');
  const isEditMode = !!editPost;
  const [selectedTag, setSelectedTag] = useState<PostTag | undefined>(
    editPost?.tag ?? undefined
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: editPost?.content ?? '',
      tag: editPost?.tag ?? undefined,
      linked_content_type: linkedContent?.type,
      linked_content_id: linkedContent?.id,
    },
  });

  const content = watch('content') || '';
  const charCount = content.length;
  const isOverWarning = charCount >= BULLETIN_CONSTANTS.WARNING_THRESHOLD;
  const isAtLimit = charCount >= BULLETIN_CONSTANTS.MAX_POST_LENGTH;

  // Reset form when editPost changes (opening in edit mode)
  useEffect(() => {
    if (editPost) {
      reset({
        content: editPost.content,
        tag: editPost.tag ?? undefined,
        linked_content_type: linkedContent?.type,
        linked_content_id: linkedContent?.id,
      });
      setSelectedTag(editPost.tag ?? undefined);
    } else {
      reset({
        content: '',
        tag: undefined,
        linked_content_type: linkedContent?.type,
        linked_content_id: linkedContent?.id,
      });
      setSelectedTag(undefined);
    }
  }, [editPost, reset, linkedContent]);

  const handleFormSubmit = async (data: CreatePostSchema) => {
    await onSubmit({
      ...data,
      tag: selectedTag,
    });
    reset();
    setSelectedTag(undefined);
    onClose();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(handleFormSubmit)();
      }
    },
    [handleSubmit, handleFormSubmit]
  );

  const handleClose = () => {
    reset();
    setSelectedTag(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('composer.editTitle') : t('composer.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Linked content indicator */}
          {linkedContent && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {t('composer.linkedContent', { title: linkedContent.title })}
            </div>
          )}

          {/* Content textarea */}
          <div className="space-y-2">
            <Textarea
              {...register('content')}
              placeholder={t('composer.placeholder')}
              className="min-h-[120px] resize-none"
              maxLength={BULLETIN_CONSTANTS.MAX_POST_LENGTH}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
            />

            {/* Character counter */}
            <div className="flex justify-end">
              <span
                className={cn(
                  'text-sm',
                  isAtLimit
                    ? 'text-destructive font-medium'
                    : isOverWarning
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {t('composer.charCount', {
                  count: charCount,
                  max: BULLETIN_CONSTANTS.MAX_POST_LENGTH,
                })}
              </span>
            </div>

            {errors.content && (
              <p className="text-sm text-destructive">
                {t(errors.content.message as string)}
              </p>
            )}
          </div>

          {/* Tag selector */}
          <div className="space-y-2">
            <Label htmlFor="tag">{t('composer.tagLabel')}</Label>
            <Select
              value={selectedTag}
              onValueChange={(value) => setSelectedTag(value as PostTag)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="tag">
                <SelectValue placeholder={t('composer.selectTag')} />
              </SelectTrigger>
              <SelectContent>
                {POST_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {t(tag.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('composer.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || isAtLimit}>
              {isSubmitting
                ? isEditMode
                  ? t('composer.saving')
                  : t('composer.posting')
                : isEditMode
                  ? t('composer.save')
                  : t('composer.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
