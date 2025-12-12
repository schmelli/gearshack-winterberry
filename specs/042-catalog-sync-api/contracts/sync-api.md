# API Contract: Catalog Sync Endpoints

**Feature**: 042-catalog-sync-api
**Date**: 2025-12-10

## Authentication

All sync endpoints require the Supabase Service Role Key:

```
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
```

Requests without valid authorization receive `401 Unauthorized`.

---

## POST /api/sync-catalog/brands

Upsert brand records into `catalog_brands` table.

### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SERVICE_ROLE_KEY}
```

**Body** (single brand):
```json
{
  "external_id": "brand-123",
  "name": "Hilleberg",
  "logo_url": "https://example.com/logo.png",
  "website_url": "https://hilleberg.com"
}
```

**Body** (batch - array):
```json
{
  "brands": [
    {
      "external_id": "brand-123",
      "name": "Hilleberg",
      "logo_url": "https://example.com/logo.png",
      "website_url": "https://hilleberg.com"
    },
    {
      "external_id": "brand-456",
      "name": "MSR",
      "logo_url": null,
      "website_url": "https://msrgear.com"
    }
  ]
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "upserted": 2,
  "ids": ["uuid-1", "uuid-2"]
}
```

**Validation Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "brands[0].name", "message": "name is required" }
  ]
}
```

**Unauthorized (401)**:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Server Error (500)**:
```json
{
  "success": false,
  "error": "Internal server error"
}
```

### Zod Schema

```typescript
const brandPayloadSchema = z.object({
  external_id: z.string().min(1, "external_id is required"),
  name: z.string().min(1).max(200, "name must be 1-200 characters"),
  logo_url: z.string().url().nullable().optional(),
  website_url: z.string().url().nullable().optional(),
});

const brandSyncRequestSchema = z.union([
  brandPayloadSchema,
  z.object({ brands: z.array(brandPayloadSchema).max(1000) }),
]);
```

---

## POST /api/sync-catalog/items

Upsert product records into `catalog_items` table.

### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SERVICE_ROLE_KEY}
```

**Body** (single item):
```json
{
  "external_id": "item-789",
  "name": "NeoAir XLite NXT",
  "brand_external_id": "brand-456",
  "category": "Sleep System",
  "description": "Ultralight inflatable sleeping pad...",
  "specs_summary": "R-value 4.5, 340g, 183x64cm",
  "embedding": [0.123, -0.456, ...]
}
```

**Body** (batch - array):
```json
{
  "items": [
    {
      "external_id": "item-789",
      "name": "NeoAir XLite NXT",
      "brand_external_id": "brand-456",
      "category": "Sleep System",
      "description": "Ultralight inflatable sleeping pad...",
      "specs_summary": "R-value 4.5, 340g",
      "embedding": [0.123, -0.456, ...]
    }
  ]
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "upserted": 1,
  "ids": ["uuid-789"],
  "warnings": []
}
```

**Partial Success (200 OK with warnings)**:
```json
{
  "success": true,
  "upserted": 1,
  "ids": ["uuid-789"],
  "warnings": [
    "brand_external_id 'brand-unknown' not found, brand_id set to null"
  ]
}
```

**Validation Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "items[0].embedding", "message": "embedding must have 1536 dimensions" }
  ]
}
```

### Zod Schema

```typescript
const itemPayloadSchema = z.object({
  external_id: z.string().min(1, "external_id is required"),
  name: z.string().min(1).max(500, "name must be 1-500 characters"),
  brand_external_id: z.string().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  specs_summary: z.string().max(1000).nullable().optional(),
  embedding: z.array(z.number()).length(1536).nullable().optional(),
});

const itemSyncRequestSchema = z.union([
  itemPayloadSchema,
  z.object({ items: z.array(itemPayloadSchema).max(1000) }),
]);
```

---

## Rate Limits & Constraints

| Constraint | Value |
|------------|-------|
| Max batch size | 1000 records per request |
| Request timeout | 30 seconds |
| Embedding dimensions | Exactly 1536 if provided |
| Max payload size | 10MB |
