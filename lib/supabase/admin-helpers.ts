/**
 * Admin Helper Functions
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Shared utilities for admin authentication and data validation
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type ResellerRow = Database['public']['Tables']['resellers']['Row'];

/**
 * Check if user is admin
 */
export async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { authorized: true, user };
}

/**
 * Validate geographic coordinates
 * Prevents SQL injection and ensures valid lat/lng values
 */
export function validateCoordinates(latitude: number | null | undefined, longitude: number | null | undefined): { valid: boolean; error?: string } {
  // Allow null values (for clearing location)
  if (latitude === null || longitude === null || latitude === undefined || longitude === undefined) {
    return { valid: true };
  }

  // Type check
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }

  // Range check
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  // Check for NaN or Infinity
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { valid: false, error: 'Coordinates must be finite numbers' };
  }

  return { valid: true };
}

/**
 * Create PostGIS POINT string safely
 * Returns null if coordinates are invalid or not provided
 */
export function createPostGISPoint(latitude: number | null | undefined, longitude: number | null | undefined): string | null {
  const validation = validateCoordinates(latitude, longitude);

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid coordinates');
  }

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  // Safe to use template literal after validation
  return `POINT(${longitude} ${latitude})`;
}
