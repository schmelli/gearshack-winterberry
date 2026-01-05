'use client';

/**
 * Post Menu Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T032
 *
 * Three-dot dropdown menu with Edit/Delete/Report options.
 * Authors can edit their posts at any time.
 */

import { useTranslations } from 'next-intl';
import { MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthor: boolean;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PostMenu({
  isOpen,
  onOpenChange,
  isAuthor,
  canEdit,
  onEdit,
  onDelete,
  onReport,
}: PostMenuProps) {
  const t = useTranslations('bulletin');

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Author actions */}
        {isAuthor && (
          <>
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              {t('menu.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('menu.delete')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Report (available to everyone) */}
        <DropdownMenuItem onClick={onReport} className="gap-2">
          <Flag className="h-4 w-4" />
          {t('menu.report')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
