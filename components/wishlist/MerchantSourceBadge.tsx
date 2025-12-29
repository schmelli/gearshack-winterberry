/**
 * Merchant Source Badge Component
 *
 * Feature: 053-merchant-integration
 * Task: T087
 *
 * Shows merchant attribution for wishlist items added from merchant loadouts.
 * Handles edge case when source loadout becomes unpublished (shows "No longer available").
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Store, AlertTriangle, ExternalLink } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface MerchantSourceBadgeProps {
  /** ID of the source merchant */
  sourceMerchantId: string | null;
  /** ID of the source loadout */
  sourceLoadoutId: string | null;
  /** Optional class name */
  className?: string;
}

interface SourceInfo {
  merchantName: string;
  loadoutName: string | null;
  loadoutSlug: string | null;
  isAvailable: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function MerchantSourceBadge({
  sourceMerchantId,
  sourceLoadoutId,
  className,
}: MerchantSourceBadgeProps) {
  const t = useTranslations('MerchantSource');
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sourceMerchantId) {
      setSourceInfo(null);
      return;
    }

    async function fetchSourceInfo() {
      setIsLoading(true);
      try {
        const supabase = createBrowserClient();

        // Fetch merchant name
        const { data: merchant } = await supabase
          .from('merchants')
          .select('business_name')
          .eq('id', sourceMerchantId)
          .single();

        if (!merchant) {
          setSourceInfo(null);
          setIsLoading(false);
          return;
        }

        // If we have a source loadout, check its status
        let loadoutInfo: {
          name: string;
          slug: string;
          status: string;
        } | null = null;

        if (sourceLoadoutId) {
          const { data: loadout } = await supabase
            .from('merchant_loadouts')
            .select('name, slug, status')
            .eq('id', sourceLoadoutId)
            .single();

          loadoutInfo = loadout;
        }

        setSourceInfo({
          merchantName: merchant.business_name,
          loadoutName: loadoutInfo?.name ?? null,
          loadoutSlug: loadoutInfo?.slug ?? null,
          isAvailable: loadoutInfo?.status === 'published',
        });
      } catch (error) {
        console.error('Failed to fetch merchant source info:', error);
        setSourceInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSourceInfo();
  }, [sourceMerchantId, sourceLoadoutId]);

  // Don't render if no merchant source
  if (!sourceMerchantId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-6 w-32 rounded bg-muted" />
      </div>
    );
  }

  // No data found
  if (!sourceInfo) {
    return null;
  }

  // Loadout no longer available
  if (sourceLoadoutId && !sourceInfo.isAvailable) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <Store className="h-3 w-3" />
          {sourceInfo.merchantName}
        </Badge>
        <Badge variant="secondary" className="gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {t('noLongerAvailable')}
        </Badge>
      </div>
    );
  }

  // Loadout still available - show link
  if (sourceInfo.loadoutSlug && sourceInfo.loadoutName) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="gap-1.5">
          <Store className="h-3 w-3" />
          {sourceInfo.merchantName}
        </Badge>
        <Link
          href={`/community/merchant-loadouts/${sourceInfo.loadoutSlug}`}
          className="group inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {sourceInfo.loadoutName}
          <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    );
  }

  // Just merchant, no loadout
  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      <Store className="h-3 w-3" />
      {t('addedFrom', { merchant: sourceInfo.merchantName })}
    </Badge>
  );
}

export default MerchantSourceBadge;
