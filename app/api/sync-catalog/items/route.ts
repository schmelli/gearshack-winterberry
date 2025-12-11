/**
 * POST /api/sync-catalog/items
 * Upsert item records from external GearGraph system
 * Feature: 042-catalog-sync-api (US3)
 *
 * Authentication: Requires SUPABASE_SERVICE_ROLE_KEY in Authorization header
 * Supports single item or batch of up to 1000 items
 * Handles brand_external_id lookup to set brand_id FK
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { itemSyncRequestSchema, type ItemPayload } from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { SyncResponse } from '@/types/catalog';

export async function POST(request: NextRequest) {
  try {
    // Validate authorization
    const authHeader = request.headers.get('Authorization');
    const expectedToken = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

    if (!authHeader || authHeader !== expectedToken) {
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
    const parseResult = itemSyncRequestSchema.safeParse(body);
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

    // Normalize to array of items
    const data = parseResult.data;
    const items: ItemPayload[] = 'items' in data ? data.items : [data];

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

    // Build brand external_id to id mapping for items that have brand_external_id
    const brandExternalIds = items
      .map((item) => item.brand_external_id)
      .filter((id): id is string => id !== null && id !== undefined);

    const brandIdMap = new Map<string, string>();
    const warnings: string[] = [];

    if (brandExternalIds.length > 0) {
      const uniqueBrandIds = [...new Set(brandExternalIds)];
      const { data: brands, error: brandError } = await supabase
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

    // Upsert items
    const upsertedIds: string[] = [];

    for (const item of items) {
      // Resolve brand_id from brand_external_id
      let brandId: string | null = null;
      if (item.brand_external_id) {
        brandId = brandIdMap.get(item.brand_external_id) || null;
        if (!brandId) {
          warnings.push(
            `brand_external_id '${item.brand_external_id}' not found, brand_id set to null`
          );
        }
      }

      const { data: upserted, error } = await supabase
        .from('catalog_items')
        .upsert(
          {
            external_id: item.external_id,
            name: item.name,
            brand_id: brandId,
            category: item.category ?? null,
            description: item.description ?? null,
            specs_summary: item.specs_summary ?? null,
            embedding: item.embedding ?? null,
          },
          { onConflict: 'external_id' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Item upsert error:', error);
        const response: SyncResponse = {
          success: false,
          error: 'Database error',
          details: [{ field: item.external_id, message: error.message }],
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
    console.error('Item sync error:', err);
    const response: SyncResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
