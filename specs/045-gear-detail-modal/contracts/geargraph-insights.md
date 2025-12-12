# API Contract: GearGraph Insights

**Endpoint**: `GET /api/geargraph/insights`
**Feature**: 045-gear-detail-modal
**FR Reference**: FR-015, FR-016, FR-017, FR-017a

## Purpose

Fetch intelligent insights about a gear item from the GearGraph knowledge base. Returns seasonality, compatibility, weight class, and use case information.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `productTypeId` | string | No | GearGraph product type ID |
| `categoryId` | string | No | GearGraph category ID |
| `brand` | string | No | Product brand for fuzzy matching |
| `name` | string | No | Product name for fuzzy matching |

At least one of `productTypeId`, `categoryId`, or (`brand` + `name`) must be provided.

### Example Request

```http
GET /api/geargraph/insights?productTypeId=freestanding-tent&categoryId=shelter
```

## Response

### Success (200 OK)

```typescript
interface GearInsightsResponse {
  insights: GearInsight[];
  productTypeId: string | null;
  cached: boolean;
  expiresAt: string; // ISO 8601
}

type InsightType = 'seasonality' | 'weight_class' | 'compatibility' | 'category' | 'use_case';

interface GearInsight {
  type: InsightType;
  label: string;
  confidence?: number; // 0-1
  relatedIds?: string[]; // For compatibility insights
}
```

### Example Response

```json
{
  "insights": [
    {
      "type": "seasonality",
      "label": "3-Season",
      "confidence": 0.95
    },
    {
      "type": "weight_class",
      "label": "Ultralight",
      "confidence": 0.88
    },
    {
      "type": "category",
      "label": "Backpacking",
      "confidence": 0.92
    },
    {
      "type": "compatibility",
      "label": "Works with trekking poles",
      "confidence": 0.75,
      "relatedIds": ["carbon-poles", "aluminum-poles"]
    },
    {
      "type": "use_case",
      "label": "Solo hiking",
      "confidence": 0.80
    }
  ],
  "productTypeId": "freestanding-tent",
  "cached": true,
  "expiresAt": "2025-12-18T22:30:00Z"
}
```

### No Insights Available (200 OK with empty array)

```json
{
  "insights": [],
  "productTypeId": "unknown-type",
  "cached": false,
  "expiresAt": "2025-12-18T22:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Missing parameters

```json
{
  "error": "MISSING_PARAMS",
  "message": "At least one of productTypeId, categoryId, or brand+name is required"
}
```

#### 503 Service Unavailable - GearGraph API down

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Insights temporarily unavailable"
}
```

## Implementation Notes

### Cache Key Generation

```typescript
const cacheKey = sha256(
  `${productTypeId ?? ''}|${categoryId ?? ''}|${brand ?? ''}|${name ?? ''}`
);
```

### Query Priority

1. If `productTypeId` provided, query directly by type
2. If `categoryId` provided, get insights for category
3. If `brand` + `name` provided, fuzzy match to find product type first

### Cache Duration

- TTL: 7 days (same as YouTube cache)
- GearGraph data changes infrequently, long cache is appropriate

### Graceful Degradation

- If GearGraph API unreachable: Return 200 with empty `insights` array
- UI shows "Insights not yet available" message
- Never block modal from opening

## Zod Schema

```typescript
import { z } from 'zod';

export const gearInsightsParamsSchema = z.object({
  productTypeId: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
}).refine(
  (data) => data.productTypeId || data.categoryId || (data.brand && data.name),
  { message: 'At least one identifier required' }
);

export const insightTypeSchema = z.enum([
  'seasonality',
  'weight_class',
  'compatibility',
  'category',
  'use_case',
]);

export const gearInsightSchema = z.object({
  type: insightTypeSchema,
  label: z.string().max(100),
  confidence: z.number().min(0).max(1).optional(),
  relatedIds: z.array(z.string()).optional(),
});

export const gearInsightsResponseSchema = z.object({
  insights: z.array(gearInsightSchema),
  productTypeId: z.string().nullable(),
  cached: z.boolean(),
  expiresAt: z.string().datetime(),
});
```

## GearGraph Query Examples

### Cypher (if using Memgraph/Neo4j)

```cypher
// By product type ID
MATCH (pt:ProductType {id: $productTypeId})
OPTIONAL MATCH (pt)-[:SUITABLE_FOR]->(s:Season)
OPTIONAL MATCH (pt)-[:COMPATIBLE_WITH]->(c:ProductType)
OPTIONAL MATCH (pt)-[:USED_FOR]->(u:Activity)
RETURN pt, collect(DISTINCT s) as seasons,
       collect(DISTINCT c) as compatible,
       collect(DISTINCT u) as activities
```

### REST (if GearGraph exposes REST API)

```http
GET https://geargraph.api/v1/insights?productTypeId=freestanding-tent
```
