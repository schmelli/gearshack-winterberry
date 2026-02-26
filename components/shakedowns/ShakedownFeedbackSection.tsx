/**
 * ShakedownFeedbackSection Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Feedback section for shakedown detail with form and tree display.
 * This is a simplified version for the ShakedownDetail page.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Loader2 } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { Link } from '@/i18n/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FeedbackItem } from '@/components/shakedowns/FeedbackItem';

interface ShakedownFeedbackSectionProps {
  shakedownId: string;
  feedbackTree: FeedbackNode[];
  shakedownOwnerId: string;
  canAddFeedback: boolean;
  onFeedbackAdded: () => void;
}

export function ShakedownFeedbackSection({
  shakedownId,
  feedbackTree,
  shakedownOwnerId,
  canAddFeedback: canAdd,
  onFeedbackAdded,
}: ShakedownFeedbackSectionProps): React.ReactElement {
  const t = useTranslations('Shakedowns.feedback');
  const { user } = useAuthContext();
  const { createFeedback, isSubmitting } = useFeedback();

  const [newFeedback, setNewFeedback] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!newFeedback.trim() || !user) return;

    try {
      await createFeedback({
        shakedownId,
        content: newFeedback.trim(),
        parentId: replyToId ?? undefined,
      });
      setNewFeedback('');
      setReplyToId(null);
      onFeedbackAdded();
    } catch {
      // Error handled by hook with toast
    }
  }, [createFeedback, newFeedback, shakedownId, replyToId, user, onFeedbackAdded]);

  const handleReply = useCallback((parentId: string) => {
    setReplyToId(parentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToId(null);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-5" />
            {t('title')}
            {feedbackTree.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {feedbackTree.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add feedback form */}
        {canAdd && user && (
          <div className="space-y-3">
            {replyToId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('replyingToComment')}</span>
                <Button variant="ghost" size="sm" onClick={handleCancelReply} className="h-6 px-2">
                  {t('cancel')}
                </Button>
              </div>
            )}
            <Textarea
              placeholder={t('addPlaceholder')}
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!newFeedback.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('add')
                )}
              </Button>
            </div>
          </div>
        )}

        {!user && canAdd && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{' '}
            to add feedback
          </div>
        )}

        <Separator />

        {/* Feedback tree */}
        {feedbackTree.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="font-medium">{t('noFeedback')}</p>
            <p className="text-sm text-muted-foreground">{t('noFeedbackDescription')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackTree.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                shakedownOwnerId={shakedownOwnerId}
                onReply={handleReply}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ShakedownFeedbackSection;
