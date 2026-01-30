/**
 * useGearItems Hook
 *
 * Feature: 040-supabase-migration
 * Tasks: T029, T030, T037
 *
 * Provides gear items CRUD operations using Supabase.
 * Includes optional real-time subscription for live updates.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  gearItemFromDb,
  gearItemToDbInsert,
  gearItemToDbUpdate,
} from '@/lib/supabase/transformers';
import type { GearItem } from '@/types/gear';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Tables } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

export interface UseGearItemsReturn {
  /** List of gear items */
  items: GearItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Fetch all items */
  fetchItems: () => Promise<void>;
  /** Create a new item */
  createItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GearItem | null>;
  /** Update an item */
  updateItem: (id: string, data: Partial<GearItem>) => Promise<GearItem | null>;
  /** Delete an item */
  deleteItem: (id: string) => Promise<boolean>;
  /** Get item by ID */
  getItem: (id: string) => GearItem | undefined;
}

interface UseGearItemsOptions {
  /** Enable real-time subscription (T030) */
  realtime?: boolean;
  /** Filter by category ID (T037) */
  categoryId?: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGearItems(
  userId: string | null,
  options: UseGearItemsOptions = {}
): UseGearItemsReturn {
  const { realtime = false, categoryId = null } = options;

  const [items, setItems] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch all items (T029)
  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Explicit column selection for better performance and documentation
      // All columns used by gearItemFromDb transformer
      const gearItemColumns = `
        id,
        created_at,
        updated_at,
        user_id,
        name,
        brand,
        description,
        brand_url,
        model_number,
        product_url,
        product_type_id,
        weight_grams,
        weight_display_unit,
        length_cm,
        width_cm,
        height_cm,
        size,
        color,
        volume_liters,
        materials,
        tent_construction,
        price_paid,
        currency,
        manufacturer_price,
        manufacturer_currency,
        purchase_date,
        retailer,
        retailer_url,
        primary_image_url,
        gallery_image_urls,
        nobg_images,
        condition,
        status,
        notes,
        quantity,
        is_favourite,
        is_for_sale,
        can_be_borrowed,
        can_be_traded,
        source_merchant_id,
        source_offer_id,
        source_loadout_id,
        dependency_ids
      `;
      let query = supabase
        .from('gear_items')
        .select(gearItemColumns)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // T037: Filter by category if provided
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching gear items:', fetchError);
        setError(fetchError.message);
        return;
      }

      const gearItems = ((data || []) as Tables<'gear_items'>[]).map(gearItemFromDb);
      setItems(gearItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch gear items';
      console.error('Unexpected error fetching gear items:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, categoryId, supabase]);

  // Create item (T029)
  const createItem = useCallback(
    async (
      item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<GearItem | null> => {
      if (!userId) {
        setError('User not authenticated');
        return null;
      }

      setError(null);

      try {
        const insertData = gearItemToDbInsert(item, userId);

        const { data, error: insertError } = await supabase
          .from('gear_items')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating gear item:', insertError);
          setError(insertError.message);
          return null;
        }

        const newItem = gearItemFromDb(data as Tables<'gear_items'>);

        // Update local state (if not using realtime)
        if (!realtime) {
          setItems((prev) => [newItem, ...prev]);
        }

        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create gear item';
        console.error('Unexpected error creating gear item:', err);
        setError(message);
        return null;
      }
    },
    [userId, supabase, realtime]
  );

  // Update item (T029)
  const updateItem = useCallback(
    async (id: string, data: Partial<GearItem>): Promise<GearItem | null> => {
      if (!userId) {
        setError('User not authenticated');
        return null;
      }

      setError(null);

      try {
        const updateData = gearItemToDbUpdate(data);

        const { data: updatedData, error: updateError } = await supabase
          .from('gear_items')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId) // Extra safety check
          .select()
          .single();

        if (updateError) {
          console.error('Error updating gear item:', updateError);
          setError(updateError.message);
          return null;
        }

        const updatedItem = gearItemFromDb(updatedData as Tables<'gear_items'>);

        // Update local state (if not using realtime)
        if (!realtime) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? updatedItem : item))
          );
        }

        return updatedItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update gear item';
        console.error('Unexpected error updating gear item:', err);
        setError(message);
        return null;
      }
    },
    [userId, supabase, realtime]
  );

  // Delete item (T029)
  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) {
        setError('User not authenticated');
        return false;
      }

      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('gear_items')
          .delete()
          .eq('id', id)
          .eq('user_id', userId); // Extra safety check

        if (deleteError) {
          console.error('Error deleting gear item:', deleteError);
          setError(deleteError.message);
          return false;
        }

        // Update local state (if not using realtime)
        if (!realtime) {
          setItems((prev) => prev.filter((item) => item.id !== id));
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete gear item';
        console.error('Unexpected error deleting gear item:', err);
        setError(message);
        return false;
      }
    },
    [userId, supabase, realtime]
  );

  // Get item by ID (utility)
  const getItem = useCallback(
    (id: string): GearItem | undefined => {
      return items.find((item) => item.id === id);
    },
    [items]
  );

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // T030: Real-time subscription (optional)
  useEffect(() => {
    if (!realtime || !userId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to changes
    const channel = supabase
      .channel(`gear_items:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gear_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          switch (eventType) {
            case 'INSERT':
              if (newRow) {
                const newItem = gearItemFromDb(newRow as never);
                setItems((prev) => [newItem, ...prev]);
              }
              break;
            case 'UPDATE':
              if (newRow) {
                const updatedItem = gearItemFromDb(newRow as never);
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === updatedItem.id ? updatedItem : item
                  )
                );
              }
              break;
            case 'DELETE':
              if (oldRow) {
                const deletedId = (oldRow as { id: string }).id;
                setItems((prev) => prev.filter((item) => item.id !== deletedId));
              }
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [realtime, userId, supabase]);

  return {
    items,
    isLoading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    getItem,
  };
}
