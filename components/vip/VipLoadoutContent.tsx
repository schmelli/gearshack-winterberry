'use client';

/**
 * VIP Loadout Content Component
 *
 * Feature: 052-vip-loadouts
 * Task: T032
 *
 * Client component for VIP loadout detail with bookmark/copy functionality.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { VipLoadoutDetail } from './VipLoadoutDetail';
import { useVipLoadout } from '@/hooks/vip/useVipLoadout';
import { useVipBookmark } from '@/hooks/vip/useVipBookmark';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutContentProps {
  vipSlug: string;
  loadoutSlug: string;
}

// =============================================================================
// Component
// =============================================================================

export function VipLoadoutContent({ vipSlug, loadoutSlug }: VipLoadoutContentProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('vip');
  const { user } = useAuthContext();

  const { status, loadout, error, refetch } = useVipLoadout(vipSlug, loadoutSlug);
  const {
    isBookmarked,
    isLoading: isBookmarkLoading,
    toggleBookmark,
  } = useVipBookmark(loadout?.id, loadout?.isBookmarked);

  const [isCopying, setIsCopying] = useState(false);

  // Handle copy to account
  const handleCopyToAccount = async () => {
    if (!loadout || !user) return;

    setIsCopying(true);
    try {
      const response = await fetch('/api/vip/copy-loadout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vipLoadoutId: loadout.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to copy loadout');
      }

      const data = await response.json();
      toast.success(t('loadout.copySuccess'), {
        description: data.loadoutName,
        action: {
          label: t('loadout.viewCopy'),
          onClick: () => router.push(`/${locale}/loadouts/${data.loadoutId}`),
        },
      });
    } catch (err) {
      toast.error(t('loadout.copyError'));
    } finally {
      setIsCopying(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">
              {t('loadout.errorTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not found
  if (!loadout) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-foreground">
            {t('loadout.notFound')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <VipLoadoutDetail
      loadout={loadout}
      isBookmarked={isBookmarked}
      onBookmarkToggle={toggleBookmark}
      onCopyToAccount={handleCopyToAccount}
      isAuthenticated={!!user}
      isCopying={isCopying}
      isBookmarking={isBookmarkLoading}
    />
  );
}

export default VipLoadoutContent;
