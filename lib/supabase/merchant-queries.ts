/**
 * Merchant Integration Database Queries
 *
 * Feature: 053-merchant-integration
 * Task: T012
 *
 * Supabase query helpers for merchant features:
 * - Merchant profile CRUD
 * - Merchant locations
 * - Catalog management
 * - Analytics and insights
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Merchant,
  MerchantLocation,
  MerchantCatalogItem,
  MerchantSummary,
  MerchantWithDistance,
  MerchantApplicationInput,
  MerchantUpdateInput,
  MerchantLocationInput,
  CatalogItemInput,
  MerchantStatus,
  UserLocationShare,
  LocationGranularity,
  MerchantBlock,
} from '@/types/merchant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = any;

/**
 * Helper to get supabase client with any typing for merchant tables
 * Remove this after running migrations and regenerating types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMerchantClient(): any {
  return createClient();
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates and sanitizes geographic coordinates.
 * Prevents injection attacks in PostGIS POINT strings.
 *
 * @param latitude - Latitude value (-90 to 90)
 * @param longitude - Longitude value (-180 to 180)
 * @returns Sanitized POINT string or throws error
 */
function validateAndFormatPoint(latitude: number, longitude: number): string {
  // Ensure values are finite numbers
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates: values must be finite numbers');
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }

  // Format with fixed precision to prevent scientific notation injection
  return `POINT(${longitude.toFixed(8)} ${latitude.toFixed(8)})`;
}

// =============================================================================
// MERCHANT PROFILE QUERIES
// =============================================================================

/**
 * Fetches merchant profile by user ID.
 * Returns null if user is not a merchant.
 */
export async function fetchMerchantByUserId(userId: string): Promise<Merchant | null> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No merchant found
    }
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return null; // Table doesn't exist yet
    }
    throw new Error(`Failed to fetch merchant: ${error.message}`);
  }

  return transformMerchant(data);
}

/**
 * Fetches merchant by ID.
 */
export async function fetchMerchantById(merchantId: string): Promise<Merchant | null> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch merchant: ${error.message}`);
  }

  return transformMerchant(data);
}

/**
 * Fetches merchant summary for public display.
 */
export async function fetchMerchantSummary(merchantId: string): Promise<MerchantSummary | null> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, business_type, logo_url, verified_at')
    .eq('id', merchantId)
    .eq('status', 'approved')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch merchant summary: ${error.message}`);
  }

  return {
    id: data.id,
    businessName: data.business_name,
    businessType: data.business_type,
    logoUrl: data.logo_url,
    isVerified: data.verified_at !== null,
  };
}

/**
 * Fetches all approved merchants.
 */
export async function fetchApprovedMerchants(): Promise<MerchantSummary[]> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, business_type, logo_url, verified_at')
    .eq('status', 'approved')
    .order('business_name', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch merchants: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    businessName: row.business_name,
    businessType: row.business_type,
    logoUrl: row.logo_url,
    isVerified: row.verified_at !== null,
  }));
}

/**
 * Creates a new merchant application.
 */
export async function createMerchantApplication(
  userId: string,
  input: MerchantApplicationInput
): Promise<Merchant> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .insert({
      user_id: userId,
      business_name: input.businessName,
      business_type: input.businessType,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone ?? null,
      website: input.website ?? null,
      description: input.description ?? null,
      tax_id: input.taxId ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A merchant account already exists for this user');
    }
    throw new Error(`Failed to create merchant application: ${error.message}`);
  }

  // Update profile role to 'merchant'
  await supabase
    .from('profiles')
    .update({ role: 'merchant' })
    .eq('id', userId);

  return transformMerchant(data);
}

/**
 * Updates merchant profile.
 */
export async function updateMerchant(
  merchantId: string,
  input: MerchantUpdateInput
): Promise<Merchant> {
  const supabase = getMerchantClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.businessName !== undefined) updateData.business_name = input.businessName;
  if (input.contactEmail !== undefined) updateData.contact_email = input.contactEmail;
  if (input.contactPhone !== undefined) updateData.contact_phone = input.contactPhone;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.description !== undefined) updateData.description = input.description;

  const { data, error } = await supabase
    .from('merchants')
    .update(updateData)
    .eq('id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update merchant: ${error.message}`);
  }

  return transformMerchant(data);
}

/**
 * Updates merchant logo URL.
 */
export async function updateMerchantLogo(merchantId: string, logoUrl: string): Promise<void> {
  const supabase = getMerchantClient();

  const { error } = await supabase
    .from('merchants')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to update merchant logo: ${error.message}`);
  }
}

// =============================================================================
// ADMIN QUERIES
// =============================================================================

/**
 * Fetches all pending merchant applications (admin only).
 */
export async function fetchPendingMerchantApplications(): Promise<Merchant[]> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending applications: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map(transformMerchant);
}

/**
 * Updates merchant status (admin only).
 */
export async function updateMerchantStatus(
  merchantId: string,
  status: MerchantStatus,
  adminUserId: string
): Promise<void> {
  const supabase = getMerchantClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'approved') {
    updateData.verified_at = new Date().toISOString();
    updateData.verified_by = adminUserId;
  }

  const { error } = await supabase
    .from('merchants')
    .update(updateData)
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to update merchant status: ${error.message}`);
  }
}

// =============================================================================
// MERCHANT LOCATION QUERIES
// =============================================================================

/**
 * Fetches all locations for a merchant.
 */
export async function fetchMerchantLocations(merchantId: string): Promise<MerchantLocation[]> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchant_locations')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('is_primary', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map(transformLocation);
}

/**
 * Creates a new location for a merchant.
 */
export async function createMerchantLocation(
  merchantId: string,
  input: MerchantLocationInput
): Promise<MerchantLocation> {
  const supabase = getMerchantClient();

  // If this is marked as primary, unset other primary locations first
  if (input.isPrimary) {
    await supabase
      .from('merchant_locations')
      .update({ is_primary: false })
      .eq('merchant_id', merchantId);
  }

  const { data, error } = await supabase
    .from('merchant_locations')
    .insert({
      merchant_id: merchantId,
      name: input.name,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2 ?? null,
      city: input.city,
      postal_code: input.postalCode,
      country: input.country ?? 'DE',
      location: validateAndFormatPoint(input.latitude, input.longitude),
      phone: input.phone ?? null,
      hours: input.hours ?? null,
      is_primary: input.isPrimary ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create location: ${error.message}`);
  }

  return transformLocation(data);
}

/**
 * Updates a merchant location.
 */
export async function updateMerchantLocation(
  locationId: string,
  merchantId: string,
  input: Partial<MerchantLocationInput>
): Promise<MerchantLocation> {
  const supabase = getMerchantClient();

  // If this is being marked as primary, unset other primary locations first
  if (input.isPrimary) {
    await supabase
      .from('merchant_locations')
      .update({ is_primary: false })
      .eq('merchant_id', merchantId)
      .neq('id', locationId);
  }

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.addressLine1 !== undefined) updateData.address_line_1 = input.addressLine1;
  if (input.addressLine2 !== undefined) updateData.address_line_2 = input.addressLine2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.latitude !== undefined && input.longitude !== undefined) {
    updateData.location = validateAndFormatPoint(input.latitude, input.longitude);
  }
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.hours !== undefined) updateData.hours = input.hours;
  if (input.isPrimary !== undefined) updateData.is_primary = input.isPrimary;

  const { data, error } = await supabase
    .from('merchant_locations')
    .update(updateData)
    .eq('id', locationId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update location: ${error.message}`);
  }

  return transformLocation(data);
}

/**
 * Deletes a merchant location.
 */
export async function deleteMerchantLocation(
  locationId: string,
  merchantId: string
): Promise<void> {
  const supabase = getMerchantClient();

  const { error } = await supabase
    .from('merchant_locations')
    .delete()
    .eq('id', locationId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(`Failed to delete location: ${error.message}`);
  }
}

/**
 * Finds nearest merchant location to a user's coordinates.
 */
export async function findNearestMerchantLocation(
  merchantId: string,
  userLat: number,
  userLng: number
): Promise<{ location: MerchantLocation; distanceKm: number } | null> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase.rpc('find_nearest_merchant_location', {
    p_merchant_id: merchantId,
    p_user_lat: userLat,
    p_user_lng: userLng,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet - fallback to basic query
      return null;
    }
    throw new Error(`Failed to find nearest location: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as QueryResult;
  return {
    location: transformLocation(row),
    distanceKm: row.distance_km,
  };
}

// =============================================================================
// CATALOG QUERIES
// =============================================================================

/**
 * Fetches catalog items for a merchant with pagination.
 */
export async function fetchMerchantCatalog(
  merchantId: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    categoryId?: string;
    activeOnly?: boolean;
  } = {}
): Promise<{ items: MerchantCatalogItem[]; total: number }> {
  const supabase = getMerchantClient();
  const { limit = 50, offset = 0, search, categoryId, activeOnly = true } = options;

  let query = supabase
    .from('merchant_catalog_items')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchantId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    // Escape ILIKE special characters AND PostgREST operators to prevent injection
    const escapedSearch = search
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape % wildcards
      .replace(/_/g, '\\_')    // Escape _ wildcards
      .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
      .replace(/\(/g, '')      // Remove parentheses (PostgREST grouping)
      .replace(/\)/g, '')      // Remove parentheses
      .replace(/\./g, ' ');    // Replace dots with space (prevents .eq. injection)
    query = query.or(`name.ilike.%${escapedSearch}%,sku.ilike.%${escapedSearch}%,brand.ilike.%${escapedSearch}%`);
  }

  query = query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return { items: [], total: 0 };
    }
    throw new Error(`Failed to fetch catalog: ${error.message}`);
  }

  return {
    items: ((data ?? []) as QueryResult[]).map(transformCatalogItem),
    total: count ?? 0,
  };
}

/**
 * Creates a new catalog item.
 */
export async function createCatalogItem(
  merchantId: string,
  input: CatalogItemInput
): Promise<MerchantCatalogItem> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchant_catalog_items')
    .insert({
      merchant_id: merchantId,
      sku: input.sku,
      name: input.name,
      brand: input.brand ?? null,
      description: input.description ?? null,
      price: input.price,
      weight_grams: input.weightGrams ?? null,
      category_id: input.categoryId ?? null,
      external_url: input.externalUrl ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A catalog item with this SKU already exists');
    }
    throw new Error(`Failed to create catalog item: ${error.message}`);
  }

  return transformCatalogItem(data);
}

/**
 * Updates a catalog item.
 */
export async function updateCatalogItem(
  itemId: string,
  merchantId: string,
  input: Partial<CatalogItemInput & { isActive?: boolean; imageUrl?: string }>
): Promise<MerchantCatalogItem> {
  const supabase = getMerchantClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.sku !== undefined) updateData.sku = input.sku;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.brand !== undefined) updateData.brand = input.brand;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.weightGrams !== undefined) updateData.weight_grams = input.weightGrams;
  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  if (input.externalUrl !== undefined) updateData.external_url = input.externalUrl;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;

  const { data, error } = await supabase
    .from('merchant_catalog_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update catalog item: ${error.message}`);
  }

  return transformCatalogItem(data);
}

/**
 * Deletes (deactivates) a catalog item.
 */
export async function deleteCatalogItem(itemId: string, merchantId: string): Promise<void> {
  const supabase = getMerchantClient();

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('merchant_catalog_items')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(`Failed to delete catalog item: ${error.message}`);
  }
}

// =============================================================================
// USER LOCATION SHARING QUERIES
// =============================================================================

/**
 * Gets user's location sharing settings for a merchant.
 */
export async function getUserLocationShare(
  userId: string,
  merchantId: string
): Promise<UserLocationShare | null> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('user_location_shares')
    .select('*')
    .eq('user_id', userId)
    .eq('merchant_id', merchantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return null;
    }
    throw new Error(`Failed to fetch location share: ${error.message}`);
  }

  return transformLocationShare(data);
}

/**
 * Updates or creates user's location sharing consent.
 */
export async function upsertUserLocationShare(
  userId: string,
  merchantId: string,
  granularity: LocationGranularity,
  city?: string,
  neighborhood?: string
): Promise<UserLocationShare> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('user_location_shares')
    .upsert(
      {
        user_id: userId,
        merchant_id: merchantId,
        granularity,
        city: granularity !== 'none' ? city ?? null : null,
        neighborhood: granularity === 'neighborhood' ? neighborhood ?? null : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,merchant_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update location share: ${error.message}`);
  }

  return transformLocationShare(data);
}

/**
 * Removes user's location sharing for a merchant.
 */
export async function removeUserLocationShare(userId: string, merchantId: string): Promise<void> {
  const supabase = getMerchantClient();

  const { error } = await supabase
    .from('user_location_shares')
    .delete()
    .eq('user_id', userId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(`Failed to remove location share: ${error.message}`);
  }
}

// =============================================================================
// MERCHANT BLOCKING QUERIES
// =============================================================================

/**
 * Blocks a merchant from sending offers to user.
 */
export async function blockMerchant(
  userId: string,
  merchantId: string,
  reason?: string
): Promise<void> {
  const supabase = getMerchantClient();

  const { error } = await supabase
    .from('merchant_blocks')
    .upsert(
      {
        user_id: userId,
        merchant_id: merchantId,
        reason: reason ?? null,
      },
      { onConflict: 'user_id,merchant_id' }
    );

  if (error) {
    throw new Error(`Failed to block merchant: ${error.message}`);
  }
}

/**
 * Unblocks a merchant.
 */
export async function unblockMerchant(userId: string, merchantId: string): Promise<void> {
  const supabase = getMerchantClient();

  const { error } = await supabase
    .from('merchant_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(`Failed to unblock merchant: ${error.message}`);
  }
}

/**
 * Checks if user has blocked a merchant.
 */
export async function isMerchantBlocked(userId: string, merchantId: string): Promise<boolean> {
  const supabase = getMerchantClient();

  const { count, error } = await supabase
    .from('merchant_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('merchant_id', merchantId);

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return false;
    }
    throw new Error(`Failed to check block status: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Gets list of merchants blocked by user.
 */
export async function fetchBlockedMerchants(userId: string): Promise<MerchantBlock[]> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase
    .from('merchant_blocks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch blocked merchants: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    merchantId: row.merchant_id,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

// =============================================================================
// MERCHANTS WITH DISTANCE
// =============================================================================

/**
 * Fetches approved merchants with distance from user location.
 */
export async function fetchMerchantsNearby(
  userLat: number,
  userLng: number,
  radiusKm: number = 50
): Promise<MerchantWithDistance[]> {
  const supabase = getMerchantClient();

  const { data, error } = await supabase.rpc('get_merchants_nearby', {
    p_user_lat: userLat,
    p_user_lng: userLng,
    p_radius_km: radiusKm,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet - return empty
      return [];
    }
    throw new Error(`Failed to fetch nearby merchants: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    businessName: row.business_name,
    businessType: row.business_type,
    logoUrl: row.logo_url ?? null,
    isVerified: row.verified_at !== null,
    nearestLocationKm: row.distance_km,
    nearestLocationName: row.location_name,
  }));
}

// =============================================================================
// TRANSFORMERS
// =============================================================================

function transformMerchant(row: QueryResult): Merchant {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    businessType: row.business_type,
    status: row.status,
    verifiedAt: row.verified_at ?? null,
    verifiedBy: row.verified_by ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    website: row.website ?? null,
    logoUrl: row.logo_url ?? null,
    description: row.description ?? null,
    taxId: row.tax_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLocation(row: QueryResult): MerchantLocation {
  // Extract lat/lng from PostGIS geography point
  // Format is typically: { x: lng, y: lat } or we may need to parse WKT
  let latitude = 0;
  let longitude = 0;

  if (row.location) {
    if (typeof row.location === 'object') {
      longitude = row.location.x ?? row.location.coordinates?.[0] ?? 0;
      latitude = row.location.y ?? row.location.coordinates?.[1] ?? 0;
    }
  }

  // Fallback if we have lat/lng columns directly
  if (row.latitude !== undefined) latitude = row.latitude;
  if (row.longitude !== undefined) longitude = row.longitude;

  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2 ?? null,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    latitude,
    longitude,
    phone: row.phone ?? null,
    hours: row.hours ?? null,
    isPrimary: row.is_primary ?? false,
    createdAt: row.created_at,
  };
}

function transformCatalogItem(row: QueryResult): MerchantCatalogItem {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    sku: row.sku ?? null,
    name: row.name,
    brand: row.brand ?? null,
    description: row.description ?? null,
    price: row.price,
    weightGrams: row.weight_grams ?? null,
    categoryId: row.category_id ?? null,
    imageUrl: row.image_url ?? null,
    externalUrl: row.external_url ?? null,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLocationShare(row: QueryResult): UserLocationShare {
  return {
    id: row.id,
    userId: row.user_id,
    merchantId: row.merchant_id,
    granularity: row.granularity,
    city: row.city,
    neighborhood: row.neighborhood,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
