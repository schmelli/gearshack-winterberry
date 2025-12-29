/**
 * Merchant Loadout Database Queries
 *
 * Feature: 053-merchant-integration
 * Task: T020, T031
 *
 * Supabase query helpers for merchant loadouts:
 * - Public browsing queries (T020)
 * - Merchant CRUD queries (T031)
 */

import { createClient } from '@/lib/supabase/client';
import type {
  MerchantLoadout,
  MerchantLoadoutDetail,
  MerchantLoadoutCard,
  MerchantLoadoutFilters,
  MerchantLoadoutSort,
  MerchantLoadoutInput,
  LoadoutItemInput,
  LoadoutAvailabilityInput,
  LoadoutItemWithDetails,
  LoadoutAvailability,
  LoadoutPricing,
  LoadoutStatus,
} from '@/types/merchant-loadout';
import type { MerchantSummary, MerchantCatalogItem } from '@/types/merchant';
import { calculateLoadoutPricing, generateLoadoutSlug } from '@/types/merchant-loadout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = any;

/**
 * Helper to get supabase client
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLoadoutClient(): any {
  return createClient();
}

// =============================================================================
// PUBLIC LOADOUT QUERIES (T020)
// =============================================================================

/**
 * Fetches published merchant loadouts with filtering, sorting, and pagination.
 * Returns card view data optimized for grid display.
 */
export async function fetchPublishedLoadouts(options: {
  filters?: MerchantLoadoutFilters;
  sort?: MerchantLoadoutSort;
  limit?: number;
  offset?: number;
  userLat?: number;
  userLng?: number;
} = {}): Promise<{ loadouts: MerchantLoadoutCard[]; total: number }> {
  const supabase = getLoadoutClient();
  const {
    filters = {},
    sort = { field: 'createdAt', direction: 'desc' },
    limit = 20,
    offset = 0,
    userLat,
    userLng,
  } = options;

  // Base query for published loadouts with merchant info
  let query = supabase
    .from('merchant_loadouts')
    .select(
      `
      id,
      slug,
      name,
      hero_image_url,
      discount_percent,
      is_featured,
      merchant_id,
      created_at,
      view_count,
      merchants!inner (
        id,
        business_name,
        business_type,
        logo_url,
        verified_at
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'published');

  // Apply filters
  if (filters.tripType) {
    query = query.eq('trip_type', filters.tripType);
  }

  if (filters.season) {
    query = query.contains('season', [filters.season]);
  }

  if (filters.merchantId) {
    query = query.eq('merchant_id', filters.merchantId);
  }

  if (filters.featured) {
    query = query.eq('is_featured', true);
  }

  // Apply sorting
  const sortColumn = {
    name: 'name',
    bundlePrice: 'discount_percent', // Proxy - actual bundle price in view
    createdAt: 'created_at',
    viewCount: 'view_count',
    distance: 'created_at', // Distance requires PostGIS RPC
  }[sort.field];

  query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return { loadouts: [], total: 0 };
    }
    throw new Error(`Failed to fetch loadouts: ${error.message}`);
  }

  // Transform to card format
  const loadouts = await Promise.all(
    ((data ?? []) as QueryResult[]).map(async (row) => {
      // Fetch item count and pricing summary
      const { data: itemData } = await supabase
        .from('merchant_loadout_items')
        .select(
          `
          quantity,
          merchant_catalog_items!inner (
            price,
            weight_grams
          )
        `
        )
        .eq('loadout_id', row.id);

      const items = (itemData ?? []) as QueryResult[];
      const itemCount = items.reduce((sum: number, i: QueryResult) => sum + (i.quantity ?? 1), 0);

      // Calculate pricing
      const pricingItems = items.map((i: QueryResult) => ({
        price: i.merchant_catalog_items?.price ?? 0,
        quantity: i.quantity ?? 1,
        weightGrams: i.merchant_catalog_items?.weight_grams ?? null,
      }));
      const pricing = calculateLoadoutPricing(pricingItems, row.discount_percent ?? 0);

      const merchantRow = row.merchants;

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        merchant: {
          id: merchantRow.id,
          businessName: merchantRow.business_name,
          businessType: merchantRow.business_type,
          logoUrl: merchantRow.logo_url,
          isVerified: merchantRow.verified_at !== null,
        },
        heroImageUrl: row.hero_image_url,
        bundlePrice: pricing.bundlePrice,
        savingsPercent: row.discount_percent ?? 0,
        itemCount,
        totalWeightGrams: pricing.totalWeightGrams,
        isFeatured: row.is_featured ?? false,
        nearestLocationKm: null, // Would need PostGIS RPC with user location
      } as MerchantLoadoutCard;
    })
  );

  // Filter by price range after calculation
  let filteredLoadouts = loadouts;
  if (filters.minPrice !== undefined) {
    filteredLoadouts = filteredLoadouts.filter((l) => l.bundlePrice >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    filteredLoadouts = filteredLoadouts.filter((l) => l.bundlePrice <= filters.maxPrice!);
  }

  return {
    loadouts: filteredLoadouts,
    total: count ?? 0,
  };
}

/**
 * Fetches featured loadouts for homepage display.
 */
export async function fetchFeaturedLoadouts(limit = 6): Promise<MerchantLoadoutCard[]> {
  const { loadouts } = await fetchPublishedLoadouts({
    filters: { featured: true },
    sort: { field: 'viewCount', direction: 'desc' },
    limit,
  });
  return loadouts;
}

/**
 * Fetches a single loadout by slug with full details.
 */
export async function fetchLoadoutBySlug(slug: string): Promise<MerchantLoadoutDetail | null> {
  const supabase = getLoadoutClient();

  // Fetch loadout with merchant
  const { data: loadoutData, error: loadoutError } = await supabase
    .from('merchant_loadouts')
    .select(
      `
      *,
      merchants!inner (
        id,
        business_name,
        business_type,
        logo_url,
        verified_at
      )
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (loadoutError) {
    if (loadoutError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch loadout: ${loadoutError.message}`);
  }

  // Fetch items with catalog details
  const { data: itemsData } = await supabase
    .from('merchant_loadout_items')
    .select(
      `
      *,
      merchant_catalog_items!inner (
        id,
        merchant_id,
        sku,
        name,
        brand,
        description,
        price,
        weight_grams,
        category_id,
        image_url,
        external_url,
        is_active,
        created_at,
        updated_at
      )
    `
    )
    .eq('loadout_id', loadoutData.id)
    .order('sort_order', { ascending: true });

  // Fetch availability
  const { data: availabilityData } = await supabase
    .from('loadout_availability')
    .select(
      `
      *,
      merchant_locations!inner (
        name
      )
    `
    )
    .eq('loadout_id', loadoutData.id);

  // Increment view count
  await supabase
    .from('merchant_loadouts')
    .update({ view_count: (loadoutData.view_count ?? 0) + 1 })
    .eq('id', loadoutData.id);

  // Transform data
  const merchantRow = loadoutData.merchants;
  const merchant: MerchantSummary = {
    id: merchantRow.id,
    businessName: merchantRow.business_name,
    businessType: merchantRow.business_type,
    logoUrl: merchantRow.logo_url,
    isVerified: merchantRow.verified_at !== null,
  };

  const items: LoadoutItemWithDetails[] = ((itemsData ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    loadoutId: row.loadout_id,
    catalogItemId: row.catalog_item_id,
    quantity: row.quantity,
    expertNote: row.expert_note,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    catalogItem: {
      id: row.merchant_catalog_items.id,
      merchantId: row.merchant_catalog_items.merchant_id,
      sku: row.merchant_catalog_items.sku,
      name: row.merchant_catalog_items.name,
      brand: row.merchant_catalog_items.brand,
      description: row.merchant_catalog_items.description,
      price: row.merchant_catalog_items.price,
      weightGrams: row.merchant_catalog_items.weight_grams,
      categoryId: row.merchant_catalog_items.category_id,
      imageUrl: row.merchant_catalog_items.image_url,
      externalUrl: row.merchant_catalog_items.external_url,
      isActive: row.merchant_catalog_items.is_active,
      createdAt: row.merchant_catalog_items.created_at,
      updatedAt: row.merchant_catalog_items.updated_at,
    },
  }));

  const availability: LoadoutAvailability[] = ((availabilityData ?? []) as QueryResult[]).map(
    (row) => ({
      id: row.id,
      loadoutId: row.loadout_id,
      locationId: row.location_id,
      locationName: row.merchant_locations?.name,
      isInStock: row.is_in_stock,
      stockNote: row.stock_note,
      updatedAt: row.updated_at,
    })
  );

  // Calculate pricing
  const pricingItems = items.map((item) => ({
    price: item.catalogItem.price,
    quantity: item.quantity,
    weightGrams: item.catalogItem.weightGrams,
  }));
  const pricing = calculateLoadoutPricing(pricingItems, loadoutData.discount_percent ?? 0);

  return {
    id: loadoutData.id,
    merchantId: loadoutData.merchant_id,
    name: loadoutData.name,
    slug: loadoutData.slug,
    description: loadoutData.description,
    tripType: loadoutData.trip_type,
    season: loadoutData.season,
    status: loadoutData.status,
    discountPercent: loadoutData.discount_percent ?? 0,
    isFeatured: loadoutData.is_featured ?? false,
    featuredUntil: loadoutData.featured_until,
    heroImageUrl: loadoutData.hero_image_url,
    viewCount: loadoutData.view_count ?? 0,
    wishlistAddCount: loadoutData.wishlist_add_count ?? 0,
    publishedAt: loadoutData.published_at,
    createdAt: loadoutData.created_at,
    updatedAt: loadoutData.updated_at,
    merchant,
    items,
    availability,
    pricing,
  };
}

/**
 * Fetches loadout by ID (for merchant editing).
 */
export async function fetchLoadoutById(loadoutId: string): Promise<MerchantLoadoutDetail | null> {
  const supabase = getLoadoutClient();

  const { data: loadoutData, error } = await supabase
    .from('merchant_loadouts')
    .select(
      `
      *,
      merchants!inner (
        id,
        business_name,
        business_type,
        logo_url,
        verified_at
      )
    `
    )
    .eq('id', loadoutId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch loadout: ${error.message}`);
  }

  // Use same transformation as fetchLoadoutBySlug
  // Fetch items and availability separately
  const { data: itemsData } = await supabase
    .from('merchant_loadout_items')
    .select(
      `
      *,
      merchant_catalog_items!inner (*)
    `
    )
    .eq('loadout_id', loadoutId)
    .order('sort_order', { ascending: true });

  const { data: availabilityData } = await supabase
    .from('loadout_availability')
    .select(
      `
      *,
      merchant_locations!inner (name)
    `
    )
    .eq('loadout_id', loadoutId);

  const merchantRow = loadoutData.merchants;
  const merchant: MerchantSummary = {
    id: merchantRow.id,
    businessName: merchantRow.business_name,
    businessType: merchantRow.business_type,
    logoUrl: merchantRow.logo_url,
    isVerified: merchantRow.verified_at !== null,
  };

  const items: LoadoutItemWithDetails[] = ((itemsData ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    loadoutId: row.loadout_id,
    catalogItemId: row.catalog_item_id,
    quantity: row.quantity,
    expertNote: row.expert_note,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    catalogItem: transformCatalogItem(row.merchant_catalog_items),
  }));

  const availability: LoadoutAvailability[] = ((availabilityData ?? []) as QueryResult[]).map(
    (row) => ({
      id: row.id,
      loadoutId: row.loadout_id,
      locationId: row.location_id,
      locationName: row.merchant_locations?.name,
      isInStock: row.is_in_stock,
      stockNote: row.stock_note,
      updatedAt: row.updated_at,
    })
  );

  const pricingItems = items.map((item) => ({
    price: item.catalogItem.price,
    quantity: item.quantity,
    weightGrams: item.catalogItem.weightGrams,
  }));
  const pricing = calculateLoadoutPricing(pricingItems, loadoutData.discount_percent ?? 0);

  return {
    id: loadoutData.id,
    merchantId: loadoutData.merchant_id,
    name: loadoutData.name,
    slug: loadoutData.slug,
    description: loadoutData.description,
    tripType: loadoutData.trip_type,
    season: loadoutData.season,
    status: loadoutData.status,
    discountPercent: loadoutData.discount_percent ?? 0,
    isFeatured: loadoutData.is_featured ?? false,
    featuredUntil: loadoutData.featured_until,
    heroImageUrl: loadoutData.hero_image_url,
    viewCount: loadoutData.view_count ?? 0,
    wishlistAddCount: loadoutData.wishlist_add_count ?? 0,
    publishedAt: loadoutData.published_at,
    createdAt: loadoutData.created_at,
    updatedAt: loadoutData.updated_at,
    merchant,
    items,
    availability,
    pricing,
  };
}

// =============================================================================
// MERCHANT LOADOUT CRUD (T031)
// =============================================================================

/**
 * Fetches loadouts for a specific merchant.
 */
export async function fetchMerchantLoadouts(
  merchantId: string,
  statusFilter?: LoadoutStatus
): Promise<MerchantLoadout[]> {
  const supabase = getLoadoutClient();

  let query = supabase
    .from('merchant_loadouts')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('updated_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch merchant loadouts: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map(transformLoadout);
}

/**
 * Creates a new merchant loadout.
 */
export async function createMerchantLoadout(
  merchantId: string,
  input: MerchantLoadoutInput
): Promise<MerchantLoadout> {
  const supabase = getLoadoutClient();

  const slug = generateLoadoutSlug(input.name, merchantId);

  const { data, error } = await supabase
    .from('merchant_loadouts')
    .insert({
      merchant_id: merchantId,
      name: input.name,
      slug,
      description: input.description ?? null,
      trip_type: input.tripType ?? null,
      season: input.season ?? null,
      discount_percent: input.discountPercent ?? 0,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A loadout with this name already exists');
    }
    throw new Error(`Failed to create loadout: ${error.message}`);
  }

  return transformLoadout(data);
}

/**
 * Updates a merchant loadout.
 */
export async function updateMerchantLoadout(
  loadoutId: string,
  merchantId: string,
  input: Partial<MerchantLoadoutInput>
): Promise<MerchantLoadout> {
  const supabase = getLoadoutClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
    updateData.slug = generateLoadoutSlug(input.name, merchantId);
  }
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tripType !== undefined) updateData.trip_type = input.tripType;
  if (input.season !== undefined) updateData.season = input.season;
  if (input.discountPercent !== undefined) updateData.discount_percent = input.discountPercent;

  const { data, error } = await supabase
    .from('merchant_loadouts')
    .update(updateData)
    .eq('id', loadoutId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update loadout: ${error.message}`);
  }

  return transformLoadout(data);
}

/**
 * Updates loadout status (for state transitions).
 */
export async function updateLoadoutStatus(
  loadoutId: string,
  merchantId: string,
  newStatus: LoadoutStatus
): Promise<MerchantLoadout> {
  const supabase = getLoadoutClient();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('merchant_loadouts')
    .update(updateData)
    .eq('id', loadoutId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update loadout status: ${error.message}`);
  }

  return transformLoadout(data);
}

/**
 * Deletes a merchant loadout (must be in draft or archived status).
 */
export async function deleteMerchantLoadout(
  loadoutId: string,
  merchantId: string
): Promise<void> {
  const supabase = getLoadoutClient();

  // First check status
  const { data: loadout } = await supabase
    .from('merchant_loadouts')
    .select('status')
    .eq('id', loadoutId)
    .eq('merchant_id', merchantId)
    .single();

  if (loadout && !['draft', 'archived'].includes(loadout.status)) {
    throw new Error('Can only delete draft or archived loadouts');
  }

  const { error } = await supabase
    .from('merchant_loadouts')
    .delete()
    .eq('id', loadoutId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(`Failed to delete loadout: ${error.message}`);
  }
}

// =============================================================================
// LOADOUT ITEMS CRUD
// =============================================================================

/**
 * Adds an item to a loadout.
 */
export async function addLoadoutItem(
  loadoutId: string,
  merchantId: string,
  input: LoadoutItemInput
): Promise<void> {
  const supabase = getLoadoutClient();

  // Verify loadout belongs to merchant and is editable
  const { data: loadout } = await supabase
    .from('merchant_loadouts')
    .select('status')
    .eq('id', loadoutId)
    .eq('merchant_id', merchantId)
    .single();

  if (!loadout || loadout.status !== 'draft') {
    throw new Error('Can only add items to draft loadouts');
  }

  // Get next sort order
  const { count } = await supabase
    .from('merchant_loadout_items')
    .select('*', { count: 'exact', head: true })
    .eq('loadout_id', loadoutId);

  const { error } = await supabase.from('merchant_loadout_items').insert({
    loadout_id: loadoutId,
    catalog_item_id: input.catalogItemId,
    quantity: input.quantity ?? 1,
    expert_note: input.expertNote ?? null,
    sort_order: input.sortOrder ?? (count ?? 0),
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This item is already in the loadout');
    }
    throw new Error(`Failed to add item: ${error.message}`);
  }
}

/**
 * Updates a loadout item.
 */
export async function updateLoadoutItem(
  itemId: string,
  loadoutId: string,
  input: Partial<LoadoutItemInput>
): Promise<void> {
  const supabase = getLoadoutClient();

  const updateData: Record<string, unknown> = {};

  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.expertNote !== undefined) updateData.expert_note = input.expertNote;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  const { error } = await supabase
    .from('merchant_loadout_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('loadout_id', loadoutId);

  if (error) {
    throw new Error(`Failed to update item: ${error.message}`);
  }
}

/**
 * Removes an item from a loadout.
 */
export async function removeLoadoutItem(itemId: string, loadoutId: string): Promise<void> {
  const supabase = getLoadoutClient();

  const { error } = await supabase
    .from('merchant_loadout_items')
    .delete()
    .eq('id', itemId)
    .eq('loadout_id', loadoutId);

  if (error) {
    throw new Error(`Failed to remove item: ${error.message}`);
  }
}

// =============================================================================
// LOADOUT AVAILABILITY CRUD
// =============================================================================

/**
 * Sets availability for a loadout at a location.
 */
export async function setLoadoutAvailability(
  loadoutId: string,
  input: LoadoutAvailabilityInput
): Promise<void> {
  const supabase = getLoadoutClient();

  const { error } = await supabase
    .from('loadout_availability')
    .upsert(
      {
        loadout_id: loadoutId,
        location_id: input.locationId,
        is_in_stock: input.isInStock,
        stock_note: input.stockNote ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'loadout_id,location_id' }
    );

  if (error) {
    throw new Error(`Failed to set availability: ${error.message}`);
  }
}

/**
 * Removes availability record for a loadout at a location.
 */
export async function removeLoadoutAvailability(
  loadoutId: string,
  locationId: string
): Promise<void> {
  const supabase = getLoadoutClient();

  const { error } = await supabase
    .from('loadout_availability')
    .delete()
    .eq('loadout_id', loadoutId)
    .eq('location_id', locationId);

  if (error) {
    throw new Error(`Failed to remove availability: ${error.message}`);
  }
}

// =============================================================================
// TRANSFORMERS
// =============================================================================

function transformLoadout(row: QueryResult): MerchantLoadout {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    tripType: row.trip_type,
    season: row.season,
    status: row.status,
    discountPercent: row.discount_percent ?? 0,
    isFeatured: row.is_featured ?? false,
    featuredUntil: row.featured_until,
    heroImageUrl: row.hero_image_url,
    viewCount: row.view_count ?? 0,
    wishlistAddCount: row.wishlist_add_count ?? 0,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformCatalogItem(row: QueryResult): MerchantCatalogItem {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    description: row.description,
    price: row.price,
    weightGrams: row.weight_grams,
    categoryId: row.category_id,
    imageUrl: row.image_url,
    externalUrl: row.external_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
