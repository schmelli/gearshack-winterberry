/**
 * EditComposer Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: FeedbackSection.tsx
 *
 * Form for editing existing feedback.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';

import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const feedbackSchema = z.object({
  content: z
    .string()
    .min(1, 'Feedback cannot be empty')
    .max(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH, 'Feedback is too long'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface EditComposerProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function EditComposer({
  initialContent,
  onSave,
  onCancel,
  isSubmitting,
}: EditComposerProps): React.ReactElement {
  const t = useTranslations('Shakedowns');
  const tCommon = useTranslations('Common');

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { content: initialContent },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() returns reactive values that work correctly despite compiler warning
  const content = form.watch('content');
  const charCount = content.length;

  async function handleSubmit(data: FeedbackFormData): Promise<void> {
    await onSave(data.content);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea {...field} className="min-h-[100px] resize-y" autoFocus disabled={isSubmitting} />
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

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
              <X className="size-4 mr-1" />
              {tCommon('cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || charCount === 0} className="gap-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                tCommon('save')
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default EditComposer;
