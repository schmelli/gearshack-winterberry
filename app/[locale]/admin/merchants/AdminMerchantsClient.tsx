/**
 * AdminMerchantsClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T084
 *
 * Client component for the admin merchants page.
 * Handles merchant listing, filtering, and detail view.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, AlertCircle } from 'lucide-react';
import { useAdminMerchants } from '@/hooks/admin';
import { useAuth } from '@/hooks/useAuth';
import { AdminMerchantList } from '@/components/admin/AdminMerchantList';
import { AdminMerchantDetail } from '@/components/admin/AdminMerchantDetail';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';

export function AdminMerchantsClient() {
  const t = useTranslations('AdminMerchants');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Admin check
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin(data?.role === 'admin');
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  // Merchant management hook
  const {
    merchants,
    selectedMerchant,
    isLoading,
    isProcessing,
    error,
    pagination,
    filters,
    setFilters,
    setPage,
    selectMerchant,
    approveMerchant,
    rejectMerchant,
    suspendMerchant,
  } = useAdminMerchants();

  // Detail sheet state
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSelectMerchant = useCallback(
    async (id: string) => {
      await selectMerchant(id);
      setDetailOpen(true);
    },
    [selectMerchant]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    selectMerchant(null);
  }, [selectMerchant]);

  // Loading state
  if (authLoading || checkingAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('authRequired')}</AlertTitle>
          <AlertDescription>{t('authRequiredDesc')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/login')} className="mt-4">
          {t('goToLogin')}
        </Button>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>{t('accessDenied')}</AlertTitle>
          <AlertDescription>{t('accessDeniedDesc')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">
          {t('goHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard
          label={t('statPending')}
          value={merchants.filter((m) => m.status === 'pending').length}
          highlight
        />
        <StatCard
          label={t('statApproved')}
          value={merchants.filter((m) => m.status === 'approved').length}
        />
        <StatCard
          label={t('statRejected')}
          value={merchants.filter((m) => m.status === 'rejected').length}
        />
        <StatCard
          label={t('statSuspended')}
          value={merchants.filter((m) => m.status === 'suspended').length}
        />
      </div>

      {/* Merchant List */}
      <AdminMerchantList
        merchants={merchants}
        filters={filters}
        pagination={pagination}
        isLoading={isLoading}
        onFilterChange={setFilters}
        onPageChange={setPage}
        onSelectMerchant={handleSelectMerchant}
      />

      {/* Merchant Detail Sheet */}
      <AdminMerchantDetail
        merchant={selectedMerchant}
        open={detailOpen}
        onClose={handleCloseDetail}
        onApprove={approveMerchant}
        onReject={rejectMerchant}
        onSuspend={suspendMerchant}
        isProcessing={isProcessing}
      />
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight && value > 0 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
