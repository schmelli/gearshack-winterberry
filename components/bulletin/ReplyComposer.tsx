'use client';

/**
 * Reply Composer Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T038
 *
 * Reply input with Ctrl+Enter submit.
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Send, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ReplyComposerProps {
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}

export function ReplyComposer({
  placeholder,
  onSubmit,
  onCancel,
  disabled = false,
}: ReplyComposerProps) {
  const t = useTranslations('bulletin');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, isSubmitting, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder ?? t('reply.placeholder')}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          className="min-h-[60px] resize-none flex-1"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t('reply.markdownHint')}
        </p>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || isSubmitting || !content.trim()}
          >
            <Send className="mr-1 h-4 w-4" />
            {t('reply.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
