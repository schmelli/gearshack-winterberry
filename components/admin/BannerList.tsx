/**
 * Banner List Component
 *
 * Feature: 056-community-hub-enhancements
 * Task: T031
 *
 * Displays all banners for admin management with status indicators.
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { CommunityBannerWithStatus, BannerStatus } from '@/types/banner';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BannerListProps {
  banners: CommunityBannerWithStatus[];
  onEdit: (banner: CommunityBannerWithStatus) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const STATUS_STYLES: Record<BannerStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  disabled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Component
// ============================================================================

export function BannerList({
  banners,
  onEdit,
  onDelete,
  isDeleting = false,
}: BannerListProps) {
  const t = useTranslations('Banner.admin');

  if (banners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-4xl">🎬</div>
        <h3 className="mb-2 text-lg font-semibold">{t('empty')}</h3>
        <p className="text-sm text-muted-foreground">
          Create your first banner to promote content on the community page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Preview</TableHead>
            <TableHead>Headline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead className="w-[80px]">Order</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banners.map((banner) => (
            <TableRow key={banner.id}>
              {/* Preview */}
              <TableCell>
                <div className="relative h-12 w-20 overflow-hidden rounded bg-muted">
                  <Image
                    src={banner.heroImageUrl}
                    alt={banner.ctaText}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              </TableCell>

              {/* Headline */}
              <TableCell>
                <div className="max-w-[300px]">
                  <p className="truncate font-medium">{banner.ctaText}</p>
                  <a
                    href={banner.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {banner.buttonText}
                  </a>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn('capitalize', STATUS_STYLES[banner.status])}
                >
                  {t(`status.${banner.status}`)}
                </Badge>
              </TableCell>

              {/* Visibility window */}
              <TableCell>
                <div className="text-xs">
                  <p>{formatDate(banner.visibilityStart)}</p>
                  <p className="text-muted-foreground">
                    → {formatDate(banner.visibilityEnd)}
                  </p>
                </div>
              </TableCell>

              {/* Display order */}
              <TableCell className="text-center">{banner.displayOrder}</TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(banner)}
                    title={t('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('confirmDelete')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(banner.id)}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
