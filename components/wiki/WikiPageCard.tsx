/**
 * Wiki Page Card Component
 *
 * Feature: Community Section Restructure
 *
 * Displays a wiki page preview in a card format.
 */

'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FileText, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WikiPageWithAuthor } from '@/types/wiki';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface WikiPageCardProps {
  page: WikiPageWithAuthor;
}

export function WikiPageCard({ page }: WikiPageCardProps) {
  const locale = useLocale();
  const title = locale === 'de' ? page.title_de : page.title_en;
  const content = locale === 'de' ? page.content_de : page.content_en;
  const categoryName = page.category
    ? locale === 'de'
      ? page.category.name_de
      : page.category.name_en
    : null;

  // Get first 150 chars of content as preview
  const preview = content.slice(0, 150).replace(/[#*_`]/g, '') + (content.length > 150 ? '...' : '');

  const dateLocale = locale === 'de' ? de : enUS;
  const updatedAgo = page.updated_at
    ? formatDistanceToNow(new Date(page.updated_at), {
        addSuffix: true,
        locale: dateLocale,
      })
    : '';

  return (
    <Link href={`/community/wiki/${page.slug}`} className="block group">
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              <FileText className="h-4 w-4 inline-block mr-2 text-muted-foreground" />
              {title}
            </CardTitle>
            {categoryName && (
              <Badge variant="secondary" className="flex-shrink-0">
                {categoryName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{preview}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {page.author && (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={page.author.avatar_url || undefined} />
                    <AvatarFallback>
                      {page.author.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{page.author.display_name || 'Anonymous'}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {page.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {updatedAgo}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
