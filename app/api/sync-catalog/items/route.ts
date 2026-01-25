/**
 * POST /api/sync-catalog/items
 * Upsert product records from external GearGraph system
 * Feature: 042-catalog-sync-api (US3)
 *
 * Authentication: Requires SUPABASE_SERVICE_ROLE_KEY in Authorization header
 * Supports single product or batch of up to 1000 products
 * Handles brand_external_id lookup to set brand_id FK
 *
 * Note: Uses catalog_products table (not catalog_items) per actual database schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import {
  productSyncRequestSchema,
  type ProductPayload,
} from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { SyncResponse } from '@/types/catalog';

/**
 * Timing-safe comparison of authorization headers to prevent timing attacks.
 */
function verifyAuthHeader(authHeader: string | null, expectedToken: string): boolean {
  if (!authHeader) return false;
  // Ensure both strings have the same length for timing-safe comparison
  if (authHeader.length !== expectedToken.length) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate authorization using timing-safe comparison
    const authHeader = request.headers.get('Authorization');
    const expectedToken = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

    if (!verifyAuthHeader(authHeader, expectedToken)) {
      const response: SyncResponse = {
        success: false,
        error: 'Unauthorized',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response: SyncResponse = {
        success: false,
        error: 'Invalid JSON',
        details: [{ field: 'body', message: 'Request body must be valid JSON' }],
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate payload
    const parseResult = productSyncRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const response: SyncResponse = {
        success: false,
        error: 'Validation failed',
        details: parseResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Normalize to array of products
    const data = parseResult.data;
    const products: ProductPayload[] = 'items' in data ? data.items : [data];

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      const response: SyncResponse = {
        success: false,
        error: 'Internal server error',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Build brand external_id to id mapping for products that have brand_external_id
    const brandExternalIds = products
      .map((product) => product.brand_external_id)
      .filter((id): id is string => id !== null && id !== undefined);

    const brandIdMap = new Map<string, string>();
    const warnings: string[] = [];

    if (brandExternalIds.length > 0) {
      const uniqueBrandIds = [...new Set(brandExternalIds)];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catalog_brands not in generated types
      const { data: brands, error: brandError } = await (supabase as any)
        .from('catalog_brands')
        .select('id, external_id')
        .in('external_id', uniqueBrandIds);

      if (brandError) {
        console.error('Brand lookup error:', brandError);
      } else if (brands) {
        for (const brand of brands) {
          brandIdMap.set(brand.external_id, brand.id);
        }
      }
    }

    // Upsert products
    const upsertedIds: string[] = [];

    for (const product of products) {
      // Resolve brand_id from brand_external_id
      let brandId: string | null = null;
      if (product.brand_external_id) {
        brandId = brandIdMap.get(product.brand_external_id) || null;
        if (!brandId) {
          warnings.push(
            `brand_external_id '${product.brand_external_id}' not found, brand_id set to null`
          );
        }
      }

      // Note: category_main and subcategory are no longer stored - use product_type_id FK instead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catalog_products not in generated types
      const { data: upserted, error } = await (supabase as any)
        .from('catalog_products')
        .upsert(
          {
            external_id: product.external_id,
            name: product.name,
            brand_id: brandId,
            brand_external_id: product.brand_external_id ?? null,
            product_type: product.product_type ?? null,
            product_type_id: product.product_type_id ?? null,
            description: product.description ?? null,
            price_usd: product.price_usd ?? null,
            weight_grams: product.weight_grams ?? null,
          },
          { onConflict: 'external_id' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Product upsert error:', error);
        const response: SyncResponse = {
          success: false,
          error: 'Database error',
          details: [{ field: product.external_id, message: error.message }],
        };
        return NextResponse.json(response, { status: 500 });
      }

      if (upserted) {
        upsertedIds.push(upserted.id);
      }
    }

    const response: SyncResponse = {
      success: true,
      upserted: upsertedIds.length,
      ids: upsertedIds,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Product sync error:', err);
    const response: SyncResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
