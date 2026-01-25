/**
 * Geolocation service for distance calculations
 * Feature: 050-price-tracking (US3)
 * Date: 2025-12-17
 */

import { getDistance } from 'geolib';
import type { PriceResult } from '@/types/price-tracking';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Validate that coordinates are within valid ranges and are finite numbers
 */
function validateCoordinates(coords: Coordinates, name: string): void {
  if (!Number.isFinite(coords.latitude) || coords.latitude < -90 || coords.latitude > 90) {
    throw new Error(`${name} latitude must be between -90 and 90, got ${coords.latitude}`);
  }
  if (!Number.isFinite(coords.longitude) || coords.longitude < -180 || coords.longitude > 180) {
    throw new Error(`${name} longitude must be between -180 and 180, got ${coords.longitude}`);
  }
}

/**
 * Calculate distance between two points in kilometers
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates
): number {
  // Validate coordinate bounds
  validateCoordinates(from, 'from');
  validateCoordinates(to, 'to');

  const distanceInMeters = getDistance(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude }
  );

  return distanceInMeters / 1000; // Convert to kilometers
}

/**
 * Add distance information to local shop results
 */
export function enrichWithDistance(
  results: PriceResult[],
  userLocation: Coordinates
): PriceResult[] {
  return results.map((result) => {
    if (result.is_local && result.shop_latitude && result.shop_longitude) {
      const distance = calculateDistance(userLocation, {
        latitude: result.shop_latitude,
        longitude: result.shop_longitude,
      });

      return {
        ...result,
        distance_km: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    }
    return result;
  });
}

/**
 * Sort results by distance (local first, then by distance)
 */
export function sortByDistance(results: PriceResult[]): PriceResult[] {
  return results.sort((a, b) => {
    // Local shops first
    if (a.is_local && !b.is_local) return -1;
    if (!a.is_local && b.is_local) return 1;

    // Among local shops, sort by distance
    // Use nullish coalescing (??) to handle distance_km = 0 correctly
    // (0 || 999 would incorrectly return 999 because 0 is falsy)
    if (a.is_local && b.is_local) {
      const distA = a.distance_km ?? 999;
      const distB = b.distance_km ?? 999;
      return distA - distB;
    }

    // Non-local shops sort by price
    return a.total_price - b.total_price;
  });
}

/**
 * Filter results within a radius
 */
export function filterByRadius(
  results: PriceResult[],
  maxDistanceKm: number
): PriceResult[] {
  return results.filter((result) => {
    if (!result.is_local) return true;
    if (!result.distance_km) return true;
    return result.distance_km <= maxDistanceKm;
  });
}
