/**
 * Wiki Home Content Component
 *
 * Feature: Community Section Restructure
 *
 * Client component for wiki home page with search and listing.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WikiLayout, WikiSearch, WikiPageCard } from '@/components/wiki';
import { useWikiPages } from '@/hooks/wiki/useWikiPages';
import { useWikiCategories } from '@/hooks/wiki/useWikiCategories';

interface WikiHomeContentProps {
  query?: string;
  categoryId?: string;
}

export function WikiHomeContent({ query, categoryId }: WikiHomeContentProps) {
  const t = useTranslations('Wiki');
  const locale = useLocale();
  const { pages, isLoading, hasMore, loadMore, total } = useWikiPages({
    query,
    category_id: categoryId,
    locale: locale as 'en' | 'de',
  });
  const { categories } = useWikiCategories();

  // Find category name if filtering
  const selectedCategory = categoryId
    ? categories.find((c) => c.id === categoryId)
    : null;
  const categoryName = selectedCategory
    ? locale === 'de'
      ? selectedCategory.name_de
      : selectedCategory.name_en
    : null;

  return (
    <WikiLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          <Button asChild>
            <Link href="/community/wiki/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('newPage')}
            </Link>
          </Button>
        </div>

        {/* Search */}
        <WikiSearch initialQuery={query} />

        {/* Filters Display */}
        {(query || categoryName) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {query && (
              <span>
                {t('searchingFor')}: <strong>&quot;{query}&quot;</strong>
              </span>
            )}
            {categoryName && (
              <span>
                {t('inCategory')}: <strong>{categoryName}</strong>
              </span>
            )}
            <Link
              href="/community/wiki"
              className="text-primary hover:underline ml-2"
            >
              {t('clearFilters')}
            </Link>
          </div>
        )}

        {/* Results Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {t('resultsCount', { count: total })}
          </p>
        )}

        {/* Pages Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : pages.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page) => (
                <WikiPageCard key={page.id} page={page} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore}>
                  {t('loadMore')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t('noPages')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('noPagesDescription')}</p>
            <Button asChild>
              <Link href="/community/wiki/new">
                <Plus className="h-4 w-4 mr-2" />
                {t('createFirstPage')}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </WikiLayout>
  );
}
