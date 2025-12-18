/**
 * useCategoryManagement Hook
 *
 * Feature: Admin Panel with Category Management
 * Business logic for category CRUD operations with toast notifications
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import * as CategoryService from '@/lib/services/category-service';
import type { CategoryIssue } from '@/lib/services/category-service';

export function useCategoryManagement() {
  const { refresh } = useCategories();
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
        toast.error(`Failed to create category: ${error}`);
        return null;
      }

      toast.success('Category created successfully');
      refresh();
      return newCategory;
    },
    [refresh]
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
        toast.error(`Failed to update category: ${error}`);
        return null;
      }

      toast.success('Category updated successfully');
      refresh();
      return updated;
    },
    [refresh]
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

      toast.success('Category deleted successfully');
      refresh();
      return true;
    },
    [refresh]
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

      toast.success(`Category moved ${direction}`);
      refresh();
      return true;
    },
    [refresh]
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

      toast.success('Category indented (moved down a level)');
      refresh();
      return true;
    },
    [refresh]
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

      toast.success('Category outdented (moved up a level)');
      refresh();
      return true;
    },
    [refresh]
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
