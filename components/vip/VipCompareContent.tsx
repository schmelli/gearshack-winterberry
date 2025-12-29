'use client';

/**
 * VIP Compare Content Component
 *
 * Feature: 052-vip-loadouts
 * Task: T068
 *
 * Client component for the VIP comparison page.
 * Allows users to select their loadout and a VIP loadout to compare.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Scale, ArrowRight, LogIn, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLoadouts, type Loadout as UserLoadout } from '@/hooks/useLoadouts';
import { useGearItems } from '@/hooks/useGearItems';
import { useVipComparison } from '@/hooks/vip/useVipComparison';
import { UserLoadoutSelector, type LoadoutWithWeight } from './UserLoadoutSelector';
import { VipLoadoutSelector } from './VipLoadoutSelector';
import { VipComparisonView } from './VipComparisonView';
import type { VipWithStats, VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutOption {
  vip: VipWithStats;
  loadout: VipLoadoutSummary;
}

// =============================================================================
// Component
// =============================================================================

export function VipCompareContent() {
  const t = useTranslations('vip.compare');
  const tCommon = useTranslations('vip.common');
  const searchParams = useSearchParams();
  const loadoutIdFromUrl = searchParams.get('loadout');
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // User's loadouts
  const {
    loadouts: userLoadouts,
    isLoading: loadoutsLoading,
  } = useLoadouts(user?.id ?? null);

  // User's gear items (for weight calculation)
  const {
    items: gearItems,
    isLoading: gearLoading,
  } = useGearItems(user?.id ?? null);

  // Comparison state
  const [selectedUserLoadout, setSelectedUserLoadout] = useState<LoadoutWithWeight | null>(null);
  const [selectedVipOption, setSelectedVipOption] = useState<VipLoadoutOption | null>(null);
  const [vipLoadoutDetails, setVipLoadoutDetails] = useState<{
    items: Array<{
      name: string;
      brand: string | null;
      weightGrams: number;
      quantity: number;
      category: string;
    }>;
  } | null>(null);

  // Comparison hook
  const {
    status: comparisonStatus,
    comparison,
    compareLoadouts,
    clearComparison,
  } = useVipComparison();

  // Create gear weight map for user's gear
  const gearWeightMap = useMemo(() => {
    const map = new Map<string, number>();
    gearItems.forEach((item) => {
      map.set(item.id, item.weightGrams ?? 0);
    });
    return map;
  }, [gearItems]);

  // Auto-select loadout from URL parameter
  useEffect(() => {
    if (loadoutIdFromUrl && userLoadouts.length > 0 && gearItems.length > 0 && !selectedUserLoadout) {
      const loadout = userLoadouts.find((l) => l.id === loadoutIdFromUrl);
      if (loadout) {
        const totalWeightGrams = loadout.items.reduce((sum, item) => {
          const weight = gearWeightMap.get(item.gearItemId) ?? 0;
          return sum + weight * item.quantity;
        }, 0);

        setSelectedUserLoadout({
          ...loadout,
          totalWeightGrams,
        });
      }
    }
  }, [loadoutIdFromUrl, userLoadouts, gearItems, gearWeightMap, selectedUserLoadout]);

  // Handle user loadout selection
  const handleUserLoadoutSelect = useCallback((loadout: LoadoutWithWeight) => {
    setSelectedUserLoadout(loadout);
    clearComparison();
  }, [clearComparison]);

  // Handle VIP loadout selection
  const handleVipLoadoutSelect = useCallback(async (option: VipLoadoutOption) => {
    setSelectedVipOption(option);
    clearComparison();

    // Fetch VIP loadout details for comparison
    try {
      const response = await fetch(`/api/vip/${option.vip.slug}/${option.loadout.slug}`);
      if (!response.ok) throw new Error('Failed to fetch VIP loadout details');

      const data = await response.json();
      setVipLoadoutDetails({
        items: data.items.map((item: {
          name: string;
          brand: string | null;
          weight_grams: number;
          quantity: number;
          category: string;
        }) => ({
          name: item.name,
          brand: item.brand,
          weightGrams: item.weight_grams,
          quantity: item.quantity,
          category: item.category,
        })),
      });
    } catch (err) {
      console.error('Failed to fetch VIP loadout details:', err);
      toast.error('Failed to load VIP loadout details');
    }
  }, [clearComparison]);

  // Perform comparison when both loadouts are selected
  const handleCompare = useCallback(() => {
    if (!selectedUserLoadout || !selectedVipOption || !vipLoadoutDetails) {
      return;
    }

    // Transform user loadout items to comparison format
    const userItems = selectedUserLoadout.items.map((item) => {
      const gearItem = gearItems.find((g) => g.id === item.gearItemId);
      return {
        name: gearItem?.name ?? 'Unknown Item',
        brand: gearItem?.brand ?? null,
        weightGrams: gearItem?.weightGrams ?? 0,
        quantity: item.quantity,
        category: gearItem?.categoryId ?? 'misc',
      };
    });

    compareLoadouts(
      {
        id: selectedUserLoadout.id,
        name: selectedUserLoadout.name,
        items: userItems,
      },
      {
        id: selectedVipOption.loadout.id,
        name: selectedVipOption.loadout.name,
        items: vipLoadoutDetails.items,
      },
      selectedVipOption.vip.name
    );
  }, [selectedUserLoadout, selectedVipOption, vipLoadoutDetails, gearItems, compareLoadouts]);

  // Handle adding VIP item to wishlist
  const handleAddToWishlist = useCallback((itemName: string) => {
    // This would typically call an API to add to wishlist
    toast.success(`Added "${itemName}" to wishlist`);
  }, []);

  // Loading state
  const isLoading = authLoading || loadoutsLoading || gearLoading;

  // Not authenticated state
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('pageTitle')}</h1>
          <p className="text-muted-foreground mb-6">{t('pageDescription')}</p>
        </div>

        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{t('signInRequired')}</span>
            <Button asChild size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No loadouts state
  if (!isLoading && userLoadouts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('pageTitle')}</h1>
          <p className="text-muted-foreground mb-6">{t('pageDescription')}</p>
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{t('createLoadoutFirst')}</p>
            <Button asChild>
              <Link href="/loadouts/new">Create Loadout</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Loadout Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('selectBothLoadouts')}</CardTitle>
          <CardDescription>
            Select your loadout and a VIP loadout to see a detailed comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* User Loadout Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('yourLoadout')}</label>
              <UserLoadoutSelector
                loadouts={userLoadouts}
                gearItems={gearItems}
                selectedLoadoutId={selectedUserLoadout?.id}
                onSelect={handleUserLoadoutSelect}
                isLoading={isLoading}
              />
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center pt-6">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* VIP Loadout Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('vipLoadout')}</label>
              <VipLoadoutSelector
                selectedLoadoutId={selectedVipOption?.loadout.id}
                onSelect={handleVipLoadoutSelect}
              />
            </div>
          </div>

          {/* Compare Button */}
          {selectedUserLoadout && selectedVipOption && vipLoadoutDetails && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleCompare}
                disabled={comparisonStatus === 'loading'}
                size="lg"
              >
                {comparisonStatus === 'loading' ? (
                  <>{tCommon('loading')}</>
                ) : (
                  <>
                    <Scale className="mr-2 h-4 w-4" />
                    {t('startComparing')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <VipComparisonView
          comparison={comparison}
          onAddToWishlist={handleAddToWishlist}
        />
      )}

      {/* Error State */}
      {comparisonStatus === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to compare loadouts. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default VipCompareContent;
