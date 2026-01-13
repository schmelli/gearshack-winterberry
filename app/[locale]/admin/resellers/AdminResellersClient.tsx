/**
 * Admin Resellers Client Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Client-side admin panel for reseller management
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ResellerTable, ResellerFormDialog } from '@/components/admin/resellers';
import { useAdminResellers } from '@/hooks/admin/useAdminResellers';
import type { Reseller, ResellerStatus, ResellerType, CreateResellerInput } from '@/types/reseller';

// =============================================================================
// Component
// =============================================================================

export function AdminResellersClient() {
  const t = useTranslations('AdminResellers');
  const tCommon = useTranslations('Common');

  // Hook for reseller management
  const {
    resellers,
    total,
    page,
    hasMore,
    isLoading,
    error,
    filters,
    sortField,
    sortOrder,
    setPage,
    setFilters,
    setSort,
    createReseller,
    updateReseller,
    deleteReseller,
    toggleActive,
    updateStatus,
  } = useAdminResellers();

  // Local UI state
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Handle search
  const handleSearch = useCallback(() => {
    setFilters({ ...filters, search: searchInput });
    setPage(1);
  }, [filters, searchInput, setFilters, setPage]);

  // Handle filter changes
  const handleTypeFilter = useCallback(
    (value: string) => {
      setFilters({
        ...filters,
        type: value === 'all' ? undefined : (value as ResellerType),
      });
      setPage(1);
    },
    [filters, setFilters, setPage]
  );

  const handleStatusFilter = useCallback(
    (value: string) => {
      setFilters({
        ...filters,
        status: value === 'all' ? undefined : (value as ResellerStatus),
      });
      setPage(1);
    },
    [filters, setFilters, setPage]
  );

  // Handle create/edit
  const handleCreate = useCallback(() => {
    setEditingReseller(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((reseller: Reseller) => {
    setEditingReseller(reseller);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateResellerInput) => {
      setIsSubmitting(true);
      try {
        if (editingReseller) {
          await updateReseller(editingReseller.id, data);
          toast.success(t('toast.updated'));
        } else {
          await createReseller(data);
          toast.success(t('toast.created'));
        }
        setIsFormOpen(false);
        setEditingReseller(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : tCommon('errors.generic');
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingReseller, createReseller, updateReseller, t]
  );

  // Handle delete
  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteReseller(deleteId);
      toast.success(t('toast.deleted'));
    } catch (err) {
      const message = err instanceof Error ? err.message : tCommon('errors.generic');
      toast.error(message);
    } finally{
      setDeleteId(null);
    }
  }, [deleteId, deleteReseller, t]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (id: string, status: ResellerStatus) => {
      try {
        await updateStatus(id, status);
        toast.success(t('toast.statusUpdated'));
      } catch (err) {
        const message = err instanceof Error ? err.message : tCommon('errors.generic');
        toast.error(message);
      }
    },
    [updateStatus, t]
  );

  // Handle toggle active
  const handleToggleActive = useCallback(
    async (id: string) => {
      try {
        await toggleActive(id);
        toast.success(t('toast.activeToggled'));
      } catch (err) {
        const message = err instanceof Error ? err.message : tCommon('errors.generic');
        toast.error(message);
      }
    },
    [toggleActive, t]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addReseller')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filters.type || 'all'} onValueChange={handleTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('filterType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              <SelectItem value="local">{t('typeLocal')}</SelectItem>
              <SelectItem value="online">{t('typeOnline')}</SelectItem>
              <SelectItem value="chain">{t('typeChain')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="standard">{tCommon('resellerStatuses.standard')}</SelectItem>
              <SelectItem value="vip">{tCommon('resellerStatuses.vip')}</SelectItem>
              <SelectItem value="partner">{tCommon('resellerStatuses.partner')}</SelectItem>
              <SelectItem value="suspended">{tCommon('resellerStatuses.suspended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <ResellerTable
        resellers={resellers}
        isLoading={isLoading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={setSort}
        onToggleActive={handleToggleActive}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('showingResults', { count: resellers.length, total })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: Math.ceil(total / 20) || 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
          >
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      <ResellerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        reseller={editingReseller}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
