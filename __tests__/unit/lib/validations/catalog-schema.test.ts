/**
 * Catalog Schema Validation Tests
 *
 * Tests for catalog sync API validation schemas including
 * brands, products, and search parameters.
 */

import { describe, it, expect } from 'vitest';
import {
  brandPayloadSchema,
  brandSyncRequestSchema,
  productPayloadSchema,
  productSyncRequestSchema,
  brandSearchParamsSchema,
  productSearchParamsSchema,
} from '@/lib/validations/catalog-schema';

// =============================================================================
// Test Constants
// =============================================================================

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

const validBrand = {
  external_id: 'brand-001',
  name: 'Big Agnes',
  logo_url: 'https://bigagnes.com/logo.png',
  website_url: 'https://bigagnes.com',
};

const validProduct = {
  external_id: 'product-001',
  name: 'Big Agnes Copper Spur HV UL2',
  brand_external_id: 'brand-001',
  product_type: 'Backpacking Tent',
  product_type_id: validUUID,
  description: 'Ultralight 2-person backpacking tent',
  price_usd: 449.95,
  weight_grams: 1020,
};

// =============================================================================
// Brand Schema Tests
// =============================================================================

describe('brandPayloadSchema', () => {
  describe('Valid Data', () => {
    it('should accept complete brand data', () => {
      const result = brandPayloadSchema.safeParse(validBrand);
      expect(result.success).toBe(true);
    });

    it('should accept brand with null logo', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        logo_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand with null website', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        website_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand without optional fields', () => {
      const result = brandPayloadSchema.safeParse({
        external_id: 'brand-002',
        name: 'MSR',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('External ID Validation', () => {
    it('should reject empty external_id', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        external_id: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing external_id', () => {
      const { external_id, ...withoutId } = validBrand;
      const result = brandPayloadSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });
  });

  describe('Name Validation', () => {
    it('should reject empty name', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name over 200 characters', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        name: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should accept name at exactly 200 characters', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        name: 'a'.repeat(200),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('should reject invalid logo URL', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        logo_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const result = brandPayloadSchema.safeParse({
        ...validBrand,
        website_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('brandSyncRequestSchema', () => {
  it('should accept single brand', () => {
    const result = brandSyncRequestSchema.safeParse(validBrand);
    expect(result.success).toBe(true);
  });

  it('should accept batch of brands', () => {
    const result = brandSyncRequestSchema.safeParse({
      brands: [validBrand, { ...validBrand, external_id: 'brand-002', name: 'MSR' }],
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty brands array', () => {
    const result = brandSyncRequestSchema.safeParse({
      brands: [],
    });
    expect(result.success).toBe(true);
  });

  it('should reject more than 1000 brands', () => {
    const tooManyBrands = Array(1001).fill(null).map((_, i) => ({
      external_id: `brand-${i}`,
      name: `Brand ${i}`,
    }));
    const result = brandSyncRequestSchema.safeParse({
      brands: tooManyBrands,
    });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 1000 brands', () => {
    const maxBrands = Array(1000).fill(null).map((_, i) => ({
      external_id: `brand-${i}`,
      name: `Brand ${i}`,
    }));
    const result = brandSyncRequestSchema.safeParse({
      brands: maxBrands,
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Product Schema Tests
// =============================================================================

describe('productPayloadSchema', () => {
  describe('Valid Data', () => {
    it('should accept complete product data', () => {
      const result = productPayloadSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should accept minimal product', () => {
      const result = productPayloadSchema.safeParse({
        external_id: 'product-001',
        name: 'Generic Tent',
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with null optional fields', () => {
      const result = productPayloadSchema.safeParse({
        external_id: 'product-001',
        name: 'Generic Tent',
        brand_external_id: null,
        product_type: null,
        description: null,
        price_usd: null,
        weight_grams: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('External ID Validation', () => {
    it('should reject empty external_id', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        external_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Name Validation', () => {
    it('should reject empty name', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name over 500 characters', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        name: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept name at exactly 500 characters', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        name: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Product Type Validation', () => {
    it('should accept valid product_type_id UUID', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        product_type_id: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid product_type_id', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        product_type_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept product_type under 100 chars', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        product_type: 'Backpacking Tent',
      });
      expect(result.success).toBe(true);
    });

    it('should reject product_type over 100 chars', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        product_type: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Description Validation', () => {
    it('should accept description under 5000 chars', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        description: 'A great tent for backpacking.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description over 5000 chars', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        description: 'd'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Numeric Field Validation', () => {
    it('should reject negative price', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        price_usd: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should accept zero price', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        price_usd: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative weight', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        weight_grams: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should accept zero weight', () => {
      const result = productPayloadSchema.safeParse({
        ...validProduct,
        weight_grams: 0,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('productSyncRequestSchema', () => {
  it('should accept single product', () => {
    const result = productSyncRequestSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should accept batch of products', () => {
    const result = productSyncRequestSchema.safeParse({
      items: [
        validProduct,
        { ...validProduct, external_id: 'product-002', name: 'MSR Stove' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject more than 1000 products', () => {
    const tooManyProducts = Array(1001).fill(null).map((_, i) => ({
      external_id: `product-${i}`,
      name: `Product ${i}`,
    }));
    const result = productSyncRequestSchema.safeParse({
      items: tooManyProducts,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Search Schema Tests
// =============================================================================

describe('brandSearchParamsSchema', () => {
  it('should accept valid search', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: 'big agnes',
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it('should apply default limit', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: 'msr',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(5);
    }
  });

  it('should reject empty query', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 20', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: 'test',
      limit: 21,
    });
    expect(result.success).toBe(false);
  });

  it('should accept limit at exactly 20', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: 'test',
      limit: 20,
    });
    expect(result.success).toBe(true);
  });

  it('should reject limit below 1', () => {
    const result = brandSearchParamsSchema.safeParse({
      q: 'test',
      limit: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('productSearchParamsSchema', () => {
  it('should accept search with query', () => {
    const result = productSearchParamsSchema.safeParse({
      q: 'ultralight tent',
    });
    expect(result.success).toBe(true);
  });

  it('should accept search without query (browse mode)', () => {
    const result = productSearchParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept search with brand filter', () => {
    const result = productSearchParamsSchema.safeParse({
      q: 'tent',
      brand_id: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('should accept search with product type filter', () => {
    const result = productSearchParamsSchema.safeParse({
      q: 'tent',
      product_type_id: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('should apply default mode', () => {
    const result = productSearchParamsSchema.safeParse({
      q: 'tent',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('fuzzy');
    }
  });

  it('should apply default limit', () => {
    const result = productSearchParamsSchema.safeParse({
      q: 'tent',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(5);
    }
  });

  it('should reject invalid brand_id', () => {
    const result = productSearchParamsSchema.safeParse({
      brand_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid product_type_id', () => {
    const result = productSearchParamsSchema.safeParse({
      product_type_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 20', () => {
    const result = productSearchParamsSchema.safeParse({
      limit: 21,
    });
    expect(result.success).toBe(false);
  });
});
