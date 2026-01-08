/**
 * User Management Admin Page
 *
 * Feature: Admin Section Enhancement
 *
 * Admin page for managing user accounts, roles, tiers, and moderation.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import {
  UserList,
  UserDetailSheet,
  SuspendUserDialog,
  BanUserDialog,
} from '@/components/admin/users';
import type { AdminUserView, SuspensionDuration } from '@/types/admin';

export default function UserManagementPage() {
  const t = useTranslations('Admin.users');
  const {
    users,
    isLoading,
    total,
    hasMore,
    searchQuery,
    filter,
    sort,
    search,
    setFilter,
    setSort,
    loadMore,
    changeRole,
    changeTier,
    suspendUser,
    unsuspendUser,
    banUser,
    unbanUser,
  } = useAdminUsers();

  // Local state for dialogs
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleViewUser = useCallback((user: AdminUserView) => {
    setSelectedUser(user);
    setDetailSheetOpen(true);
  }, []);

  const handleChangeRole = useCallback(
    async (userId: string, newRole: 'user' | 'admin') => {
      setIsProcessing(true);
      try {
        await changeRole({ userId, newRole });
        toast.success(t('roleChanged'));
        // Update selected user if viewing
        setSelectedUser((prev) =>
          prev?.id === userId ? { ...prev, role: newRole } : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [changeRole, t]
  );

  const handleChangeTier = useCallback(
    async (userId: string, newTier: 'standard' | 'trailblazer') => {
      setIsProcessing(true);
      try {
        await changeTier({ userId, newTier });
        toast.success(t('tierChanged'));
        // Update selected user if viewing
        setSelectedUser((prev) =>
          prev?.id === userId ? { ...prev, subscription_tier: newTier } : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [changeTier, t]
  );

  const handleOpenSuspendDialog = useCallback((user: AdminUserView) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  }, []);

  const handleSuspendConfirm = useCallback(
    async (userId: string, reason: string, duration: SuspensionDuration) => {
      setIsProcessing(true);
      try {
        await suspendUser({ userId, reason, duration });
        toast.success(t('userSuspended'));
        setSuspendDialogOpen(false);
        // Update selected user
        setSelectedUser((prev) =>
          prev?.id === userId
            ? { ...prev, account_status: 'suspended' as const }
            : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [suspendUser, t]
  );

  const handleUnsuspend = useCallback(
    async (userId: string) => {
      setIsProcessing(true);
      try {
        await unsuspendUser(userId);
        toast.success(t('userUnsuspended'));
        // Update selected user
        setSelectedUser((prev) =>
          prev?.id === userId
            ? { ...prev, account_status: 'active' as const }
            : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [unsuspendUser, t]
  );

  const handleOpenBanDialog = useCallback((user: AdminUserView) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  }, []);

  const handleBanConfirm = useCallback(
    async (userId: string, reason: string) => {
      setIsProcessing(true);
      try {
        await banUser({ userId, reason });
        toast.success(t('userBanned'));
        setBanDialogOpen(false);
        // Update selected user
        setSelectedUser((prev) =>
          prev?.id === userId
            ? { ...prev, account_status: 'banned' as const }
            : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [banUser, t]
  );

  const handleUnban = useCallback(
    async (userId: string) => {
      setIsProcessing(true);
      try {
        await unbanUser(userId);
        toast.success(t('userUnbanned'));
        // Update selected user
        setSelectedUser((prev) =>
          prev?.id === userId
            ? { ...prev, account_status: 'active' as const }
            : prev
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error');
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [unbanUser, t]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* User List */}
      <UserList
        users={users}
        isLoading={isLoading}
        total={total}
        hasMore={hasMore}
        searchQuery={searchQuery}
        filter={filter}
        sort={sort}
        onSearch={search}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onLoadMore={loadMore}
        onViewUser={handleViewUser}
        onChangeRole={handleChangeRole}
        onChangeTier={handleChangeTier}
        onSuspend={handleOpenSuspendDialog}
        onUnsuspend={handleUnsuspend}
        onBan={handleOpenBanDialog}
        onUnban={handleUnban}
      />

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onChangeRole={handleChangeRole}
        onChangeTier={handleChangeTier}
        onSuspend={() => {
          setDetailSheetOpen(false);
          setSuspendDialogOpen(true);
        }}
        onUnsuspend={handleUnsuspend}
        onBan={() => {
          setDetailSheetOpen(false);
          setBanDialogOpen(true);
        }}
        onUnban={handleUnban}
      />

      {/* Suspend Dialog */}
      <SuspendUserDialog
        user={selectedUser}
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        onConfirm={handleSuspendConfirm}
        isLoading={isProcessing}
      />

      {/* Ban Dialog */}
      <BanUserDialog
        user={selectedUser}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        onConfirm={handleBanConfirm}
        isLoading={isProcessing}
      />
    </div>
  );
}
