'use client';

/**
 * Empty State Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T071, T048
 *
 * Shows appropriate empty state for empty board or no search results.
 */

import { useTranslations } from 'next-intl';
import { MessageSquarePlus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  variant?: 'empty' | 'no-results';
  onCreatePost?: () => void;
  onClearFilters?: () => void;
}

export function EmptyState({
  variant = 'empty',
  onCreatePost,
  onClearFilters,
}: EmptyStateProps) {
  const t = useTranslations('bulletin');

  if (variant === 'no-results') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t('noResults.title')}</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t('noResults.subtitle')}
          </p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters} className="mt-6">
              {t('noResults.clearFilters')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{t('empty.title')}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('empty.subtitle')}
        </p>
        {onCreatePost && (
          <Button onClick={onCreatePost} className="mt-6">
            {t('empty.cta')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
