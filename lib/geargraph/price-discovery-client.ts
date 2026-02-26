/**
 * Price Discovery Client
 *
 * Fire-and-forget client for triggering price discovery in GearGraph (gearcrew-mastra).
 * Called after a gear item is saved to Supabase — never blocks the user operation.
 */

export interface PriceDiscoveryParams {
  gearItemId: string;
  brand: string | null;
  name: string;
  productUrl: string | null;
  /** BCP-47 locale code, e.g. 'de' or 'en'. Used for localised search queries. */
  locale?: string;
  /** ISO 4217 currency code, e.g. 'EUR' or 'USD'. Used as preferred currency for price extraction. */
  currency?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. 'DE'. Used to bias reseller search results. */
  country?: string;
}

/**
 * Trigger async price discovery in GearGraph.
 * Never throws — errors are logged but do not affect the caller.
 */
export async function triggerPriceDiscovery(params: PriceDiscoveryParams): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_GEARGRAPH_API_URL ?? process.env.GEARGRAPH_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_GEARGRAPH_API_KEY ?? process.env.GEARGRAPH_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn('[PriceDiscovery] GEARGRAPH_API_URL or GEARGRAPH_API_KEY not configured — skipping');
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/price-discovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.warn(`[PriceDiscovery] GearGraph returned ${response.status} — price discovery skipped`);
    }
  } catch (error) {
    console.warn('[PriceDiscovery] Failed to trigger price discovery (non-blocking):', error);
  }
}
