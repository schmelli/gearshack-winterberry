# Marketplace API Contract

**Feature**: 056-community-hub-enhancements
**Type**: Supabase RPC / View Queries

## Overview

The Marketplace uses a database view (`v_marketplace_listings`) queried directly via Supabase client. No REST API endpoints needed - all operations are client-side Supabase queries.

## Queries

### List Marketplace Listings

**Function**: `fetchMarketplaceListings`

**Input Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | 'all' \| 'for_sale' \| 'for_trade' \| 'for_borrow' | No | 'all' | Filter by listing type |
| sortBy | 'date' \| 'price' \| 'name' | No | 'date' | Sort field |
| sortOrder | 'asc' \| 'desc' | No | 'desc' | Sort direction |
| search | string | No | - | Search in name/brand |
| cursor | string | No | - | Pagination cursor (ISO timestamp) |
| limit | number | No | 12 | Items per page |
| excludeUserId | string | No | - | Exclude current user's items |

**Response**:
```typescript
interface MarketplaceResponse {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
}
```

**Supabase Query Pattern**:
```typescript
const query = supabase
  .from('v_marketplace_listings')
  .select('*')
  .neq('seller_id', currentUserId)
  .order(sortBy === 'date' ? 'listed_at' : sortBy, { ascending: sortOrder === 'asc' })
  .limit(limit + 1); // +1 to check hasMore

if (type !== 'all') {
  query.eq(typeToColumn[type], true);
}

if (search) {
  query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
}

if (cursor) {
  query.lt('listed_at', cursor);
}
```

### Get Single Listing

**Function**: `getMarketplaceListing`

**Input**: `id: string` (gear item UUID)

**Response**: `MarketplaceListing | null`

## Errors

| Code | Message | Cause |
|------|---------|-------|
| PGRST116 | No rows returned | Listing not found or filtered out |
| 42501 | Permission denied | RLS policy violation |

## Rate Limits

No specific rate limits - uses standard Supabase query limits.
