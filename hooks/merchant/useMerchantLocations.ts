/**
 * useMerchantLocations Hook
 *
 * Feature: 053-merchant-integration
 * Task: T043
 *
 * Manages merchant store locations with CRUD operations.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useMerchantAuth } from './useMerchantAuth';
import type { MerchantLocation, MerchantLocationInput } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface UseMerchantLocationsReturn {
  /** All locations for the merchant */
  locations: MerchantLocation[];
  /** Loading state */
  isLoading: boolean;
  /** Saving state */
  isSaving: boolean;
  /** Error message */
  error: string | null;
  /** CRUD operations */
  addLocation: (input: MerchantLocationInput) => Promise<MerchantLocation | null>;
  updateLocation: (locationId: string, input: Partial<MerchantLocationInput>) => Promise<boolean>;
  deleteLocation: (locationId: string) => Promise<boolean>;
  setPrimaryLocation: (locationId: string) => Promise<boolean>;
  /** Refresh data */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useMerchantLocations(): UseMerchantLocationsReturn {
  const { merchant } = useMerchantAuth();
  const [locations, setLocations] = useState<MerchantLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch Locations
  // ---------------------------------------------------------------------------
  const fetchLocations = useCallback(async () => {
    if (!merchant?.id) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('merchant_locations')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('is_primary', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;

      const transformed: MerchantLocation[] = (data ?? []).map((row) => ({
        id: row.id,
        merchantId: row.merchant_id,
        name: row.name,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        postalCode: row.postal_code,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude,
        phone: row.phone,
        hours: row.hours,
        isPrimary: row.is_primary,
        createdAt: row.created_at,
      }));

      setLocations(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load locations';
      setError(message);
      console.error('Failed to fetch locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id]);

  // Fetch on mount and merchant change
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // ---------------------------------------------------------------------------
  // Add Location
  // ---------------------------------------------------------------------------
  const addLocation = useCallback(
    async (input: MerchantLocationInput): Promise<MerchantLocation | null> => {
      if (!merchant?.id) {
        toast.error('Not authenticated as merchant');
        return null;
      }

      const supabase = createBrowserClient();
      setIsSaving(true);

      try {
        // If this is the first location or marked as primary, ensure only one primary
        const shouldBePrimary = input.isPrimary || locations.length === 0;

        if (shouldBePrimary && locations.some((l) => l.isPrimary)) {
          // Unset existing primary
          await supabase
            .from('merchant_locations')
            .update({ is_primary: false })
            .eq('merchant_id', merchant.id)
            .eq('is_primary', true);
        }

        const { data, error: insertError } = await supabase
          .from('merchant_locations')
          .insert({
            merchant_id: merchant.id,
            name: input.name,
            address_line1: input.addressLine1,
            address_line2: input.addressLine2,
            city: input.city,
            postal_code: input.postalCode,
            country: input.country ?? 'DE',
            latitude: input.latitude,
            longitude: input.longitude,
            phone: input.phone,
            hours: input.hours,
            is_primary: shouldBePrimary,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newLocation: MerchantLocation = {
          id: data.id,
          merchantId: data.merchant_id,
          name: data.name,
          addressLine1: data.address_line1,
          addressLine2: data.address_line2,
          city: data.city,
          postalCode: data.postal_code,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          hours: data.hours,
          isPrimary: data.is_primary,
          createdAt: data.created_at,
        };

        setLocations((prev) => {
          // Update primary flags in local state if needed
          if (shouldBePrimary) {
            return [newLocation, ...prev.map((l) => ({ ...l, isPrimary: false }))];
          }
          return [...prev, newLocation];
        });

        toast.success('Location added');
        return newLocation;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add location';
        toast.error(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, locations]
  );

  // ---------------------------------------------------------------------------
  // Update Location
  // ---------------------------------------------------------------------------
  const updateLocation = useCallback(
    async (locationId: string, input: Partial<MerchantLocationInput>): Promise<boolean> => {
      if (!merchant?.id) return false;

      const supabase = createBrowserClient();
      setIsSaving(true);

      try {
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.addressLine1 !== undefined) updateData.address_line1 = input.addressLine1;
        if (input.addressLine2 !== undefined) updateData.address_line2 = input.addressLine2;
        if (input.city !== undefined) updateData.city = input.city;
        if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
        if (input.country !== undefined) updateData.country = input.country;
        if (input.latitude !== undefined) updateData.latitude = input.latitude;
        if (input.longitude !== undefined) updateData.longitude = input.longitude;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.hours !== undefined) updateData.hours = input.hours;

        const { error: updateError } = await supabase
          .from('merchant_locations')
          .update(updateData)
          .eq('id', locationId)
          .eq('merchant_id', merchant.id);

        if (updateError) throw updateError;

        setLocations((prev) =>
          prev.map((l) =>
            l.id === locationId
              ? {
                  ...l,
                  name: input.name ?? l.name,
                  addressLine1: input.addressLine1 ?? l.addressLine1,
                  addressLine2: input.addressLine2 ?? l.addressLine2,
                  city: input.city ?? l.city,
                  postalCode: input.postalCode ?? l.postalCode,
                  country: input.country ?? l.country,
                  latitude: input.latitude ?? l.latitude,
                  longitude: input.longitude ?? l.longitude,
                  phone: input.phone ?? l.phone,
                  hours: input.hours ?? l.hours,
                }
              : l
          )
        );

        toast.success('Location updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update location';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id]
  );

  // ---------------------------------------------------------------------------
  // Delete Location
  // ---------------------------------------------------------------------------
  const deleteLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      if (!merchant?.id) return false;

      const supabase = createBrowserClient();
      setIsSaving(true);

      try {
        const locationToDelete = locations.find((l) => l.id === locationId);

        const { error: deleteError } = await supabase
          .from('merchant_locations')
          .delete()
          .eq('id', locationId)
          .eq('merchant_id', merchant.id);

        if (deleteError) throw deleteError;

        // If we deleted the primary, make the next one primary
        if (locationToDelete?.isPrimary && locations.length > 1) {
          const nextPrimary = locations.find((l) => l.id !== locationId);
          if (nextPrimary) {
            await supabase
              .from('merchant_locations')
              .update({ is_primary: true })
              .eq('id', nextPrimary.id);

            setLocations((prev) =>
              prev
                .filter((l) => l.id !== locationId)
                .map((l, idx) => ({ ...l, isPrimary: idx === 0 }))
            );
          }
        } else {
          setLocations((prev) => prev.filter((l) => l.id !== locationId));
        }

        toast.success('Location deleted');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete location';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, locations]
  );

  // ---------------------------------------------------------------------------
  // Set Primary Location
  // ---------------------------------------------------------------------------
  const setPrimaryLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      if (!merchant?.id) return false;

      const supabase = createBrowserClient();
      setIsSaving(true);

      try {
        // Unset existing primary
        await supabase
          .from('merchant_locations')
          .update({ is_primary: false })
          .eq('merchant_id', merchant.id)
          .eq('is_primary', true);

        // Set new primary
        const { error: updateError } = await supabase
          .from('merchant_locations')
          .update({ is_primary: true })
          .eq('id', locationId);

        if (updateError) throw updateError;

        setLocations((prev) =>
          prev.map((l) => ({
            ...l,
            isPrimary: l.id === locationId,
          }))
        );

        toast.success('Primary location updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update primary location';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id]
  );

  return {
    locations,
    isLoading,
    isSaving,
    error,
    addLocation,
    updateLocation,
    deleteLocation,
    setPrimaryLocation,
    refresh: fetchLocations,
  };
}
