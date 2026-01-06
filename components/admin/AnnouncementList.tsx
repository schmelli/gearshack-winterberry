/**
 * Announcement List Component
 *
 * Feature: Community Hub Enhancement
 *
 * Displays all announcements for admin management with status indicators.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Pencil,
  Trash2,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle,
  Tag,
} from 'lucide-react';
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
import type {
  CommunityAnnouncementWithStatus,
  AnnouncementStatus,
  AnnouncementType,
} from '@/types/community';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AnnouncementListProps {
  announcements: CommunityAnnouncementWithStatus[];
  onEdit: (announcement: CommunityAnnouncementWithStatus) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const STATUS_STYLES: Record<AnnouncementStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  disabled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TYPE_ICONS: Record<AnnouncementType, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  success: <CheckCircle className="h-4 w-4 text-green-600" />,
  promo: <Tag className="h-4 w-4 text-purple-600" />,
};

const TYPE_COLORS: Record<AnnouncementType, string> = {
  info: 'bg-blue-100 dark:bg-blue-900/30',
  warning: 'bg-amber-100 dark:bg-amber-900/30',
  success: 'bg-green-100 dark:bg-green-900/30',
  promo: 'bg-purple-100 dark:bg-purple-900/30',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
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

export function AnnouncementList({
  announcements,
  onEdit,
  onDelete,
  isDeleting = false,
}: AnnouncementListProps) {
  const t = useTranslations('Announcement.admin');

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-4xl">📢</div>
        <h3 className="mb-2 text-lg font-semibold">{t('empty')}</h3>
        <p className="text-sm text-muted-foreground">
          Create your first announcement to notify users on the community page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Visibility</TableHead>
            <TableHead className="w-[80px]">Priority</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((announcement) => (
            <TableRow key={announcement.id}>
              {/* Type icon */}
              <TableCell>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded',
                    TYPE_COLORS[announcement.type]
                  )}
                >
                  {TYPE_ICONS[announcement.type]}
                </div>
              </TableCell>

              {/* Title */}
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="truncate font-medium">{announcement.title}</p>
                  {announcement.link_url && (
                    <a
                      href={announcement.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {announcement.link_text || 'Link'}
                    </a>
                  )}
                </div>
              </TableCell>

              {/* Message (hidden on mobile) */}
              <TableCell className="hidden md:table-cell">
                <p className="max-w-[300px] truncate text-sm text-muted-foreground">
                  {announcement.message}
                </p>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn('capitalize', STATUS_STYLES[announcement.status])}
                >
                  {t(`status.${announcement.status}`)}
                </Badge>
              </TableCell>

              {/* Visibility window (hidden on mobile) */}
              <TableCell className="hidden sm:table-cell">
                <div className="text-xs">
                  <p>{formatDate(announcement.starts_at)}</p>
                  <p className="text-muted-foreground">
                    → {formatDate(announcement.ends_at)}
                  </p>
                </div>
              </TableCell>

              {/* Priority */}
              <TableCell className="text-center">{announcement.priority}</TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(announcement)}
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
                          onClick={() => onDelete(announcement.id)}
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
