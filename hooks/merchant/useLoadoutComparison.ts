/**
 * useLoadoutComparison Hook
 *
 * Feature: 053-merchant-integration
 * Task: T076
 *
 * Hook for comparing merchant loadouts with user loadouts.
 * Fetches both loadouts and calculates differences by category.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Helper to get supabase client with any typing for merchant tables
 * TODO: Remove after regenerating types from migrations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMerchantClient(): any {
  return createClient();
}
import type {
  LoadoutComparisonItem,
  MerchantLoadoutDetail,
} from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

interface ComparisonDifference {
  categoryId: string;
  categoryName: string;
  merchantItem: {
    name: string;
    brand: string | null;
    price: number;
    weightGrams: number | null;
  } | null;
  userItem: {
    name: string;
    brand: string | null;
  } | null;
  priceDiff: number | null;
  weightDiff: number | null;
}

interface UserLoadoutOption {
  id: string;
  name: string;
  totalWeightGrams: number;
  itemCount: number;
}

export interface UseLoadoutComparisonReturn {
  // Data
  merchantLoadout: LoadoutComparisonItem | null;
  userLoadout: LoadoutComparisonItem | null;
  differences: ComparisonDifference[];
  userLoadoutOptions: UserLoadoutOption[];

  // State
  isLoading: boolean;
  isLoadingOptions: boolean;
  error: string | null;

  // Actions
  loadMerchantLoadout: (loadoutId: string) => Promise<void>;
  selectUserLoadout: (loadoutId: string) => Promise<void>;
  fetchUserLoadoutOptions: () => Promise<void>;
  clearComparison: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutComparison(): UseLoadoutComparisonReturn {
  const supabase = useMemo(() => getMerchantClient(), []);
  const { user } = useAuth();

  // State
  const [merchantLoadout, setMerchantLoadout] =
    useState<LoadoutComparisonItem | null>(null);
  const [merchantLoadoutDetail, setMerchantLoadoutDetail] =
    useState<MerchantLoadoutDetail | null>(null);
  const [userLoadout, setUserLoadout] =
    useState<LoadoutComparisonItem | null>(null);
  const [userLoadoutItems, setUserLoadoutItems] = useState<
    Array<{
      categoryId: string | null;
      categoryName: string;
      name: string;
      brand: string | null;
      weightGrams: number | null;
    }>
  >([]);
  const [userLoadoutOptions, setUserLoadoutOptions] = useState<
    UserLoadoutOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * T080: Calculate category-based item matching for comparison
   */
  const differences = useMemo<ComparisonDifference[]>(() => {
    if (!merchantLoadoutDetail) return [];

    // Group merchant items by category
    const merchantByCategory = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        name: string;
        brand: string | null;
        price: number;
        weightGrams: number | null;
      }
    >();

    merchantLoadoutDetail.items.forEach((item) => {
      const categoryId = item.catalogItem.categoryId ?? 'uncategorized';
      const categoryName = 'Category'; // Would need to fetch category names

      if (!merchantByCategory.has(categoryId)) {
        merchantByCategory.set(categoryId, {
          categoryId,
          categoryName,
          name: item.catalogItem.name,
          brand: item.catalogItem.brand,
          price: item.catalogItem.price * item.quantity,
          weightGrams: item.catalogItem.weightGrams
            ? item.catalogItem.weightGrams * item.quantity
            : null,
        });
      }
    });

    // Group user items by category
    const userByCategory = new Map<
      string,
      {
        name: string;
        brand: string | null;
        weightGrams: number | null;
      }
    >();

    userLoadoutItems.forEach((item) => {
      const categoryId = item.categoryId ?? 'uncategorized';
      if (!userByCategory.has(categoryId)) {
        userByCategory.set(categoryId, {
          name: item.name,
          brand: item.brand,
          weightGrams: item.weightGrams,
        });
      }
    });

    // Create comparison for all categories
    const allCategories = new Set([
      ...merchantByCategory.keys(),
      ...userByCategory.keys(),
    ]);

    const result: ComparisonDifference[] = [];
    allCategories.forEach((categoryId) => {
      const merchantItem = merchantByCategory.get(categoryId) ?? null;
      const userItem = userByCategory.get(categoryId) ?? null;

      const weightDiff =
        merchantItem?.weightGrams && userItem?.weightGrams
          ? merchantItem.weightGrams - userItem.weightGrams
          : null;

      result.push({
        categoryId,
        categoryName: merchantItem?.categoryName ?? 'Other',
        merchantItem: merchantItem
          ? {
              name: merchantItem.name,
              brand: merchantItem.brand,
              price: merchantItem.price,
              weightGrams: merchantItem.weightGrams,
            }
          : null,
        userItem: userItem
          ? {
              name: userItem.name,
              brand: userItem.brand,
            }
          : null,
        priceDiff: merchantItem?.price ?? null,
        weightDiff,
      });
    });

    return result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [merchantLoadoutDetail, userLoadoutItems]);

  /**
   * Load merchant loadout for comparison
   */
  const loadMerchantLoadout = useCallback(
    async (loadoutId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('merchant_loadouts')
          .select(
            `
            *,
            merchants!inner (
              id,
              business_name,
              logo_url
            ),
            merchant_loadout_items (
              *,
              merchant_catalog_items (*)
            )
          `
          )
          .eq('id', loadoutId)
          .single();

        if (fetchError) throw fetchError;

        // Calculate totals
        const items = data.merchant_loadout_items || [];
        const totalWeight = items.reduce(
          (sum: number, item: { quantity: number; merchant_catalog_items: { weight_grams: number | null } }) =>
            sum + (item.merchant_catalog_items?.weight_grams ?? 0) * item.quantity,
          0
        );
        const totalPrice = items.reduce(
          (sum: number, item: { quantity: number; merchant_catalog_items: { price: number } }) =>
            sum + (item.merchant_catalog_items?.price ?? 0) * item.quantity,
          0
        );
        const discountedPrice = totalPrice * (1 - (data.discount_percent ?? 0) / 100);

        setMerchantLoadout({
          id: data.id,
          name: data.name,
          ownerName: data.merchants.business_name,
          isMerchant: true,
          totalWeightGrams: totalWeight,
          bundlePrice: discountedPrice,
          itemCount: items.length,
        });

        // Store full detail for comparison
        setMerchantLoadoutDetail({
          id: data.id,
          merchantId: data.merchant_id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          tripType: data.trip_type,
          season: data.season,
          status: data.status,
          discountPercent: data.discount_percent ?? 0,
          isFeatured: data.is_featured,
          featuredUntil: data.featured_until,
          heroImageUrl: data.hero_image_url,
          viewCount: data.view_count,
          wishlistAddCount: data.wishlist_add_count,
          publishedAt: data.published_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          merchant: {
            id: data.merchants.id,
            businessName: data.merchants.business_name,
            logoUrl: data.merchants.logo_url,
            businessType: data.merchants.business_type || 'local',
            isVerified: data.merchants.status === 'approved',
          },
          items: items.map((item: {
            id: string;
            loadout_id: string;
            catalog_item_id: string;
            quantity: number;
            expert_note: string | null;
            sort_order: number;
            created_at: string;
            merchant_catalog_items: {
              id: string;
              merchant_id: string;
              sku: string;
              name: string;
              brand: string | null;
              description: string | null;
              price: number;
              weight_grams: number | null;
              category_id: string | null;
              image_url: string | null;
              external_url: string | null;
              is_active: boolean;
              created_at: string;
              updated_at: string;
            };
          }) => ({
            id: item.id,
            loadoutId: item.loadout_id,
            catalogItemId: item.catalog_item_id,
            quantity: item.quantity,
            expertNote: item.expert_note,
            sortOrder: item.sort_order,
            createdAt: item.created_at,
            catalogItem: {
              id: item.merchant_catalog_items.id,
              merchantId: item.merchant_catalog_items.merchant_id,
              sku: item.merchant_catalog_items.sku,
              name: item.merchant_catalog_items.name,
              brand: item.merchant_catalog_items.brand,
              description: item.merchant_catalog_items.description,
              price: item.merchant_catalog_items.price,
              weightGrams: item.merchant_catalog_items.weight_grams,
              categoryId: item.merchant_catalog_items.category_id,
              imageUrl: item.merchant_catalog_items.image_url,
              externalUrl: item.merchant_catalog_items.external_url,
              isActive: item.merchant_catalog_items.is_active,
              createdAt: item.merchant_catalog_items.created_at,
              updatedAt: item.merchant_catalog_items.updated_at,
            },
          })),
          availability: [],
          pricing: {
            individualTotal: totalPrice,
            discountPercent: data.discount_percent ?? 0,
            discountAmount: totalPrice * ((data.discount_percent ?? 0) / 100),
            bundlePrice: discountedPrice,
            totalWeightGrams: totalWeight,
          },
        });
      } catch (err) {
        console.error('Failed to load merchant loadout:', err);
        setError('Failed to load merchant loadout');
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Fetch user's loadout options for comparison
   */
  const fetchUserLoadoutOptions = useCallback(async () => {
    if (!user) return;

    setIsLoadingOptions(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('loadouts')
        .select(
          `
          id,
          name,
          loadout_items (
            quantity,
            gear_items (
              weight
            )
          )
        `
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: UserLoadoutOption[] = (data || []).map((loadout: any) => {
        const items = loadout.loadout_items || [];
        const totalWeight = items.reduce(
          (sum: number, item: { quantity: number; gear_items: { weight: number | null } | null }) =>
            sum + (item.gear_items?.weight ?? 0) * item.quantity,
          0
        );

        return {
          id: loadout.id,
          name: loadout.name,
          totalWeightGrams: totalWeight,
          itemCount: items.length,
        };
      });

      setUserLoadoutOptions(options);
    } catch (err) {
      console.error('Failed to fetch user loadouts:', err);
    } finally {
      setIsLoadingOptions(false);
    }
  }, [user, supabase]);

  /**
   * Select a user loadout for comparison
   */
  const selectUserLoadout = useCallback(
    async (loadoutId: string) => {
      if (!user) return;

      setIsLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from('loadouts')
          .select(
            `
            id,
            name,
            loadout_items (
              quantity,
              gear_items (
                name,
                brand,
                weight,
                category_id,
                categories (
                  label
                )
              )
            )
          `
          )
          .eq('id', loadoutId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const items = data.loadout_items || [];
        const totalWeight = items.reduce(
          (sum: number, item: { quantity: number; gear_items: { weight: number | null } | null }) =>
            sum + (item.gear_items?.weight ?? 0) * item.quantity,
          0
        );

        setUserLoadout({
          id: data.id,
          name: data.name,
          ownerName: 'You',
          isMerchant: false,
          totalWeightGrams: totalWeight,
          bundlePrice: null,
          itemCount: items.length,
        });

        // Store items for comparison
        setUserLoadoutItems(
          items.map((item: {
            gear_items: {
              name: string;
              brand: string | null;
              weight: number | null;
              category_id: string | null;
              categories: { label: string } | null;
            } | null;
          }) => ({
            categoryId: item.gear_items?.category_id ?? null,
            categoryName: item.gear_items?.categories?.label ?? 'Other',
            name: item.gear_items?.name ?? '',
            brand: item.gear_items?.brand ?? null,
            weightGrams: item.gear_items?.weight ?? null,
          }))
        );
      } catch (err) {
        console.error('Failed to load user loadout:', err);
        setError('Failed to load your loadout');
      } finally {
        setIsLoading(false);
      }
    },
    [user, supabase]
  );

  /**
   * Clear comparison state
   */
  const clearComparison = useCallback(() => {
    setMerchantLoadout(null);
    setMerchantLoadoutDetail(null);
    setUserLoadout(null);
    setUserLoadoutItems([]);
    setError(null);
  }, []);

  return {
    merchantLoadout,
    userLoadout,
    differences,
    userLoadoutOptions,
    isLoading,
    isLoadingOptions,
    error,
    loadMerchantLoadout,
    selectUserLoadout,
    fetchUserLoadoutOptions,
    clearComparison,
  };
}
