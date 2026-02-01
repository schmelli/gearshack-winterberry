# URL-Import Enhancement Design

**Datum:** 2026-02-01
**Status:** Draft
**Feature:** Intelligenter URL-Import mit GearGraph-Integration

## Zusammenfassung

Verbesserung des bestehenden URL-Import-Mechanismus für Gear-Items mit:
1. **Firecrawl-Integration** für zuverlässige Web-Scraping
2. **Korrektes Preis-Parsing** (DE/EN Formate)
3. **Bild-Extraktion** verbessert
4. **Intelligente Kategorie-Empfehlung**
5. **Automatische Beschreibungs-Extraktion**
6. **GearGraph-First Paradigma** mit Contribution-Pipeline
7. **Admin → Gardener Handoff** für Graph-Enrichment

## Problemstellung

Der aktuelle URL-Import hat folgende Mängel:
- **Preis falsch:** "299,95 €" wird als "USD82547" geparst
- **Kein Bild:** OG-Image wird nicht zuverlässig extrahiert
- **Keine Kategorie:** Ohne Katalog-Match keine Empfehlung
- **Keine Beschreibung:** Nur meta-description (oft generisch)
- **Keine Contribution-Pipeline:** User-Daten werden nicht für Graph-Verbesserung genutzt

## Architektur

### Datenfluss

```
User URL → Firecrawl Scrape → Specs Extraction → GearGraph Lookup
    → Kategorie-Empfehlung → Preview Dialog → Form Prefill
    → Contribution Pipeline (async) → Admin Dashboard → Gardener
```

### Komponenten

```
┌─────────────────────────────────────────────────────────────────┐
│                        URL-Import Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ FirecrawlClient │───▶│ extractGearSpecs│                    │
│  │   (scrape)      │    │   (patterns)    │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │fuzzyProductSearch│◀──│ GearGraph Lookup│                    │
│  │   (catalog.ts)  │    │   (Score-Based) │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Kategorie-      │───▶│ UrlImportDialog │                    │
│  │ Empfehlung      │    │   (Preview)     │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│         ┌────────────────────────┼────────────────────────┐    │
│         │                        │                        │    │
│         ▼                        ▼                        │    │
│  ┌─────────────────┐    ┌─────────────────┐              │    │
│  │ GearEditorForm  │    │processGearContri│              │    │
│  │   (Prefill)     │    │   bution()      │              │    │
│  └─────────────────┘    └────────┬────────┘              │    │
│                                  │                        │    │
│                                  ▼                        │    │
│                         ┌─────────────────┐              │    │
│                         │user_contributions│              │    │
│                         │   (Supabase)    │              │    │
│                         └────────┬────────┘              │    │
│                                  │                        │    │
│                                  ▼                        │    │
│                         ┌─────────────────┐              │    │
│                         │ Admin Dashboard │              │    │
│                         │ → Gardener      │              │    │
│                         └─────────────────┘              │    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detaillierte Spezifikation

### 1. Firecrawl-Integration

**Quelle:** Adaptiert von `gearcrew-mastra/src/mastra/tools/firecrawl/`

**Neue Dateien:**
- `/lib/firecrawl/client.ts` - FirecrawlClient Klasse
- `/lib/firecrawl/cache.ts` - Supabase-basierter Cache
- `/lib/firecrawl/gear-specs.ts` - GearSpecsSchema + extractGearSpecs()

**FirecrawlClient:**
```typescript
export class FirecrawlClient {
  private config: FirecrawlConfig;

  constructor(config?: Partial<FirecrawlConfig>);

  // Scrape einzelne URL
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;

  // Suche nach Gear-Specs (mit Cache)
  async searchGearSpecs(gearName: string, brand?: string): Promise<GearSearchResult>;

  // Extrahiere strukturierte Daten aus Markdown
  extractGearSpecs(content: string, sourceUrl?: string): GearSpecs | null;

  // Merge Specs aus mehreren Quellen
  mergeGearSpecs(specsList: GearSpecs[]): GearSpecs;
}
```

**GearSpecsSchema (Zod):**
```typescript
export const GearSpecsSchema = z.object({
  name: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  weight: z.object({
    value: z.number(),
    unit: z.enum(['g', 'kg', 'oz', 'lb']),
  }).optional(),
  price: z.object({
    value: z.number(),
    currency: z.string(),
  }).optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    unit: z.enum(['cm', 'in', 'mm']),
  }).optional(),
  capacity: z.object({
    value: z.number(),
    unit: z.enum(['L', 'ml', 'cu in']),
  }).optional(),
  temperatureRating: z.object({
    value: z.number(),
    unit: z.enum(['C', 'F']),
  }).optional(),
  materials: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  scrapedAt: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),

  // Kategorie-spezifisch
  capacityPersons: z.number().optional(),
  seasonRating: z.enum(['3-season', '3.5-season', '4-season', 'summer', 'winter']).optional(),
  frameType: z.enum(['internal', 'external', 'frameless', 'removable']).optional(),
  fuelType: z.enum(['canister', 'alcohol', 'wood', 'solid', 'multi-fuel', 'white-gas', 'propane']).optional(),
  connectorType: z.enum(['usb-c', 'usb-a', 'micro-usb', 'usb-mini', 'lightning', 'proprietary']).optional(),
  constructionType: z.enum(['freestanding', 'semi-freestanding', 'non-freestanding', 'trekking-pole', 'a-frame', 'tunnel', 'dome', 'pyramid']).optional(),
  size: z.string().optional(),
});
```

**Cache (Supabase):**
```sql
CREATE TABLE firecrawl_cache (
  id TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_json JSONB,
  source_urls JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(query_hash)
);

CREATE INDEX idx_firecrawl_cache_hash ON firecrawl_cache(query_hash);
CREATE INDEX idx_firecrawl_cache_expires ON firecrawl_cache(expires_at);
```

### 2. Preis-Parsing (DE/EN Formate)

**Unterstützte Formate:**
```typescript
// Deutsche Formate
"299,95 €"      → { value: 299.95, currency: "EUR" }
"1.299,00 €"    → { value: 1299.00, currency: "EUR" }
"€ 299,95"      → { value: 299.95, currency: "EUR" }

// Englische Formate
"$299.95"       → { value: 299.95, currency: "USD" }
"£149.00"       → { value: 149.00, currency: "GBP" }
"299.95 USD"    → { value: 299.95, currency: "USD" }

// Schema.org (immer präferiert)
offers.price: 299.95, priceCurrency: "EUR"
```

**Implementierung:**
```typescript
function parsePrice(text: string): { value: number; currency: string } | null {
  // 1. Versuche Schema.org Extraktion (höchste Priorität)
  // 2. Erkenne Währungssymbol und Position
  // 3. Erkenne Dezimaltrennzeichen anhand Position (letzte 2-3 Stellen)
  // 4. Normalisiere zu { value: number, currency: string }
}
```

### 3. Bild-Extraktion (Priorisiert)

**Reihenfolge:**
1. Schema.org `image` Property (höchste Priorität)
2. `og:image` Meta-Tag
3. `twitter:image` Meta-Tag
4. Erstes großes Produktbild (`<img>` mit "product" im src/alt/class, min 300px)

**Implementierung:**
```typescript
function extractProductImage(html: string, markdown: string): string | null {
  // Schema.org
  const schemaImage = extractSchemaImage(html);
  if (schemaImage) return schemaImage;

  // OG Image
  const ogImage = extractOgImage(html);
  if (ogImage) return ogImage;

  // Twitter Image
  const twitterImage = extractTwitterImage(html);
  if (twitterImage) return twitterImage;

  // Produktbild heuristisch
  return extractProductImageHeuristic(html);
}
```

### 4. Kategorie-Empfehlung

**Mit Katalog-Match:**
- Verwende `catalogMatch.productTypeId` direkt

**Ohne Katalog-Match (Keyword-Mapping):**
```typescript
const CATEGORY_KEYWORDS: Record<string, { categoryId: string; keywords: string[] }> = {
  'jackets': {
    categoryId: 'uuid-clothing-outerwear-jackets',
    keywords: ['jacket', 'jacke', 'coat', 'mantel', 'parka', 'anorak']
  },
  'tents': {
    categoryId: 'uuid-shelter-tents',
    keywords: ['tent', 'zelt', 'shelter', 'tarp']
  },
  'backpacks': {
    categoryId: 'uuid-packs-backpacks',
    keywords: ['backpack', 'rucksack', 'pack', 'daypack']
  },
  // ... weitere Kategorien
};

function suggestCategory(name: string, description: string): CategorySuggestion | null {
  const text = `${name} ${description}`.toLowerCase();

  for (const [category, config] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchCount = config.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0) {
      return {
        categoryId: config.categoryId,
        confidence: Math.min(matchCount / config.keywords.length, 1),
        matchedKeywords: config.keywords.filter(kw => text.includes(kw))
      };
    }
  }

  return null;
}
```

### 5. Contribution-Pipeline

**Erweiterte `user_contributions` Tabelle:**
```sql
ALTER TABLE user_contributions ADD COLUMN IF NOT EXISTS
  contribution_type TEXT CHECK (contribution_type IN ('new_product', 'incomplete_match', 'data_update')),
  catalog_match_score NUMERIC(3,2),
  catalog_match_id UUID,
  enrichment_data JSONB DEFAULT '{}',
  suggestion_status TEXT DEFAULT 'pending'
    CHECK (suggestion_status IN ('pending', 'queued_for_review', 'in_gardener_queue', 'processed', 'rejected')),
  gardener_task_id UUID,
  queued_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ;

CREATE INDEX idx_contributions_status ON user_contributions(suggestion_status);
CREATE INDEX idx_contributions_type ON user_contributions(contribution_type);
```

**Contribution-Typen:**
| Typ | Score | Beschreibung | Gardener-Aktion |
|-----|-------|--------------|-----------------|
| `new_product` | < 0.3 | Produkt nicht im Graph | Neuen Node erstellen |
| `incomplete_match` | 0.3 - 0.7 | Evtl. vorhanden, lückenhaft | Verifizieren + Ergänzen |
| `data_update` | > 0.7 | Match, aber User hat andere Daten | Daten aktualisieren |

**Externalisierte Methode:**
```typescript
// /app/actions/gear-contributions.ts

export async function processGearContribution(input: {
  userData: {
    name: string;
    brand: string;
    weightGrams?: number;
    priceValue?: number;
    currency?: string;
    imageUrl?: string;
    description?: string;
    categoryId?: string;
  };
  sourceUrl?: string;
  operationType: 'create' | 'update' | 'url_import';
  existingItemId?: string;
}): Promise<ContributionResult> {
  // 1. GearGraph Lookup
  const catalogMatch = await fuzzyProductSearch(supabase, `${input.userData.brand} ${input.userData.name}`);
  const topScore = catalogMatch[0]?.score ?? 0;

  // 2. Contribution-Typ bestimmen
  const contributionType =
    topScore < 0.3 ? 'new_product' :
    topScore < 0.7 ? 'incomplete_match' : 'data_update';

  // 3. Delta berechnen (bei Match)
  const delta = topScore >= 0.3 ? computeDelta(input.userData, catalogMatch[0]) : null;

  // 4. Contribution speichern
  await supabase.from('user_contributions').insert({
    contribution_type: contributionType,
    catalog_match_score: topScore,
    catalog_match_id: catalogMatch[0]?.id ?? null,
    enrichment_data: {
      ...input.userData,
      delta,
      sourceUrl: input.sourceUrl,
      operationType: input.operationType
    },
    suggestion_status: 'pending'
  });

  // 5. Kategorie-Empfehlung zurückgeben
  return {
    catalogMatch: catalogMatch[0] ?? null,
    contributionType,
    categorySuggestion: catalogMatch[0]?.productTypeId ?? suggestCategory(input.userData.name, input.userData.description ?? '')
  };
}
```

### 6. Admin Dashboard Erweiterung

**Neuer Tab: "Product Suggestions"**

**Datei:** `/app/[locale]/admin/contributions/ProductSuggestionsTab.tsx`

**Features:**
- Liste aller pending Contributions
- Filter nach contribution_type (new_product, incomplete_match, data_update)
- Filter nach suggestion_status
- Sortierung nach Datum, Score
- Aktionen: Details anzeigen, An Gardener übergeben, Ablehnen

**One-Click Gardener-Handoff:**
```typescript
async function sendToGardener(contributionId: string) {
  // 1. Status aktualisieren
  await supabase.from('user_contributions')
    .update({
      suggestion_status: 'in_gardener_queue',
      queued_at: new Date().toISOString()
    })
    .eq('id', contributionId);

  // 2. GardenerApproval erstellen
  const { data } = await supabase.from('gardener_approvals').insert({
    type: 'product_enrichment',
    contribution_id: contributionId,
    status: 'pending',
    // ... weitere Felder
  }).select().single();

  // 3. Contribution mit Task verknüpfen
  await supabase.from('user_contributions')
    .update({ gardener_task_id: data.id })
    .eq('id', contributionId);
}
```

### 7. Aktualisierter URL-Import Flow

**Änderungen in `/app/api/gear/import-url/route.ts`:**

```typescript
export async function POST(request: Request) {
  const { url } = await request.json();

  // 1. Firecrawl Scraping (NEU)
  const firecrawl = new FirecrawlClient();
  const scrapeResult = await firecrawl.scrape(url, {
    formats: ['markdown'],
    onlyMainContent: true
  });

  // 2. Specs Extraction (NEU - verbessert)
  const specs = firecrawl.extractGearSpecs(scrapeResult.markdown, url);

  // 3. GearGraph Lookup (bestehend)
  const catalogMatch = await fuzzyProductSearch(supabase, `${specs?.brand} ${specs?.name}`);

  // 4. Kategorie-Empfehlung (NEU)
  const categorySuggestion = catalogMatch[0]?.productTypeId
    ?? suggestCategory(specs?.name ?? '', specs?.description ?? '');

  // 5. Response mit allen Daten
  return Response.json({
    success: true,
    data: {
      // Extrahierte Daten
      name: specs?.name,
      brand: specs?.brand,
      description: specs?.description,
      imageUrl: specs?.imageUrl ?? scrapeResult.metadata?.ogImage,
      weightGrams: specs?.weight?.value,
      weightUnit: specs?.weight?.unit,
      priceValue: specs?.price?.value,
      currency: specs?.price?.currency,
      productUrl: url,
      extractionConfidence: specs?.confidence > 0.5 ? 'high' : specs?.confidence > 0.2 ? 'medium' : 'low',

      // Katalog-Match
      catalogMatch: catalogMatch[0] ?? null,

      // Kategorie-Empfehlung (NEU)
      categorySuggestion,

      // Zusätzliche Specs (NEU)
      additionalSpecs: {
        materials: specs?.materials,
        seasonRating: specs?.seasonRating,
        dimensions: specs?.dimensions,
        capacity: specs?.capacity
      }
    }
  });
}
```

## Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `/lib/firecrawl/client.ts` | FirecrawlClient Klasse |
| `/lib/firecrawl/cache.ts` | Supabase-basierter Cache |
| `/lib/firecrawl/gear-specs.ts` | GearSpecsSchema + extractGearSpecs() |
| `/lib/firecrawl/index.ts` | Re-exports |
| `/app/actions/gear-contributions.ts` | processGearContribution() |
| `/lib/category-suggestion.ts` | Keyword-basiertes Kategorie-Mapping |
| `/app/[locale]/admin/contributions/ProductSuggestionsTab.tsx` | Admin UI |
| `/hooks/admin/useProductSuggestions.ts` | Admin Hook |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `/app/api/gear/import-url/route.ts` | Firecrawl + neue Extraction |
| `/app/actions/smart-product-search.ts` | Verbesserte parsePrice() |
| `/components/gear-editor/UrlImportDialog.tsx` | Bild + Kategorie anzeigen |
| `/hooks/useUrlImport.ts` | categorySuggestion + additionalSpecs |
| `/hooks/useGearEditor.ts` | processGearContribution() aufrufen |
| `/types/contributions.ts` | Neue Felder |

## Datenbank-Migrationen

```sql
-- Migration: 2026-02-01_url_import_enhancement

-- 1. Firecrawl Cache Tabelle
CREATE TABLE IF NOT EXISTS firecrawl_cache (
  id TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_json JSONB,
  source_urls JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_firecrawl_cache_hash ON firecrawl_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_firecrawl_cache_expires ON firecrawl_cache(expires_at);

-- 2. User Contributions Erweiterung
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS contribution_type TEXT
    CHECK (contribution_type IN ('new_product', 'incomplete_match', 'data_update')),
  ADD COLUMN IF NOT EXISTS catalog_match_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS catalog_match_id UUID,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS suggestion_status TEXT DEFAULT 'pending'
    CHECK (suggestion_status IN ('pending', 'queued_for_review', 'in_gardener_queue', 'processed', 'rejected')),
  ADD COLUMN IF NOT EXISTS gardener_task_id UUID,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contributions_status ON user_contributions(suggestion_status);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON user_contributions(contribution_type);

-- 3. Gardener Approvals Erweiterung (falls nötig)
ALTER TABLE gardener_approvals
  ADD COLUMN IF NOT EXISTS contribution_id UUID REFERENCES user_contributions(id);
```

## Environment Variables

```bash
# Firecrawl API (required)
FIRECRAWL_API_KEY=fc-xxxxx

# Optional: Self-hosted Firecrawl
FIRECRAWL_SELF_HOSTED_URL=http://localhost:3002

# Cache Settings
FIRECRAWL_CACHE_TTL_DAYS=7
FIRECRAWL_CACHE_ENABLED=true
```

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Firecrawl API-Kosten | Cache mit 7-Tage TTL, ~$0.001/Seite |
| Scraping fehlgeschlagen | Fallback auf bestehendes Pattern-Matching |
| Falsche Kategorie-Empfehlung | Confidence-Score anzeigen, User kann ändern |
| Gardener-Überlastung | Rate-Limiting, Priorisierung nach Contribution-Typ |

## Testplan

1. **Unit Tests:**
   - parsePrice() mit DE/EN Formaten
   - extractGearSpecs() mit verschiedenen Markdown-Inputs
   - suggestCategory() mit verschiedenen Produktnamen

2. **Integration Tests:**
   - URL-Import E2E mit echten Shop-URLs (camp4.de, bergfreunde.de, rei.com)
   - Contribution-Pipeline von Import bis Gardener-Queue

3. **Manual Testing:**
   - 10 verschiedene Produkt-URLs testen
   - Admin Dashboard → Gardener Handoff

## Implementierungsreihenfolge

1. **Phase 1: Firecrawl-Integration**
   - FirecrawlClient adaptieren
   - Cache-Tabelle + Funktionen
   - extractGearSpecs() implementieren

2. **Phase 2: Bug-Fixes**
   - parsePrice() verbessern
   - Bild-Extraktion verbessern
   - Integration in API-Route

3. **Phase 3: Kategorie-Empfehlung**
   - Keyword-Mapping implementieren
   - UI-Anzeige im Dialog

4. **Phase 4: Contribution-Pipeline**
   - DB-Migration
   - processGearContribution() implementieren
   - In useGearEditor integrieren

5. **Phase 5: Admin UI**
   - ProductSuggestionsTab
   - Gardener-Handoff

6. **Phase 6: Testing & Polish**
   - E2E Tests
   - Performance-Optimierung
