/**
 * Wiki Page View Component
 *
 * Feature: Community Section Restructure
 *
 * Displays a wiki page with rendered markdown content.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Edit, History, Calendar, Eye, User, FolderOpen, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import type { WikiPageWithAuthor } from '@/types/wiki';

interface WikiPageViewProps {
  page: WikiPageWithAuthor;
}

export function WikiPageView({ page }: WikiPageViewProps) {
  const t = useTranslations('Wiki');
  const locale = useLocale();

  const title = locale === 'de' ? page.title_de : page.title_en;
  const content = locale === 'de' ? page.content_de : page.content_en;
  const categoryName = page.category
    ? locale === 'de'
      ? page.category.name_de
      : page.category.name_en
    : null;

  const dateLocale = locale === 'de' ? de : enUS;
  const updatedAgo = page.updated_at
    ? formatDistanceToNow(new Date(page.updated_at), {
        addSuffix: true,
        locale: dateLocale,
      })
    : '';
  const createdDate = page.created_at
    ? format(new Date(page.created_at), 'PPP', { locale: dateLocale })
    : '';

  return (
    <article className="bg-card rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!page.is_locked && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/community/wiki/${page.slug}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/community/wiki/${page.slug}/history`}>
                <History className="h-4 w-4 mr-2" />
                {t('history')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {categoryName && (
            <Badge variant="secondary">
              <FolderOpen className="h-3 w-3 mr-1" />
              {categoryName}
            </Badge>
          )}
          {page.author && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={page.author.avatar_url || undefined} />
                <AvatarFallback>{page.author.display_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <span>{page.author.display_name || 'Anonymous'}</span>
            </div>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {updatedAgo}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {page.view_count || 0} {t('views')}
          </span>
          <span className="text-xs">
            v{page.revision_number}
          </span>
        </div>

        {page.is_locked && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm">
            <span className="font-medium">{t('pageLocked')}</span>
            {page.locked_reason && <span className="ml-2 text-muted-foreground">{page.locked_reason}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <Separator />
      <div className="p-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('createdOn', { date: createdDate })}</span>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="h-4 w-4 mr-2" />
          {t('reportPage')}
        </Button>
      </div>
    </article>
  );
}

export function WikiPageViewSkeleton() {
  return (
    <div className="bg-card rounded-lg border">
      <div className="p-6 border-b">
        <div className="flex items-start justify-between gap-4 mb-4">
          <Skeleton className="h-9 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
