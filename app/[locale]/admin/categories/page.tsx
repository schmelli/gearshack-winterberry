/**
 * Category Management Page
 *
 * Feature: Admin Panel with Category Management
 * Full CRUD interface for managing the category taxonomy
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { CategoryTree } from '@/components/admin/CategoryTree';
import { CategoryEditDialog } from '@/components/admin/CategoryEditDialog';
import { CategoryDeleteDialog } from '@/components/admin/CategoryDeleteDialog';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';
import type { Category } from '@/types/category';

export default function CategoriesPage() {
  const t = useTranslations('Admin.categories');
  const { categories, isLoading: categoriesLoading } = useCategories();
  const {
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
    isMoving: _isMoving,
    isLoadingIssues,
  } = useCategoryManagement();

  const [highlightIssues, setHighlightIssues] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  // Load issues on mount
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Create a Set of issue IDs for fast lookup
  const issueIds = new Set(issues.map((issue) => issue.categoryId));

  // Handlers
  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleMoveUp = async (category: Category) => {
    await moveCategory(category.id, 'up');
  };

  const handleMoveDown = async (category: Category) => {
    await moveCategory(category.id, 'down');
  };

  const handleIndent = async (category: Category) => {
    await indentCategory(category.id);
  };

  const handleOutdent = async (category: Category) => {
    await outdentCategory(category.id);
  };

  const handleAddChild = (parent: Category) => {
    setParentCategory(parent);
    setSelectedCategory(null); // Create mode, not edit mode
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (data: {
    label: string;
    slug: string;
    i18n: { en?: string; de?: string };
  }) => {
    if (selectedCategory) {
      // Edit existing category
      await updateCategory(selectedCategory.id, data);
    } else if (parentCategory) {
      // Create new child category
      await createCategory({
        parentId: parentCategory.id,
        level: (parentCategory.level + 1) as 1 | 2 | 3,
        label: data.label,
        slug: data.slug,
        i18n: data.i18n,
      });
    }
    setEditDialogOpen(false);
    setSelectedCategory(null);
    setParentCategory(null);
    // Reload issues after edit/create
    loadIssues();
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    const success = await deleteCategory(selectedCategory.id);
    if (success) {
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
      // Reload issues after delete
      loadIssues();
    }
  };

  if (categoriesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('pageDescription')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadIssues}
          disabled={isLoadingIssues}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingIssues ? 'animate-spin' : ''}`} />
          {t('refreshIssues')}
        </Button>
      </div>

      {/* Issues Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('categoryIssues')}
              </CardTitle>
              <CardDescription>
                {t('issuesCount', { count: issues.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="highlight-issues"
                checked={highlightIssues}
                onCheckedChange={setHighlightIssues}
              />
              <Label htmlFor="highlight-issues">{t('highlightIssues')}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('noIssuesFound')}
            </p>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 5).map((issue) => (
                <div
                  key={issue.categoryId}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{issue.categoryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {issue.issues.join(', ')}
                    </p>
                  </div>
                  <Badge variant="outline">L{issue.level}</Badge>
                </div>
              ))}
              {issues.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  {t('moreIssues', { count: issues.length - 5 })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('totalCategories')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('byLevel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <span>L1: {categories.filter((c) => c.level === 1).length}</span>
              <span>L2: {categories.filter((c) => c.level === 2).length}</span>
              <span>L3: {categories.filter((c) => c.level === 3).length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('issues')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{issues.length}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Category Tree */}
      <Card>
        <CardHeader>
          <CardTitle>{t('categoryHierarchy')}</CardTitle>
          <CardDescription>
            {t('hierarchyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryTree
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onIndent={handleIndent}
            onOutdent={handleOutdent}
            onAddChild={handleAddChild}
            highlightIssues={highlightIssues}
            issueIds={issueIds}
          />
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <CategoryEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setParentCategory(null);
          }
        }}
        category={selectedCategory}
        onSave={handleSaveEdit}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Dialog */}
      <CategoryDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        category={selectedCategory}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
