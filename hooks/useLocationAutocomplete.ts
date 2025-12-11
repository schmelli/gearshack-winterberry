/**
 * useLocationAutocomplete Hook
 *
 * Feature: 041-loadout-ux-profile
 * Task: T017
 *
 * Provides Google Places autocomplete functionality for location search.
 * Uses the NEW Places API (not legacy) with AutocompleteSuggestion and Place.fetchFields().
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import type {
  LocationSelection,
  LocationSuggestion,
  LocationAutocompleteOptions,
  UseLocationAutocompleteReturn,
} from '@/types/profile';

// =============================================================================
// Constants
// =============================================================================

const LIBRARIES: ('places')[] = ['places'];
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_CHARS = 3;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLocationAutocomplete(
  options?: LocationAutocompleteOptions
): UseLocationAutocompleteReturn {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, minChars = DEFAULT_MIN_CHARS } = options || {};

  // State
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps script with the new Places API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // Derive error from load error (no useEffect needed for derived state)
  const derivedError = loadError ? 'Failed to load Google Maps API' : error;

  // Search for location suggestions using the NEW Places Autocomplete API
  const search = useCallback(
    (query: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear suggestions if query is too short
      if (!query || query.length < minChars) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Check if API is ready
      if (!isLoaded) {
        setError('Google Maps API not loaded');
        return;
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Use the NEW Places Autocomplete API
          const { AutocompleteSessionToken, AutocompleteSuggestion } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;

          // Create a session token for billing optimization
          const sessionToken = new AutocompleteSessionToken();

          // Fetch autocomplete suggestions
          const request = {
            input: query,
            includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2'],
            sessionToken,
          };

          const { suggestions: autocompleteSuggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

          if (autocompleteSuggestions && autocompleteSuggestions.length > 0) {
            const newSuggestions: LocationSuggestion[] = autocompleteSuggestions
              .filter((s): s is google.maps.places.AutocompleteSuggestion =>
                s.placePrediction !== undefined
              )
              .map((s) => {
                const prediction = s.placePrediction!;
                return {
                  placeId: prediction.placeId,
                  description: prediction.text?.text || '',
                  mainText: prediction.mainText?.text || prediction.text?.text || '',
                  secondaryText: prediction.secondaryText?.text || '',
                };
              });
            setSuggestions(newSuggestions);
          } else {
            setSuggestions([]);
          }
        } catch (err) {
          console.error('Places autocomplete error:', err);
          setError('Failed to search for locations');
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [isLoaded, debounceMs, minChars]
  );

  // Select a place and get its details (coordinates) using the NEW Place class
  const selectPlace = useCallback(
    async (placeId: string): Promise<LocationSelection | null> => {
      if (!isLoaded) {
        setError('Google Maps API not loaded');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the NEW Place class with fetchFields
        const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;

        const place = new Place({
          id: placeId,
        });

        // Fetch the fields we need
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });

        if (place.location) {
          const selection: LocationSelection = {
            name: place.displayName || '',
            formattedAddress: place.formattedAddress || '',
            latitude: place.location.lat(),
            longitude: place.location.lng(),
            placeId,
          };
          return selection;
        } else {
          setError('Unable to get location details');
          return null;
        }
      } catch (err) {
        console.error('Place details error:', err);
        setError('Unable to get location details');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded]
  );

  // Clear all state
  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSuggestions([]);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error: derivedError,
    search,
    selectPlace,
    clear,
  };
}
