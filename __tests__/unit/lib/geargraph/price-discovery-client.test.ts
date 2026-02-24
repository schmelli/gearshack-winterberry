import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set env before importing module
process.env.GEARGRAPH_API_URL = 'https://geargraph.gearshack.app';
process.env.GEARGRAPH_API_KEY = 'test-key';

describe('triggerPriceDiscovery', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('POSTs to /api/price-discovery with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ runId: 'run-123' }) });

    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');

    await triggerPriceDiscovery({
      gearItemId: 'item-abc',
      brand: 'Durston Gear',
      name: 'X-Mid Pro 2',
      productUrl: 'https://durstondesigns.com/x-mid-pro-2',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://geargraph.gearshack.app/api/price-discovery');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toMatchObject({
      gearItemId: 'item-abc',
      brand: 'Durston Gear',
      name: 'X-Mid Pro 2',
      productUrl: 'https://durstondesigns.com/x-mid-pro-2',
    });
    expect(options.headers['Authorization']).toBe('Bearer test-key');
  });

  it('resolves without throwing if fetch fails (fire-and-forget)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');
    await expect(triggerPriceDiscovery({ gearItemId: 'x', brand: null, name: 'Y', productUrl: null })).resolves.toBeUndefined();
  });

  it('resolves without throwing if GearGraph returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');
    await expect(triggerPriceDiscovery({ gearItemId: 'x', brand: null, name: 'Y', productUrl: null })).resolves.toBeUndefined();
  });
});
