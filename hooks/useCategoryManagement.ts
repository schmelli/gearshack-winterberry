/**
 * useCategoryManagement Hook
 *
 * Feature: Admin Panel with Category Management
 * Business logic for category CRUD operations with toast notifications
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCategories } from '@/hooks/useCategories';
import * as CategoryService from '@/lib/services/category-service';
import type { CategoryIssue } from '@/lib/services/category-service';

export function useCategoryManagement() {
  const { refresh } = useCategories();
  const t = useTranslations('CategoryManagement');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [issues, setIssues] = useState<CategoryIssue[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);

  const createCategory = useCallback(
    async (data: {
      parentId: string | null;
      level: 1 | 2 | 3;
      label: string;
      slug: string;
      i18n: { en?: string; de?: string };
    }) => {
      setIsCreating(true);
      const { data: newCategory, error } = await CategoryService.createCategory(data);
      setIsCreating(false);

      if (error) {
        toast.error(t('createFailed', { error }));
        return null;
      }

      toast.success(t('createSuccess'));
      refresh();
      return newCategory;
    },
    [refresh, t]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      data: {
        label?: string;
        slug?: string;
        i18n?: { en?: string; de?: string };
      }
    ) => {
      setIsUpdating(true);
      const { data: updated, error } = await CategoryService.updateCategory(id, data);
      setIsUpdating(false);

      if (error) {
        toast.error(t('updateFailed', { error }));
        return null;
      }

      toast.success(t('updateSuccess'));
      refresh();
      return updated;
    },
    [refresh, t]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      const { error } = await CategoryService.deleteCategory(id);
      setIsDeleting(false);

      if (error) {
        toast.error(error);
        return false;
      }

      toast.success(t('deleteSuccess'));
      refresh();
      return true;
    },
    [refresh, t]
  );

  const moveCategory = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      setIsMoving(true);
      const { error } = await CategoryService.moveCategory(id, direction);
      setIsMoving(false);

      if (error) {
        toast.error(error);
        return false;
      }

      toast.success(t('moveSuccess', { direction }));
      refresh();
      return true;
    },
    [refresh, t]
  );

  const indentCategory = useCallback(
    async (id: string) => {
      setIsMoving(true);
      const { error } = await CategoryService.indentCategory(id);
      setIsMoving(false);

      if (error) {
        toast.error(error);
        return false;
      }

      toast.success(t('indentSuccess'));
      refresh();
      return true;
    },
    [refresh, t]
  );

  const outdentCategory = useCallback(
    async (id: string) => {
      setIsMoving(true);
      const { error } = await CategoryService.outdentCategory(id);
      setIsMoving(false);

      if (error) {
        toast.error(error);
        return false;
      }

      toast.success(t('outdentSuccess'));
      refresh();
      return true;
    },
    [refresh, t]
  );

  const loadIssues = useCallback(async () => {
    setIsLoadingIssues(true);
    const categoryIssues = await CategoryService.getCategoryIssues();
    setIssues(categoryIssues);
    setIsLoadingIssues(false);
  }, []);

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    indentCategory,
    outdentCategory,
    loadIssues,
    issues,
    isCreating,
    isUpdating,
    isDeleting,
    isMoving,
    isLoadingIssues,
  };
}
