/**
 * Announcement Admin Page
 *
 * Feature: Community Hub Enhancement
 *
 * Admin page for managing community announcements.
 * Similar to banner admin but for dismissible announcements.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAnnouncementAdmin } from '@/hooks/announcement';
import { AnnouncementForm } from '@/components/admin/AnnouncementForm';
import { AnnouncementList } from '@/components/admin/AnnouncementList';
import type {
  CommunityAnnouncementWithStatus,
  CreateAnnouncementInput,
} from '@/types/community';

export default function AnnouncementAdminPage() {
  const t = useTranslations('Announcement.admin');
  const {
    announcements,
    loadingState,
    createNewAnnouncement,
    updateExistingAnnouncement,
    deleteExistingAnnouncement,
  } = useAnnouncementAdmin();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<CommunityAnnouncementWithStatus | null>(null);

  // Open sheet for creating new announcement
  const handleCreate = useCallback(() => {
    setEditingAnnouncement(null);
    setIsSheetOpen(true);
  }, []);

  // Open sheet for editing announcement
  const handleEdit = useCallback(
    (announcement: CommunityAnnouncementWithStatus) => {
      setEditingAnnouncement(announcement);
      setIsSheetOpen(true);
    },
    []
  );

  // Close sheet
  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    setEditingAnnouncement(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: CreateAnnouncementInput) => {
      try {
        if (editingAnnouncement) {
          await updateExistingAnnouncement(editingAnnouncement.id, data);
          toast.success(t('saved'));
        } else {
          await createNewAnnouncement(data);
          toast.success(t('saved'));
        }
        handleClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      }
    },
    [
      editingAnnouncement,
      createNewAnnouncement,
      updateExistingAnnouncement,
      handleClose,
      t,
    ]
  );

  // Handle announcement deletion
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteExistingAnnouncement(id);
        toast.success(t('deleted'));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      }
    },
    [deleteExistingAnnouncement, t]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Announcement list */}
      <AnnouncementList
        announcements={announcements}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={loadingState === 'deleting'}
      />

      {/* Create/Edit sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingAnnouncement ? t('edit') : t('create')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AnnouncementForm
              announcement={editingAnnouncement ?? undefined}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isSubmitting={loadingState === 'submitting'}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
