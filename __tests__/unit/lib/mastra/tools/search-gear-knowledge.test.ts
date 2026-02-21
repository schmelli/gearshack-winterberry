/**
 * Unit Tests for searchGearKnowledge Tool
 * Feature: 060-ai-agent-evolution
 *
 * Tests the internal searchCatalog() logic (via tool execute) and the
 * searchGearKnowledgeTool definition. Key focus:
 *
 * - Brand filter: no brands found → returns empty catalog results (not ignored!)
 * - Brand filter: brands found → filters catalog_products by brand_id with .in()
 * - Brand filter: no filter → searches without brand restriction
 * - Tool ID correctness
 * - Normal search without brand filter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchGearKnowledgeTool } from '@/lib/mastra/tools/search-gear-knowledge';
import { createServiceRoleClient } from '@/lib/supabase/server';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

// Mock fetch globally (used by fetchInsightsFromGearGraph)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

// =============================================================================
// Chainable Supabase Mock Builder
// =============================================================================

/**
 * Creates a chainable Supabase query mock.
 * Each method returns `this` so calls can be chained.
 * The terminal `.range()` resolves with the given finalResult.
 */
function createChainableMock(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(finalResult),
  };
  return chain;
}

/**
 * A simple one-shot mock for queries that resolve immediately
 * (e.g., the catalog_brands lookup which does not use .range()).
 */
function createSimpleSelectMock(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockResolvedValue(result),
  };
}

// =============================================================================
// Execution Context Helper
// =============================================================================

function makeExecutionContext(userId = 'test-user-123') {
  return { requestContext: new Map([['userId', userId]]) };
}

// =============================================================================
// Test Data
// =============================================================================

const MOCK_CATALOG_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Hilleberg Nallo 2',
    product_type: 'tent',
    description: 'Lightweight 4-season tent',
    price_usd: 699,
    weight_grams: 1600,
    catalog_brands: { name: 'Hilleberg' },
  },
  {
    id: 'prod-2',
    name: 'Hilleberg Soulo',
    product_type: 'tent',
    description: 'Single-person 4-season tent',
    price_usd: 599,
    weight_grams: 1400,
    catalog_brands: { name: 'Hilleberg' },
  },
];

const MOCK_GEAR_ITEMS = [
  {
    id: 'gear-1',
    name: 'MSR PocketRocket',
    brand: 'MSR',
    weight_grams: 73,
    price_paid: 49,
    status: 'own',
    product_type_id: 'cat-stoves',
    categories: { label: 'Stoves' },
  },
];

const MOCK_CATEGORIES = [
  { id: 'cat-stoves', slug: 'stoves', label: 'Stoves', parent_id: null, i18n: { de: 'Kocher' } },
  { id: 'cat-tents', slug: 'tents', label: 'Tents', parent_id: null, i18n: { de: 'Zelte' } },
];

// =============================================================================
// Tests
// =============================================================================

describe('searchGearKnowledgeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fetch (GearGraph insights) returns empty / disabled
    mockFetch.mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Tool Definition
  // ---------------------------------------------------------------------------

  describe('Tool Definition', () => {
    it('should have the correct tool ID "searchGearKnowledge"', () => {
      expect(searchGearKnowledgeTool.id).toBe('searchGearKnowledge');
    });

    it('should have an inputSchema', () => {
      expect(searchGearKnowledgeTool.inputSchema).toBeDefined();
    });

    it('should have an outputSchema', () => {
      expect(searchGearKnowledgeTool.outputSchema).toBeDefined();
    });

    it('should have a description mentioning primary tool purpose', () => {
      expect(searchGearKnowledgeTool.description).toContain('PRIMARY TOOL');
    });

    it('should have an execute function', () => {
      expect(typeof searchGearKnowledgeTool.execute).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('Authentication', () => {
    it('should return error when userId is missing from context', async () => {
      const ctx = { requestContext: new Map<string, unknown>() };
      const result = await searchGearKnowledgeTool.execute(
        { query: 'tent', scope: 'catalog', limit: 10, offset: 0, sortBy: 'relevance' },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No user ID');
    });
  });

  // ---------------------------------------------------------------------------
  // searchCatalog – Brand Filter: No Brands Found
  // ---------------------------------------------------------------------------

  describe('searchCatalog – Brand filter: no brands found', () => {
    it('should return empty catalog data when brand lookup finds nothing', async () => {
      // catalog_brands lookup returns empty array (brand not found)
      const brandLookupMock = createSimpleSelectMock({ data: [], error: null });
      // catalog_products query (should NOT be reached since we early-return)
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });
      // categories (for resolveCategoryIds in searchUserGear, but scope=catalog so not called)

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_brands') return brandLookupMock;
          if (table === 'catalog_products') return productsMock;
          // Should not be called for scope=catalog
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          filters: { brand: 'NonExistentBrand' },
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      // Catalog products should be empty because brand was not found
      expect(result.catalogProducts).toEqual([]);
      expect(result.totalResults).toBe(0);
      // The catalog_products chain's .in() should NOT have been called
      expect(productsMock.in).not.toHaveBeenCalled();
      // The catalog_products chain's .range() should NOT have been called
      expect(productsMock.range).not.toHaveBeenCalled();
    });

    it('should include "no results" in summary when brand not found', async () => {
      const brandLookupMock = createSimpleSelectMock({ data: [], error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_brands') return brandLookupMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'jacket',
          scope: 'catalog',
          filters: { brand: 'GhostBrand' },
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.summary).toContain('No results found');
    });
  });

  // ---------------------------------------------------------------------------
  // searchCatalog – Brand Filter: Brands Found
  // ---------------------------------------------------------------------------

  describe('searchCatalog – Brand filter: brands found', () => {
    it('should filter catalog_products by brand_id using .in() when brand is found', async () => {
      const brandIds = [{ id: 'brand-hilleberg' }];
      const brandLookupMock = createSimpleSelectMock({ data: brandIds, error: null });
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_brands') return brandLookupMock;
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          filters: { brand: 'Hilleberg' },
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      // .in() must be called with brand_id and the resolved brand IDs
      expect(productsMock.in).toHaveBeenCalledWith('brand_id', ['brand-hilleberg']);
      expect(result.catalogProducts).toHaveLength(2);
      expect(result.catalogProducts![0].name).toBe('Hilleberg Nallo 2');
      expect(result.catalogProducts![1].name).toBe('Hilleberg Soulo');
    });

    it('should correctly flatten brand_name from catalog_brands relation', async () => {
      const brandLookupMock = createSimpleSelectMock({ data: [{ id: 'brand-1' }], error: null });
      const productsMock = createChainableMock({
        data: [
          {
            id: 'prod-1',
            name: 'Test Tent',
            product_type: 'tent',
            description: null,
            price_usd: 499,
            weight_grams: 1200,
            catalog_brands: { name: 'TestBrand' },
          },
        ],
        error: null,
      });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_brands') return brandLookupMock;
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          filters: { brand: 'TestBrand' },
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.catalogProducts![0].brand).toBe('TestBrand');
    });

    it('should handle multiple matching brand IDs with .in()', async () => {
      const brandIds = [{ id: 'brand-a' }, { id: 'brand-b' }];
      const brandLookupMock = createSimpleSelectMock({ data: brandIds, error: null });
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_brands') return brandLookupMock;
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      await searchGearKnowledgeTool.execute(
        {
          query: 'gear',
          scope: 'catalog',
          filters: { brand: 'Hill' },
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(productsMock.in).toHaveBeenCalledWith('brand_id', ['brand-a', 'brand-b']);
    });
  });

  // ---------------------------------------------------------------------------
  // searchCatalog – No Brand Filter (Normal Path)
  // ---------------------------------------------------------------------------

  describe('searchCatalog – No brand filter', () => {
    it('should search catalog without brand restriction when no brand filter provided', async () => {
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      // .in() should NOT be called when there is no brand filter
      expect(productsMock.in).not.toHaveBeenCalled();
      // catalog_brands table should NOT be queried
      expect(supabase.from).not.toHaveBeenCalledWith('catalog_brands');
      expect(result.catalogProducts).toHaveLength(2);
    });

    it('should apply text OR filter across name, description, product_type', async () => {
      const productsMock = createChainableMock({ data: [], error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      await searchGearKnowledgeTool.execute(
        {
          query: 'ultralight',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(productsMock.or).toHaveBeenCalledWith(
        'name.ilike.%ultralight%,description.ilike.%ultralight%,product_type.ilike.%ultralight%'
      );
    });

    it('should apply weight filter when maxWeight is specified', async () => {
      const productsMock = createChainableMock({ data: [], error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          filters: { maxWeight: 1500 },
          limit: 10,
          offset: 0,
          sortBy: 'weight_asc',
        },
        makeExecutionContext()
      );

      expect(productsMock.lte).toHaveBeenCalledWith('weight_grams', 1500);
    });

    it('should apply price filter when maxPrice is specified', async () => {
      const productsMock = createChainableMock({ data: [], error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      await searchGearKnowledgeTool.execute(
        {
          query: 'jacket',
          scope: 'catalog',
          filters: { maxPrice: 300 },
          limit: 10,
          offset: 0,
          sortBy: 'price_asc',
        },
        makeExecutionContext()
      );

      expect(productsMock.lte).toHaveBeenCalledWith('price_usd', 300);
    });
  });

  // ---------------------------------------------------------------------------
  // searchUserGear
  // ---------------------------------------------------------------------------

  describe('searchUserGear', () => {
    it('should search user gear when scope is my_gear', async () => {
      const categoriesMock = {
        from: 'categories',
        select: vi.fn().mockResolvedValue({ data: MOCK_CATEGORIES, error: null }),
      };
      const gearMock = createChainableMock({ data: MOCK_GEAR_ITEMS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') return categoriesMock;
          if (table === 'gear_items') return gearMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'stove',
          scope: 'my_gear',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.myGear).toBeDefined();
      expect(gearMock.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    it('should flatten category label into the result', async () => {
      const categoriesMock = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const gearMock = createChainableMock({
        data: [
          {
            id: 'gear-1',
            name: 'MSR PocketRocket',
            brand: 'MSR',
            weight_grams: 73,
            price_paid: 49,
            status: 'own',
            product_type_id: 'cat-stoves',
            categories: { label: 'Stoves' },
          },
        ],
        error: null,
      });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') return categoriesMock;
          if (table === 'gear_items') return gearMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'pocket',
          scope: 'my_gear',
          limit: 10,
          offset: 0,
          sortBy: 'name',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.myGear![0].category).toBe('Stoves');
    });
  });

  // ---------------------------------------------------------------------------
  // Scope: all
  // ---------------------------------------------------------------------------

  describe('scope: all', () => {
    it('should search both user gear and catalog when scope is all', async () => {
      const categoriesMock = {
        select: vi.fn().mockResolvedValue({ data: MOCK_CATEGORIES, error: null }),
      };
      const gearMock = createChainableMock({ data: MOCK_GEAR_ITEMS, error: null });
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') return categoriesMock;
          if (table === 'gear_items') return gearMock;
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'all',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.myGear).toBeDefined();
      expect(result.catalogProducts).toBeDefined();
      expect(result.totalResults).toBe(result.myGear!.length + result.catalogProducts!.length);
    });
  });

  // ---------------------------------------------------------------------------
  // Summary Building
  // ---------------------------------------------------------------------------

  describe('Summary Building', () => {
    it('should include gear count in summary when user gear found', async () => {
      const categoriesMock = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const gearMock = createChainableMock({ data: MOCK_GEAR_ITEMS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') return categoriesMock;
          if (table === 'gear_items') return gearMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'stove',
          scope: 'my_gear',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.summary).toContain('1');
      expect(result.summary).toContain('inventory');
    });

    it('should include catalog count in summary when catalog products found', async () => {
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.summary).toContain('2');
      expect(result.summary).toContain('catalog');
    });
  });

  // ---------------------------------------------------------------------------
  // totalResults
  // ---------------------------------------------------------------------------

  describe('totalResults', () => {
    it('should return 0 totalResults when no data found', async () => {
      const supabase = {
        from: vi.fn(() => createChainableMock({ data: [], error: null })),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'xyz_nonexistent',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(true);
      expect(result.totalResults).toBe(0);
    });

    it('should correctly sum myGear and catalogProducts for totalResults', async () => {
      const categoriesMock = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const gearMock = createChainableMock({ data: MOCK_GEAR_ITEMS, error: null }); // 1 item
      const productsMock = createChainableMock({ data: MOCK_CATALOG_PRODUCTS, error: null }); // 2 items

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') return categoriesMock;
          if (table === 'gear_items') return gearMock;
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'gear',
          scope: 'all',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.totalResults).toBe(3); // 1 + 2
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should return success: false on unexpected error', async () => {
      mockCreateServiceRoleClient.mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Supabase connection failed');
      expect(result.totalResults).toBe(0);
    });

    it('should handle catalog search DB error gracefully', async () => {
      const productsMock = createChainableMock({ data: null, error: { message: 'DB error' } });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      const result = await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          limit: 10,
          offset: 0,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      // Promise.allSettled catches the rejected promise; result should still be success
      // but with 0 catalog products (the rejected promise is silently dropped)
      expect(result.success).toBe(true);
      expect(result.catalogProducts).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  describe('Pagination', () => {
    it('should call .range() with correct offset and limit values', async () => {
      const productsMock = createChainableMock({ data: [], error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'catalog_products') return productsMock;
          return createChainableMock({ data: [], error: null });
        }),
      };

      mockCreateServiceRoleClient.mockReturnValue(supabase as ReturnType<typeof createServiceRoleClient>);

      await searchGearKnowledgeTool.execute(
        {
          query: 'tent',
          scope: 'catalog',
          limit: 10,
          offset: 20,
          sortBy: 'relevance',
        },
        makeExecutionContext()
      );

      // range(offset, offset + limit - 1) = range(20, 29)
      expect(productsMock.range).toHaveBeenCalledWith(20, 29);
    });
  });
});
