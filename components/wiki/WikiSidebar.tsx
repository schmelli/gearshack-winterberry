/**
 * Wiki Sidebar Component
 *
 * Feature: Community Section Restructure
 *
 * Displays wiki categories and recent pages in a sidebar.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronRight, FolderOpen, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWikiCategories } from '@/hooks/wiki/useWikiCategories';
import { useWikiPages } from '@/hooks/wiki/useWikiPages';
import type { WikiCategoryWithChildren } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface CategoryItemProps {
  category: WikiCategoryWithChildren;
  locale: string;
  depth?: number;
}

function CategoryItem({ category, locale, depth = 0 }: CategoryItemProps) {
  const name = locale === 'de' ? category.name_de : category.name_en;

  return (
    <div>
      <Link
        href={`/community/wiki?category=${category.id}`}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors',
          depth > 0 && 'ml-4'
        )}
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{name}</span>
        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
      </Link>
      {category.children && category.children.length > 0 && (
        <div className="ml-2">
          {category.children.map((child) => (
            <CategoryItem key={child.id} category={child} locale={locale} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiSidebar() {
  const t = useTranslations('Wiki');
  const locale = useLocale();
  const { categories, isLoading: categoriesLoading } = useWikiCategories();
  const { pages: recentPages, isLoading: pagesLoading } = useWikiPages({ limit: 5 });

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="sticky top-20 space-y-6">
        {/* New Page Button */}
        <Button asChild className="w-full">
          <Link href="/community/wiki/new">
            <Plus className="h-4 w-4 mr-2" />
            {t('newPage')}
          </Link>
        </Button>

        {/* Categories */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-3">{t('categories')}</h3>
          <ScrollArea className="h-[200px]">
            {categoriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-1">
                {categories.map((category) => (
                  <CategoryItem key={category.id} category={category} locale={locale} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noCategories')}</p>
            )}
          </ScrollArea>
        </div>

        {/* Recent Pages */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-3">{t('recentPages')}</h3>
          {pagesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : recentPages.length > 0 ? (
            <div className="space-y-1">
              {recentPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/community/wiki/${page.slug}`}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {locale === 'de' ? page.title_de : page.title_en}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noPages')}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
