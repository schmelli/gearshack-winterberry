/**
 * Wiki Page View Content
 *
 * Feature: Community Section Restructure
 *
 * Client component for viewing a wiki page.
 */

'use client';

import { WikiLayout, WikiPageView, WikiPageViewSkeleton } from '@/components/wiki';
import { useWikiPage } from '@/hooks/wiki/useWikiPage';

interface WikiPageViewContentProps {
  slug: string;
}

export function WikiPageViewContent({ slug }: WikiPageViewContentProps) {
  const { page, isLoading, error } = useWikiPage(slug);

  return (
    <WikiLayout>
      {isLoading ? (
        <WikiPageViewSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      ) : page ? (
        <WikiPageView page={page} />
      ) : null}
    </WikiLayout>
  );
}
