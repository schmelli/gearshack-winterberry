/**
 * Banner Admin Page
 *
 * Feature: 056-community-hub-enhancements
 * Task: T032
 *
 * Admin page for managing community banners.
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
import { useBannerAdmin } from '@/hooks/banner';
import { BannerForm } from '@/components/admin/BannerForm';
import { BannerList } from '@/components/admin/BannerList';
import type { CommunityBannerWithStatus, CreateBannerInput } from '@/types/banner';

export default function BannerAdminPage() {
  const t = useTranslations('Banner.admin');
  const {
    banners,
    loadingState,
    createNewBanner,
    updateExistingBanner,
    deleteExistingBanner,
  } = useBannerAdmin();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CommunityBannerWithStatus | null>(
    null
  );

  // Open sheet for creating new banner
  const handleCreate = useCallback(() => {
    setEditingBanner(null);
    setIsSheetOpen(true);
  }, []);

  // Open sheet for editing banner
  const handleEdit = useCallback((banner: CommunityBannerWithStatus) => {
    setEditingBanner(banner);
    setIsSheetOpen(true);
  }, []);

  // Close sheet
  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    setEditingBanner(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: CreateBannerInput) => {
      try {
        if (editingBanner) {
          await updateExistingBanner(editingBanner.id, data);
          toast.success(t('saved'));
        } else {
          await createNewBanner(data);
          toast.success(t('saved'));
        }
        handleClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('error');
        toast.error(message);
      }
    },
    [editingBanner, createNewBanner, updateExistingBanner, handleClose, t]
  );

  // Handle banner deletion
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteExistingBanner(id);
        toast.success(t('deleted'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('error');
        toast.error(message);
      }
    },
    [deleteExistingBanner, t]
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

      {/* Banner list */}
      <BannerList
        banners={banners}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={loadingState === 'deleting'}
      />

      {/* Create/Edit sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingBanner ? t('edit') : t('create')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BannerForm
              banner={editingBanner ?? undefined}
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
