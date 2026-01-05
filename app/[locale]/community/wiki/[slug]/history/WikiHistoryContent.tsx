/**
 * Wiki History Content
 *
 * Feature: Community Section Restructure
 *
 * Client component for viewing revision history.
 */

'use client';

import { useLocale } from 'next-intl';
import { WikiLayout, WikiRevisionList } from '@/components/wiki';
import { useWikiRevisions } from '@/hooks/wiki/useWikiRevisions';

interface WikiHistoryContentProps {
  slug: string;
  pageId: string;
  titleEn: string;
  titleDe: string;
}

export function WikiHistoryContent({
  slug,
  pageId,
  titleEn,
  titleDe,
}: WikiHistoryContentProps) {
  const locale = useLocale();
  const { revisions, isLoading } = useWikiRevisions(pageId);
  const title = locale === 'de' ? titleDe : titleEn;

  return (
    <WikiLayout>
      <WikiRevisionList
        revisions={revisions}
        pageSlug={slug}
        pageTitle={title}
        isLoading={isLoading}
      />
    </WikiLayout>
  );
}
