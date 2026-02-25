/**
 * Wiki Edit Content
 *
 * Feature: Community Section Restructure
 *
 * Client component for editing a wiki page.
 */

'use client';

import { useTranslations } from 'next-intl';
import { WikiLayout, WikiPageEditor } from '@/components/wiki';
import { useWikiPage } from '@/hooks/wiki/useWikiPage';
import { Skeleton } from '@/components/ui/skeleton';

interface WikiEditContentProps {
  slug: string;
}

export function WikiEditContent({ slug }: WikiEditContentProps) {
  const t = useTranslations('Wiki');
  const { page, isLoading, error } = useWikiPage(slug);

  return (
    <WikiLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('editPage')}</h1>
          <p className="text-muted-foreground mt-1">{t('editPageDescription')}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : page ? (
          <WikiPageEditor page={page} mode="edit" />
        ) : null}
      </div>
    </WikiLayout>
  );
}
