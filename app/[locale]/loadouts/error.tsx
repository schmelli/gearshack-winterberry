'use client';

/**
 * Error Boundary for Loadout Pages
 * Feature: 048-ai-loadout-image-gen
 *
 * Catches errors in loadout-related components, including:
 * - Image generation failures
 * - Image analysis errors (contrast, canvas)
 * - Database operation failures
 *
 * Provides graceful error UI without crashing the entire page
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LoadoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Loadouts');

  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error('[Loadout Error Boundary]', error);
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
            onClick={() => (window.location.href = '/loadouts')}
            variant="outline"
            size="sm"
          >
            {t('backToLoadouts')}
          </Button>
        </div>
      </div>
    </div>
  );
}
