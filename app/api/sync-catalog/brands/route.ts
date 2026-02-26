/**
 * POST /api/sync-catalog/brands
 * Upsert brand records from external GearGraph system
 * Feature: 042-catalog-sync-api (US3)
 *
 * Authentication: Requires SUPABASE_SERVICE_ROLE_KEY in Authorization header
 * Supports single brand or batch of up to 1000 brands
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { brandSyncRequestSchema, type BrandPayload } from '@/lib/validations/catalog-schema';
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
    // Validate service role key is configured
    const authServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!authServiceRoleKey || authServiceRoleKey.length < 10) {
      console.error('[sync-catalog/brands] SUPABASE_SERVICE_ROLE_KEY not configured');
      const response: SyncResponse = {
        success: false,
        error: 'Server configuration error',
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Validate authorization using timing-safe comparison
    const authHeader = request.headers.get('Authorization');
    const expectedToken = `Bearer ${authServiceRoleKey}`;

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
    const parseResult = brandSyncRequestSchema.safeParse(body);
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

    // Normalize to array of brands
    const data = parseResult.data;
    const brands: BrandPayload[] = 'brands' in data ? data.brands : [data];

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

    // Upsert brands
    const upsertedIds: string[] = [];

    for (const brand of brands) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catalog_brands not in generated types
      const { data: upserted, error } = await (supabase as any)
        .from('catalog_brands')
        .upsert(
          {
            external_id: brand.external_id,
            name: brand.name,
            logo_url: brand.logo_url ?? null,
            website_url: brand.website_url ?? null,
          },
          { onConflict: 'external_id' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Brand upsert error:', error);
        const response: SyncResponse = {
          success: false,
          error: 'Database error',
          details: [{ field: brand.external_id, message: error.message }],
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
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Brand sync error:', err);
    const response: SyncResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
