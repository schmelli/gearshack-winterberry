/**
 * ItemFeedbackComposer Component
 *
 * Extracted from ItemFeedbackModal.tsx
 * Form for creating new top-level feedback on a gear item.
 * Uses react-hook-form with zod validation.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Loader2 } from 'lucide-react';

import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// =============================================================================
// Validation Schema
// =============================================================================

const feedbackSchema = z.object({
  content: z
    .string()
    .min(1, 'Feedback cannot be empty')
    .max(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH, 'Feedback is too long'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

// =============================================================================
// Types
// =============================================================================

interface ItemFeedbackComposerProps {
  /** Placeholder text for the textarea */
  placeholder: string;
  /** Callback when feedback is submitted */
  onSubmit: (content: string) => Promise<void>;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ItemFeedbackComposer({
  placeholder,
  onSubmit,
  isSubmitting,
}: ItemFeedbackComposerProps) {
  const t = useTranslations('Shakedowns');

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      content: '',
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() returns reactive values that work correctly despite compiler warning
  const content = form.watch('content');
  const charCount = content.length;

  const handleSubmit = async (data: FeedbackFormData) => {
    await onSubmit(data.content);
    form.reset();
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={placeholder}
                    className="min-h-[80px] resize-y"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-xs text-muted-foreground',
                charCount > SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH && 'text-destructive'
              )}
            >
              {t('feedback.characterCount', {
                count: charCount,
                max: SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH,
              })}
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || charCount === 0}
              className="gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('feedback.submitting')}
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  {t('feedback.add')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
