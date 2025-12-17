/**
 * Custom hook for personal offers from partner retailers
 * Feature: 050-price-tracking (US5)
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PersonalOffer } from '@/types/price-tracking';

interface UsePersonalOffersResult {
  offers: PersonalOffer[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  dismissOffer: (offerId: string) => Promise<void>;
}

export function usePersonalOffers(gearItemId?: string): UsePersonalOffersResult {
  const [offers, setOffers] = useState<PersonalOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Build query
      let query = supabase
        .from('personal_offers')
        .select(
          `
          *,
          partner_retailers (
            name,
            logo_url,
            website_url
          )
        `
        )
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .gt('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Filter by gear item if provided
      if (gearItemId) {
        const { data: tracking } = await supabase
          .from('price_tracking')
          .select('id')
          .eq('user_id', user.id)
          .eq('gear_item_id', gearItemId)
          .maybeSingle();

        if (tracking) {
          query = query.eq('tracking_id', tracking.id);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setOffers(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissOffer = async (offerId: string) => {
    try {
      const supabase = createClient();

      const { error: dismissError } = await supabase
        .from('personal_offers')
        .update({ dismissed: true })
        .eq('id', offerId);

      if (dismissError) throw dismissError;

      // Update local state
      setOffers((prev) => prev.filter((offer) => offer.id !== offerId));
    } catch (err) {
      console.error('Failed to dismiss offer:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadOffers();
  }, [gearItemId]);

  return {
    offers,
    isLoading,
    error,
    refresh: loadOffers,
    dismissOffer,
  };
}
