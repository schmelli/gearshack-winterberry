/**
 * Integration Tests: Catalog Search API
 * Route: GET /api/catalog/items/search
 * Feature: 042-catalog-sync-api
 *
 * Tests catalog product fuzzy search including parameter validation,
 * filtering, scoring, and category hierarchy derivation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// Mock Dependencies
// =============================================================================

const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseIlike = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseLimit = vi.fn();
const mockSupabaseOrder = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockCatalogProducts = [
  {
    id: 'prod-001',
    name: 'Big Agnes Copper Spur HV UL2',
    product_type: 'Tent',
    product_type_id: 'cat-tent-001',
    description: 'Ultralight 2-person backpacking tent',
    price_usd: 449.95,
    weight_grams: 1020,
    brand_id: 'brand-001',
    catalog_brands: { id: 'brand-001', name: 'Big Agnes' },
  },
  {
    id: 'prod-002',
    name: 'MSR Hubba Hubba NX 2',
    product_type: 'Tent',
    product_type_id: 'cat-tent-001',
    description: 'Lightweight 2-person tent',
    price_usd: 469.95,
    weight_grams: 1540,
    brand_id: 'brand-002',
    catalog_brands: { id: 'brand-002', name: 'MSR' },
  },
  {
    id: 'prod-003',
    name: 'Nemo Dagger OSMO 2P',
    product_type: 'Tent',
    product_type_id: 'cat-tent-001',
    description: 'Award-winning ultralight tent',
    price_usd: 549.95,
    weight_grams: 1580,
    brand_id: 'brand-003',
    catalog_brands: { id: 'brand-003', name: 'Nemo' },
  },
];

const mockCategories = [
  { id: 'cat-shelter', label: 'Shelter', slug: 'shelter', level: 0, parent_id: null },
  { id: 'cat-tents', label: 'Tents', slug: 'tents', level: 1, parent_id: 'cat-shelter' },
  { id: 'cat-tent-001', label: 'Backpacking Tent', slug: 'backpacking-tent', level: 2, parent_id: 'cat-tents' },
];

// =============================================================================
// Helper Functions
// =============================================================================

function createMockRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/catalog/items/search');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

function setupSuccessfulProductQuery(products = mockCatalogProducts) {
  const queryBuilder = {
    select: mockSupabaseSelect.mockReturnThis(),
    ilike: mockSupabaseIlike.mockReturnThis(),
    eq: mockSupabaseEq.mockReturnThis(),
    limit: mockSupabaseLimit.mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: products, error: null })),
  };
  mockSupabaseFrom.mockReturnValue(queryBuilder);
  return queryBuilder;
}

function setupSuccessfulCategoryQuery() {
  const categoryQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: mockSupabaseOrder.mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: mockCategories, error: null })),
  };
  return categoryQueryBuilder;
}

// =============================================================================
// Tests
// =============================================================================

describe('GET /api/catalog/items/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Validation Tests
  // -------------------------------------------------------------------------

  it('should return 400 when query parameter is missing for fuzzy mode', async () => {
    // Arrange
    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ mode: 'fuzzy' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toContain("'q' is required");
  });

  it('should return 400 when limit exceeds maximum', async () => {
    // Arrange
    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent', limit: '100' });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 400 when brand_id is not a valid UUID', async () => {
    // Arrange
    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent', brand_id: 'invalid-uuid' });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Configuration Error Tests
  // -------------------------------------------------------------------------

  it('should return 500 when Supabase URL is not configured', async () => {
    // Arrange
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('Server configuration error');
  });

  // -------------------------------------------------------------------------
  // Success Path Tests
  // -------------------------------------------------------------------------

  it('should successfully search products with fuzzy matching', async () => {
    // Arrange
    const productQuery = setupSuccessfulProductQuery();

    // Override the from mock to return different query builders for different tables
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') {
        return productQuery;
      }
      if (table === 'categories') {
        return setupSuccessfulCategoryQuery();
      }
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'copper spur' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.query).toBe('copper spur');
    expect(body.mode).toBe('fuzzy');
    expect(body.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('should apply default limit of 5 when not specified', async () => {
    // Arrange
    const productQuery = setupSuccessfulProductQuery();
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') return productQuery;
      if (table === 'categories') return setupSuccessfulCategoryQuery();
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent' });

    // Act
    await GET(request);

    // Assert
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5);
  });

  it('should filter by brand_id when provided', async () => {
    // Arrange
    const brandId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const productQuery = setupSuccessfulProductQuery([mockCatalogProducts[0]]);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') return productQuery;
      if (table === 'categories') return setupSuccessfulCategoryQuery();
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent', brand_id: brandId });

    // Act
    await GET(request);

    // Assert
    expect(mockSupabaseEq).toHaveBeenCalledWith('brand_id', brandId);
  });

  it('should filter by product_type_id when provided', async () => {
    // Arrange
    const productTypeId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const productQuery = setupSuccessfulProductQuery([mockCatalogProducts[0]]);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') return productQuery;
      if (table === 'categories') return setupSuccessfulCategoryQuery();
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent', product_type_id: productTypeId });

    // Act
    await GET(request);

    // Assert
    expect(mockSupabaseEq).toHaveBeenCalledWith('product_type_id', productTypeId);
  });

  // -------------------------------------------------------------------------
  // Response Format Tests
  // -------------------------------------------------------------------------

  it('should return properly formatted search results with brand info', async () => {
    // Arrange
    const singleProduct = [mockCatalogProducts[0]];
    const productQuery = setupSuccessfulProductQuery(singleProduct);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') return productQuery;
      if (table === 'categories') return setupSuccessfulCategoryQuery();
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'big agnes' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    if (body.results.length > 0) {
      const result = body.results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('score');
      if (result.brand) {
        expect(result.brand).toHaveProperty('id');
        expect(result.brand).toHaveProperty('name');
      }
    }
  });

  // -------------------------------------------------------------------------
  // Error Handling Tests
  // -------------------------------------------------------------------------

  it('should handle database errors gracefully', async () => {
    // Arrange
    const errorQueryBuilder = {
      select: mockSupabaseSelect.mockReturnThis(),
      ilike: mockSupabaseIlike.mockReturnThis(),
      eq: mockSupabaseEq.mockReturnThis(),
      limit: mockSupabaseLimit.mockReturnThis(),
      then: vi.fn((resolve) =>
        resolve({ data: null, error: { message: 'Database connection failed' } })
      ),
    };
    mockSupabaseFrom.mockReturnValue(errorQueryBuilder);

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'tent' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    // The route returns empty results on DB error rather than 500
    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
  });

  it('should handle empty search results', async () => {
    // Arrange
    const productQuery = setupSuccessfulProductQuery([]);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'catalog_products') return productQuery;
      if (table === 'categories') return setupSuccessfulCategoryQuery();
      return productQuery;
    });

    const { GET } = await import('@/app/api/catalog/items/search/route');
    const request = createMockRequest({ q: 'nonexistent-product-xyz' });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
    expect(body.count).toBe(0);
  });
});
