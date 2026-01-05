# Banner API Contract

**Feature**: 056-community-hub-enhancements
**Type**: Supabase CRUD

## Overview

Community banners are managed via direct Supabase queries. Admin-only operations protected by RLS policies.

## Queries

### List Active Banners (Public)

**Function**: `fetchActiveBanners`

**Input Parameters**: None (time-based filtering done server-side)

**Response**:
```typescript
interface ActiveBannersResponse {
  banners: CommunityBanner[];
}
```

**Supabase Query**:
```typescript
const { data } = await supabase
  .from('community_banners')
  .select('*')
  .eq('is_active', true)
  .lte('visibility_start', new Date().toISOString())
  .gte('visibility_end', new Date().toISOString())
  .order('display_order', { ascending: true })
  .order('created_at', { ascending: true });
```

### List All Banners (Admin)

**Function**: `fetchAllBanners`

**Input Parameters**:
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| includeExpired | boolean | No | true |

**Response**: `CommunityBanner[]`

### Create Banner (Admin)

**Function**: `createBanner`

**Input**:
```typescript
interface CreateBannerInput {
  heroImageUrl: string;
  ctaText: string;
  buttonText: string;
  targetUrl: string;
  visibilityStart: string; // ISO datetime
  visibilityEnd: string;   // ISO datetime
  displayOrder?: number;
  isActive?: boolean;
}
```

**Response**: `CommunityBanner`

**Validation**:
- `heroImageUrl`: Valid URL, must be Cloudinary domain
- `ctaText`: 5-200 characters
- `buttonText`: 2-50 characters
- `targetUrl`: Valid URL
- `visibilityEnd` > `visibilityStart`

### Update Banner (Admin)

**Function**: `updateBanner`

**Input**: `id: string, updates: Partial<CreateBannerInput>`

**Response**: `CommunityBanner`

### Delete Banner (Admin)

**Function**: `deleteBanner`

**Input**: `id: string`

**Response**: `{ success: boolean }`

## RLS Policies

```sql
-- Public read for active banners
CREATE POLICY "Active banners are viewable by authenticated users"
ON community_banners FOR SELECT
TO authenticated
USING (is_active = true AND visibility_start <= NOW() AND visibility_end >= NOW());

-- Admin full access (requires is_admin function or role)
CREATE POLICY "Admins can manage all banners"
ON community_banners FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

## Errors

| Code | Message | Cause |
|------|---------|-------|
| 23505 | Duplicate key | Duplicate banner (rare) |
| 42501 | Permission denied | Non-admin attempting write |
| 23514 | Check constraint violation | Invalid date range |
