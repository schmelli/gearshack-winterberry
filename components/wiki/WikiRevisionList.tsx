/**
 * Wiki Revision List Component
 *
 * Feature: Community Section Restructure
 *
 * Displays revision history for a wiki page.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Calendar, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import type { WikiRevisionWithEditor } from '@/types/wiki';

interface WikiRevisionListProps {
  revisions: WikiRevisionWithEditor[];
  pageSlug: string;
  pageTitle: string;
  isLoading?: boolean;
}

export function WikiRevisionList({
  revisions,
  pageSlug,
  pageTitle,
  isLoading,
}: WikiRevisionListProps) {
  const t = useTranslations('Wiki');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/community/wiki/${pageSlug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToPage')}
            </Link>
          </Button>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('revisionHistory', { title: pageTitle })}
          </CardTitle>
        </div>
        <Badge variant="outline">{t('revisionCount', { count: revisions.length })}</Badge>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('noRevisions')}</p>
        ) : (
          <div className="space-y-4">
            {revisions.map((revision, index) => (
              <div
                key={revision.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={revision.editor?.avatar_url || undefined} />
                  <AvatarFallback>
                    {revision.editor?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      v{revision.revision_number}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="outline" className="text-green-600">
                        {t('current')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {revision.editor?.display_name || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {revision.created_at
                        ? format(new Date(revision.created_at), 'PPp', { locale: dateLocale })
                        : '-'}
                    </span>
                  </div>
                  {revision.edit_summary && (
                    <p className="text-sm mt-2 italic text-muted-foreground">
                      &quot;{revision.edit_summary}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
