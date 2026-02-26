'use client';

/**
 * Error Boundary for Messages Pages
 *
 * Catches errors in messaging-related components, including:
 * - Conversation loading failures
 * - Message sending errors
 * - Realtime subscription errors
 *
 * Provides graceful error UI without crashing the entire page
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Messages');

  useEffect(() => {
    console.error('[Messages Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <h2 className="mb-2 text-lg font-semibold">{t('error.title')}</h2>

        <p className="mb-4 text-sm text-muted-foreground">
          {error.message || t('error.defaultMessage')}
        </p>

        {error.digest && (
          <p className="mb-4 text-xs text-muted-foreground">
            {t('error.errorId', { id: error.digest })}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            variant="default"
            size="sm"
          >
            {t('error.tryAgain')}
          </Button>

          <Button
            onClick={() => (window.location.href = '/messages')}
            variant="outline"
            size="sm"
          >
            {t('error.backToMessages')}
          </Button>
        </div>
      </div>
    </div>
  );
}
