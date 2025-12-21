/**
 * Weather API Integration
 * Feature: 001-mastra-agentic-voice
 * Task: T039 [US2]
 *
 * Provides weather data for trip planning workflow.
 * Uses Open-Meteo API (free, no API key required) with 1-hour caching.
 *
 * @example
 * ```typescript
 * const weather = await getWeatherData('Stockholm, Sweden', 'winter');
 * console.log(weather.temperature); // { min: -5, max: 2 }
 * console.log(weather.conditions);  // 'Snow, overcast'
 * ```
 */

import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

/** Valid season values for weather queries */
export type WeatherSeason = 'spring' | 'summer' | 'fall' | 'winter';

/** Weather data response from API */
export interface WeatherData {
  /** Temperature range in Celsius */
  temperature: {
    min: number;
    max: number;
  };
  /** Average precipitation in mm */
  precipitation: number;
  /** Human-readable weather conditions description */
  conditions: string;
  /** Location that was queried (for validation) */
  location: string;
  /** Season that was queried */
  season: WeatherSeason;
  /** Whether this data came from cache */
  cached: boolean;
  /** When this data expires (ISO 8601) */
  expiresAt: string;
}

/** Geocoding API response from Open-Meteo */
interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

/** Open-Meteo climate API response */
interface ClimateApiResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  };
}

// =============================================================================
// Validation Schemas
// =============================================================================

/** Schema for validating weather query parameters */
export const weatherQuerySchema = z.object({
  location: z.string().min(1, 'Location is required').max(200),
  season: z.enum(['spring', 'summer', 'fall', 'winter']),
});

export type WeatherQueryParams = z.infer<typeof weatherQuerySchema>;

// =============================================================================
// Cache Configuration
// =============================================================================

/** Cache TTL in milliseconds (1 hour) */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** In-memory cache for weather data */
const weatherCache = new Map<string, { data: WeatherData; expiresAt: number }>();

// =============================================================================
// Retry Configuration
// =============================================================================

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 500,
  MAX_BACKOFF_MS: 5000,
} as const;

// =============================================================================
// Weather Code Mapping
// =============================================================================

/** WMO Weather interpretation codes to human-readable descriptions */
const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

// =============================================================================
// Default/Fallback Weather Data
// =============================================================================

/** Default weather data when API is unavailable */
const DEFAULT_WEATHER_BY_SEASON: Record<WeatherSeason, Omit<WeatherData, 'location' | 'cached' | 'expiresAt' | 'season'>> = {
  spring: {
    temperature: { min: 5, max: 15 },
    precipitation: 50,
    conditions: 'Variable conditions with possible showers',
  },
  summer: {
    temperature: { min: 15, max: 25 },
    precipitation: 30,
    conditions: 'Warm with occasional thunderstorms',
  },
  fall: {
    temperature: { min: 5, max: 12 },
    precipitation: 70,
    conditions: 'Cool with frequent rain',
  },
  winter: {
    temperature: { min: -5, max: 2 },
    precipitation: 40,
    conditions: 'Cold with snow possible',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate cache key from location and season
 */
function getCacheKey(location: string, season: WeatherSeason): string {
  return `${location.toLowerCase().trim()}:${season}`;
}

/**
 * Get month range for a given season (Northern Hemisphere)
 */
function getSeasonMonths(season: WeatherSeason): { startMonth: number; endMonth: number } {
  const seasonMonths: Record<WeatherSeason, { startMonth: number; endMonth: number }> = {
    spring: { startMonth: 3, endMonth: 5 },   // March-May
    summer: { startMonth: 6, endMonth: 8 },   // June-August
    fall: { startMonth: 9, endMonth: 11 },    // September-November
    winter: { startMonth: 12, endMonth: 2 },  // December-February
  };
  return seasonMonths[season];
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      // Only retry on 5xx errors or network errors
      if (response.ok || response.status < 500) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries - 1) {
      const backoffMs = Math.min(
        RETRY_CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt),
        RETRY_CONFIG.MAX_BACKOFF_MS
      );
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError ?? new Error('Failed after retries');
}

/**
 * Get most common weather condition from weather codes
 */
function getMostCommonCondition(weatherCodes: number[]): string {
  if (weatherCodes.length === 0) {
    return 'Unknown conditions';
  }

  // Count occurrences of each weather code
  const counts = new Map<number, number>();
  for (const code of weatherCodes) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  // Find most common code
  let maxCount = 0;
  let mostCommonCode = 0;
  Array.from(counts.entries()).forEach(([code, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCode = code;
    }
  });

  return WEATHER_CODE_DESCRIPTIONS[mostCommonCode] ?? 'Variable conditions';
}

/**
 * Geocode a location string to coordinates using Open-Meteo Geocoding API
 */
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedLocation}&count=1&language=en&format=json`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.warn(`[Weather] Geocoding failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const results: GeocodingResult[] = data.results ?? [];

    if (results.length === 0) {
      console.warn(`[Weather] No geocoding results for: ${location}`);
      return null;
    }

    const result = results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: result.admin1 ? `${result.name}, ${result.admin1}, ${result.country}` : `${result.name}, ${result.country}`,
    };
  } catch (error) {
    console.error('[Weather] Geocoding error:', error);
    return null;
  }
}

/**
 * Fetch historical climate data for a location and season
 * Uses Open-Meteo Historical API with data from previous years
 */
async function fetchClimateData(
  lat: number,
  lon: number,
  season: WeatherSeason
): Promise<{ temperature: { min: number; max: number }; precipitation: number; conditions: string } | null> {
  try {
    const { startMonth, endMonth } = getSeasonMonths(season);
    const currentYear = new Date().getFullYear();

    // Use last year's data for the specified season
    // Handle winter crossing year boundary (December-February)
    let startYear = currentYear - 1;
    let endYear = currentYear - 1;

    if (season === 'winter') {
      // For winter, use December of last year through February of this year
      startYear = currentYear - 1;
      endYear = currentYear;
    }

    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = season === 'winter'
      ? `${endYear}-02-28`
      : `${endYear}-${String(endMonth).padStart(2, '0')}-${endMonth === 6 || endMonth === 9 || endMonth === 11 ? '30' : '31'}`;

    const url = `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${lat}&longitude=${lon}` +
      `&start_date=${startDate}&end_date=${endDate}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
      `&timezone=auto`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.warn(`[Weather] Climate API failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: ClimateApiResponse = await response.json();

    if (!data.daily || data.daily.temperature_2m_max.length === 0) {
      console.warn('[Weather] No climate data available');
      return null;
    }

    // Calculate averages
    const temps = data.daily.temperature_2m_max.filter((t): t is number => t !== null);
    const minTemps = data.daily.temperature_2m_min.filter((t): t is number => t !== null);
    const precip = data.daily.precipitation_sum.filter((p): p is number => p !== null);
    const weatherCodes = data.daily.weathercode.filter((c): c is number => c !== null);

    if (temps.length === 0 || minTemps.length === 0) {
      return null;
    }

    // Calculate typical temperatures (average of daily min/max)
    const avgMax = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const avgMin = Math.round(minTemps.reduce((a, b) => a + b, 0) / minTemps.length);
    const avgPrecip = Math.round(precip.reduce((a, b) => a + b, 0) / (precip.length || 1));
    const conditions = getMostCommonCondition(weatherCodes);

    return {
      temperature: { min: avgMin, max: avgMax },
      precipitation: avgPrecip,
      conditions,
    };
  } catch (error) {
    console.error('[Weather] Climate data fetch error:', error);
    return null;
  }
}

// =============================================================================
// Main API Function
// =============================================================================

/**
 * Get weather data for a location and season.
 *
 * Uses Open-Meteo API (free, no API key required) to fetch historical
 * climate data for the specified season. Results are cached for 1 hour.
 *
 * @param location - Location string (e.g., "Stockholm, Sweden", "Alps, France")
 * @param season - Season to get weather for (spring, summer, fall, winter)
 * @returns Weather data with temperature, precipitation, and conditions
 *
 * @example
 * ```typescript
 * // Basic usage
 * const weather = await getWeatherData('Stockholm, Sweden', 'winter');
 *
 * // Check if data is cached
 * if (weather.cached) {
 *   console.log('Using cached weather data');
 * }
 * ```
 */
export async function getWeatherData(
  location: string,
  season: WeatherSeason
): Promise<WeatherData> {
  // Validate inputs
  const validation = weatherQuerySchema.safeParse({ location, season });
  if (!validation.success) {
    console.warn('[Weather] Invalid query params:', validation.error.message);
    return createFallbackData(location, season);
  }

  const cacheKey = getCacheKey(location, season);

  // Check cache first
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  // Geocode location
  const coords = await geocodeLocation(location);
  if (!coords) {
    console.warn(`[Weather] Could not geocode location: ${location}, using fallback`);
    return createFallbackData(location, season);
  }

  // Fetch climate data
  const climateData = await fetchClimateData(coords.lat, coords.lon, season);
  if (!climateData) {
    console.warn(`[Weather] Could not fetch climate data for: ${location}, using fallback`);
    return createFallbackData(location, season);
  }

  // Build response
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const weatherData: WeatherData = {
    temperature: climateData.temperature,
    precipitation: climateData.precipitation,
    conditions: climateData.conditions,
    location: coords.name,
    season,
    cached: false,
    expiresAt,
  };

  // Store in cache
  weatherCache.set(cacheKey, {
    data: weatherData,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return weatherData;
}

/**
 * Create fallback weather data when API is unavailable
 */
function createFallbackData(location: string, season: WeatherSeason): WeatherData {
  const defaults = DEFAULT_WEATHER_BY_SEASON[season];
  return {
    ...defaults,
    location,
    season,
    cached: false,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS / 2).toISOString(), // Shorter TTL for fallback
  };
}

/**
 * Clear the weather cache (for testing or forced refresh)
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getWeatherCacheStats(): { size: number; keys: string[] } {
  const now = Date.now();
  const validKeys: string[] = [];

  Array.from(weatherCache.entries()).forEach(([key, entry]) => {
    if (entry.expiresAt > now) {
      validKeys.push(key);
    }
  });

  return {
    size: validKeys.length,
    keys: validKeys,
  };
}
