# 060 - AI Gear Agent Evolution: Analyse & Drei Verbesserungsvorschläge

## Status: PROPOSAL DRAFT
## Datum: 2026-02-15

---

## 1. Ist-Analyse: Warum der AI Gear Agent aktuell schwächelt

### 1.1 Architektur-Überblick (Ist-Zustand)

```
User-Frage
    │
    ▼
┌──────────────────────────────────┐
│  Chat API Route (route.ts)       │
│  ┌────────────────────────────┐  │
│  │ 1. Auth + Rate Limiting    │  │  ~50-100ms
│  │ 2. 4-Tier Memory Fetch     │  │  ~200-500ms (4x parallel DB)
│  │    - Conversation History  │  │
│  │    - User Context Cache    │  │
│  │    - Working Memory        │  │
│  │    - Semantic Recall       │  │
│  │ 3. Query Parser (Regex)    │  │  ~5ms
│  │ 4. Prompt Builder          │  │  ~10ms (aber ~8.000 Token Output!)
│  │ 5. Loadout Pre-loader      │  │  ~100-300ms (wenn Loadout-Seite)
│  └────────────────────────────┘  │
│              │                   │
│              ▼                   │
│  ┌────────────────────────────┐  │
│  │ Mastra Agent (Claude       │  │
│  │ Sonnet 4.5 via AI Gateway) │  │
│  │                            │  │
│  │ System Prompt: ~8.000 Tok  │  │  ← PROBLEM 1: Riesiger Prompt
│  │ + History: ~2.000 Tok      │  │
│  │ + User Message             │  │
│  │                            │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ Tool Call 1           │   │  │  ~3-8s (LLM entscheidet + DB)
│  │ │ queryUserData(...)    │   │  │
│  │ └──────────────────────┘   │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ Tool Call 2           │   │  │  ~3-8s (LLM entscheidet + DB)
│  │ │ queryUserData(...)    │   │  │
│  │ └──────────────────────┘   │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ Tool Call 3           │   │  │  ~5-15s (LLM + MCP → GearGraph)
│  │ │ queryGearGraph(...)   │   │  │
│  │ └──────────────────────┘   │  │
│  │                            │  │
│  │ Finale Antwort generieren  │  │  ~3-8s
│  └────────────────────────────┘  │
│              │                   │
│              ▼                   │
│  Memory Save + Embeddings       │  ~200-500ms (async)
└──────────────────────────────────┘
    │
    ▼
Gesamtzeit: 15-50 Sekunden für eine "einfache" Frage
```

### 1.2 Identifizierte Kernprobleme

#### Problem 1: Massiver System-Prompt ("Lost in the Middle")

Der System-Prompt in `prompt-builder.ts` enthält **12 Sektionen** und erreicht ~8.000 Tokens:

| Sektion | ~Tokens | Zweck |
|---------|---------|-------|
| Identity | 200 | Rolle & Sprache |
| Working Memory | 300-800 | Nutzerprofil aus Zod-Schema |
| Semantic Recall | 200-500 | Vektorsuch-Ergebnisse |
| Context (Screen) | 100-500 | Inventar/Loadout-Ansicht |
| Gear List | 500-2000 | Komplettes Inventar-Summary |
| Catalog Results | 200-500 | GearGraph-Daten |
| Tool Descriptions | 1500 | 4 Tools mit SQL/Cypher-Beispielen |
| Capabilities | 1500 | Gesprächsstil, Richtlinien |
| Limitations | 100 | Was der Agent nicht kann |
| Tool Best Practices | 800 | Wann welches Tool |
| Tool Selection Rules | 500 | Tabellarische Regeln |
| Data Validation | 400 | Qualitätsprüfungen |
| Category Reference | 800 | Kategorie-Hierarchie |
| Loadout Analysis | 1500 | Nur bei Loadout-Ansicht |
| Safety Guidance | 800 | Nur bei Loadout-Ansicht |

**Auswirkung**: LLMs haben nachweislich Schwierigkeiten, Instruktionen in der Mitte langer Prompts zu befolgen ("Lost in the Middle"-Phänomen). Der Agent "vergisst" wichtige Regeln, weil sie zwischen Bergen von Tool-Dokumentation und Beispielen begraben sind.

#### Problem 2: Sequentielle Tool-Calls (Hauptursache für Langsamkeit)

Für "Was kann ich an dieser Packliste verbessern?" muss der Agent:

1. **LLM Round-Trip 1** (~3-5s): Entscheidet sich für `queryUserData` um Loadout-Items zu holen
2. **DB-Query 1** (~100ms): Loadout-Items laden
3. **LLM Round-Trip 2** (~3-5s): Sieht die Items, entscheidet für `queryUserData` um Gear-Details zu holen
4. **DB-Query 2** (~100ms): Gear-Details laden
5. **LLM Round-Trip 3** (~5-10s): Will GearGraph für Alternativen abfragen
6. **MCP-Call** (~2-5s): GearGraph-Abfrage (extern, langsam)
7. **LLM Round-Trip 4** (~3-8s): Finale Antwort generieren

**Gesamtzeit: ~20-40 Sekunden** - und das für eine grundlegende Loadout-Analyse!

Jeder LLM Round-Trip kostet 3-10 Sekunden weil:
- Der riesige System-Prompt jedes Mal mit verarbeitet wird
- Der wachsende Kontext (vorherige Tool-Ergebnisse) die Latenz erhöht
- Jede Entscheidung, welche Query zu konstruieren ist, eine volle LLM-Inferenz braucht

#### Problem 3: Zu niedrig-granulare Tools

Die 4 aktuellen Tools sind generische SQL/Cypher-Schnittstellen:

| Tool | Abstraktion | Problem |
|------|------------|---------|
| `queryUserData` | Generisches SELECT auf 4 Tabellen | LLM muss SQL-WHERE konstruieren |
| `queryCatalog` | Generisches SELECT auf 3 Tabellen | LLM muss Tabelle + Filter wählen |
| `queryGearGraph` | Rohes Cypher | LLM muss Graph-Queries schreiben |
| `searchWeb` | Web-Suche | OK, aber selten nötig |

**Auswirkung**: Der LLM muss sich bei JEDER Frage von Grund auf überlegen:
- Welche Tabelle abfragen?
- Welche Spalten selektieren?
- Welchen WHERE-Filter konstruieren?
- In welcher Reihenfolge mehrere Queries machen?

Das ist wie wenn man einem Kellner sagt "Bring mir Essen" und er muss jedes Mal von vorne überlegen: "Ok, zuerst in die Küche gehen, dann den Teller aus dem Schrank holen, dann..."

#### Problem 4: Kein Fast-Path für einfache Fragen

"Wie viele Zelte besitze ich?" durchläuft denselben schweren Pipeline-Durchlauf wie eine komplexe Trip-Analyse:

1. Auth + Rate Limiting
2. 4-Tier Memory Fetch (4 parallele DB-Queries!)
3. Query Parsing
4. ~8.000 Token System-Prompt bauen
5. LLM starten
6. Tool-Call entscheiden
7. DB-Query
8. LLM-Antwort generieren
9. Memory speichern + Embeddings

Es gibt bereits einen `query-parser.ts` der Intent erkennt, aber er wird **nur benutzt um den System-Prompt zu erweitern** - nicht um den Pipeline-Durchlauf zu verkürzen.

#### Problem 5: Kontext-Verlust bei Loadout-Analysen

Obwohl es einen `context-preloader.ts` gibt, der Loadout-Daten vorladen kann, hat das System ein fundamentales Problem: Die vorgeladenen Daten sind **oberflächlich**. Sie enthalten:
- Item-Namen und Gewichte ✓
- Kategorie-Zuordnungen ✓
- Gewichts-Breakdown ✓

Aber es fehlt:
- Temperatur-Ratings der Ausrüstung ✗
- Saison-Eignung pro Item ✗
- Abhängigkeiten/Zubehör (dependency_ids) ✗
- GearGraph-Insights (Alternativen, Kompatibilität) ✗
- Essentielle Kategorie-Checkliste pro Aktivitätstyp ✗

Der Agent muss diese Informationen **zur Laufzeit nachfragen** - was zu den sequentiellen Tool-Calls führt.

---

## 2. Drei komplementäre Verbesserungsvorschläge

Die drei Vorschläge sind als **ineinandergreifende Bausteine** konzipiert:

```
┌─────────────────────────────────────────────────────────┐
│                    NEUES SYSTEM                         │
│                                                         │
│  Vorschlag 1: SPEED LAYER                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Intent Router (Gemini Flash)                      │  │
│  │ → Klassifiziert in <500ms                         │  │
│  │ → Steuert parallelen Pre-Fetch                    │  │
│  │ → Fast-Path für einfache Fragen (kein Sonnet!)    │  │
│  └───────────────────────────────────────────────────┘  │
│              │                                          │
│              ▼                                          │
│  Vorschlag 2: INTELLIGENCE LAYER                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 8 Composite Domain Tools                          │  │
│  │ → Kapseln Multi-Step-Logik                        │  │
│  │ → Enthalten Domain-Wissen                         │  │
│  │ → 1 Tool-Call statt 3-5                           │  │
│  └───────────────────────────────────────────────────┘  │
│              │                                          │
│              ▼                                          │
│  Vorschlag 3: CONTEXT LAYER                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Active Gear Knowledge Base                        │  │
│  │ → Pre-computed Inventory Intelligence             │  │
│  │ → Enriched Loadout Snapshots                      │  │
│  │ → 60% schlankerer System-Prompt                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Vorschlag 1: "Intent Router + Parallel Pre-Fetch Pipeline" (SPEED LAYER)

#### Kernidee

Ein leichtgewichtiger Vorverarbeitungsschritt, der **vor** dem schweren Mastra-Agent läuft:

1. Ein schnelles Modell (Gemini 2.5 Flash via AI Gateway, <500ms) klassifiziert den Intent
2. Basierend auf dem Intent werden **alle benötigten Daten parallel** vorgeladen
3. Für einfache faktische Fragen wird die Antwort **direkt** generiert - ohne Claude Sonnet
4. Für komplexe Fragen bekommt Claude alle Daten vorab injiziert und antwortet in **einem Pass** ohne Tool-Calls

#### Architektur

```
User-Frage
    │
    ▼
┌─────────────────────────────────────────┐
│ PHASE 1: Intent Classification (<500ms) │
│                                         │
│ Gemini 2.5 Flash klassifiziert in:      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ SIMPLE_FACT                         │ │
│ │ "Wie viele Zelte habe ich?"         │ │
│ │ "Was wiegt mein Packraft?"          │ │
│ │ → Pre-Fetch: 1 gezielte DB-Query   │ │
│ │ → Antwort: Gemini Flash direkt     │ │
│ │ → Keine Tool-Calls, kein Sonnet    │ │
│ │ → Zeit: ~1-2 Sekunden total        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ INVENTORY_QUERY                     │ │
│ │ "Welche Regenjacken besitze ich?"   │ │
│ │ "Habe ich ein Kochsystem für -20°?" │ │
│ │ → Pre-Fetch: Inventar + Kategorien  │ │
│ │ → Sonnet mit injiziertem Kontext   │ │
│ │ → 0-1 Tool-Calls                    │ │
│ │ → Zeit: ~3-5 Sekunden              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ LOADOUT_ANALYSIS                    │ │
│ │ "Was fehlt in meiner Packliste?"    │ │
│ │ "Wie optimiere ich das Gewicht?"    │ │
│ │ → Pre-Fetch: Loadout + Items +     │ │
│ │   Kategorien + GearGraph parallel   │ │
│ │ → Sonnet mit komplettem Kontext    │ │
│ │ → 0 Tool-Calls (alles vorgeladen) │ │
│ │ → Zeit: ~5-8 Sekunden              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ GEAR_COMPARISON                     │ │
│ │ "Vergleiche Nallo 2 vs X-Mid 2"    │ │
│ │ → Pre-Fetch: Beide Produkte aus    │ │
│ │   Katalog + GearGraph parallel     │ │
│ │ → Sonnet mit injiziertem Kontext   │ │
│ │ → 0 Tool-Calls                      │ │
│ │ → Zeit: ~4-7 Sekunden              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ SUITABILITY_CHECK                   │ │
│ │ "Ist mein Schlafsack warm genug     │ │
│ │  für Nordschweden im September?"     │ │
│ │ → Pre-Fetch: Item-Details +         │ │
│ │   GearGraph-Specs + Web-Suche       │ │
│ │   für Wetterbedingungen parallel    │ │
│ │ → Sonnet mit komplettem Kontext    │ │
│ │ → 0 Tool-Calls                      │ │
│ │ → Zeit: ~5-10 Sekunden             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ WEIGHT_OPTIMIZATION                 │ │
│ │ "Welche Kombi ist die leichteste    │ │
│ │  Regenbekleidung aus meinem Inv.?"  │ │
│ │ → Pre-Fetch: Alle Items der        │ │
│ │   Kategorie + Gewichte + Combos    │ │
│ │ → Sonnet mit injiziertem Kontext   │ │
│ │ → 0 Tool-Calls                      │ │
│ │ → Zeit: ~4-7 Sekunden              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ GENERAL / COMPLEX                   │ │
│ │ Alles andere                        │ │
│ │ → Voller Mastra-Agent mit Tools    │ │
│ │ → Aber mit schlankerer Pipeline    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Technische Umsetzung

**Neues Modul: `lib/mastra/intent-router.ts`**

```typescript
// Intent-Klassifikation via Gemini Flash (schnell + billig)
interface IntentClassification {
  intent: IntentType;
  confidence: number;
  dataRequirements: DataRequirement[];
  canAnswerDirectly: boolean;  // true = kein Sonnet nötig
  extractedEntities: {
    categories?: string[];     // z.B. ["Zelte", "Schlafsäcke"]
    brands?: string[];         // z.B. ["Hilleberg", "MSR"]
    productNames?: string[];   // z.B. ["Nallo 2", "X-Mid 2"]
    loadoutId?: string;        // aus dem UI-Kontext
    destination?: string;      // z.B. "Nordschweden"
    season?: string;           // z.B. "September"
    criteria?: string[];       // z.B. ["leichteste", "unter 1kg"]
  };
}

type IntentType =
  | 'simple_fact'          // Zählbar, direkt beantwortbar
  | 'inventory_query'      // Filter/Suche im Inventar
  | 'loadout_analysis'     // Packlisten-Analyse
  | 'gear_comparison'      // Produktvergleich
  | 'suitability_check'    // Eignungsprüfung
  | 'weight_optimization'  // Gewichtsoptimierung
  | 'recommendation'       // Empfehlung
  | 'general_knowledge'    // Allgemeinwissen Outdoor
  | 'complex';             // Alles andere → voller Agent

type DataRequirement =
  | { type: 'user_inventory'; filter?: Record<string, unknown> }
  | { type: 'loadout_items'; loadoutId: string }
  | { type: 'gear_details'; itemIds: string[] }
  | { type: 'category_tree' }
  | { type: 'geargraph_products'; names: string[] }
  | { type: 'geargraph_alternatives'; itemName: string }
  | { type: 'web_search'; query: string }
  | { type: 'catalog_search'; filters: Record<string, unknown> };
```

**Neues Modul: `lib/mastra/parallel-prefetch.ts`**

```typescript
// Führt alle DataRequirements parallel aus
async function prefetchData(
  requirements: DataRequirement[],
  userId: string
): Promise<PrefetchedContext> {
  // Alle Queries parallel mit Promise.allSettled
  const results = await Promise.allSettled(
    requirements.map(req => executeRequirement(req, userId))
  );

  // Ergebnisse in strukturierten Kontext mergen
  return mergeResults(results);
}
```

**Erweiterung der Chat-Route:**

```typescript
// VORHER (aktuell):
// 1. Auth → 2. Memory (4x parallel) → 3. Parse → 4. Build Prompt → 5. Agent + Tools

// NACHHER:
// 1. Auth
// 2. Intent Router (Gemini Flash, <500ms)
// 3. IF simple_fact:
//      → Parallel Pre-Fetch (1 Query)
//      → Gemini Flash antwortet direkt (~1s)
//      → Memory Save (async)
//      → FERTIG in ~2s
// 4. ELSE:
//      → Memory + Pre-Fetch parallel
//      → Schlankerer Prompt (Vorschlag 3)
//      → Sonnet mit injiziertem Kontext
//      → 0-1 Tool-Calls statt 3-5
//      → FERTIG in ~5-8s
```

#### Erwarteter Impact

| Fragetyp | Vorher | Nachher | Verbesserung |
|----------|--------|---------|-------------|
| "Wie viele Zelte?" | 10-20s | 1-2s | **90% schneller** |
| "Habe ich ein Kochsystem für -20°?" | 15-25s | 3-5s | **75% schneller** |
| "Was fehlt in meiner Packliste?" | 25-45s | 5-8s | **70% schneller** |
| "Vergleiche Nallo 2 vs X-Mid 2" | 20-35s | 4-7s | **75% schneller** |
| Komplexe Trip-Analyse | 30-50s | 10-15s | **60% schneller** |

#### Kosten

- Gemini 2.5 Flash als Router: ~$0.001 pro Anfrage (vernachlässigbar)
- Eingesparte Sonnet-Tokens (bei Simple Facts): ~$0.01-0.03 pro Anfrage
- **Netto: Kostenreduzierung** bei gleichzeitig besserer Performance

---

### Vorschlag 2: "Composite Domain Tools" (INTELLIGENCE LAYER)

#### Kernidee

Die 4 generischen Low-Level-Tools durch **8 hochspezialisierte Domain-Tools** ersetzen, die:
- Multi-Step-Logik kapseln (3-5 DB-Queries intern)
- Domain-Wissen enthalten (essentielle Kategorien, Gewichts-Benchmarks)
- Vorformatierte, analysefreundliche Ergebnisse liefern
- **1 Tool-Call statt 3-5** pro Frage benötigen

#### Neue Tool-Architektur

```
VORHER (4 generische Tools):                NACHHER (8 Domain-Tools):

queryUserData (generisches SELECT)  ──→  ┌─ inventoryInsights
                                         ├─ analyzeLoadout
queryCatalog (generisches SELECT)   ──→  ├─ findAlternatives
                                         ├─ calculateSystemWeight
queryGearGraph (rohes Cypher)       ──→  ├─ compareGear
                                         ├─ checkSuitability
searchWeb (Websuche)                ──→  ├─ searchGearKnowledge
                                         └─ getRecommendations
```

#### Tool-Definitionen im Detail

**Tool 1: `inventoryInsights`**
```typescript
// Beantwortet: "Wie viele Zelte?", "Was ist mein schwerstes Item?",
// "Welche Marken besitze ich?", "Was ist mein Gesamtinventarwert?"
{
  id: 'inventoryInsights',
  input: {
    question: 'count_by_category' | 'heaviest_items' | 'brand_breakdown'
            | 'weight_distribution' | 'value_summary' | 'category_gaps',
    category?: string,      // optional: nur bestimmte Kategorie
    status?: 'own' | 'wishlist' | 'all',
    limit?: number,
  },
  // INTERN: 1-3 optimierte DB-Queries + Aggregation
  output: {
    summary: string,        // Menschenlesbare Zusammenfassung
    data: Record<string, unknown>,  // Strukturierte Daten
    suggestions?: string[], // Optionale Vorschläge
  }
}
```

**Tool 2: `analyzeLoadout`** (DAS Schlüssel-Tool)
```typescript
// Beantwortet: "Was kann ich verbessern?", "Was fehlt?",
// "Wie schwer ist mein Setup?", "Ist das warm genug?"
{
  id: 'analyzeLoadout',
  input: {
    loadoutId: string,
    analysisType: 'full' | 'weight' | 'gaps' | 'suitability',
    destination?: string,   // z.B. "Nordschweden"
    season?: string,        // z.B. "September"
    activity?: string,      // z.B. "Packrafting"
  },
  // INTERN macht dieses Tool ALLES auf einmal:
  // 1. Loadout + Items laden (1 DB-Query mit JOIN)
  // 2. Kategorien auflösen (gecachte Kategorie-Tabelle)
  // 3. Gewichts-Breakdown berechnen
  // 4. Essentielle Kategorien pro Aktivitätstyp prüfen
  // 5. GearGraph-Insights für Big-3 Items parallel abrufen
  // 6. Fehlende essentielle Kategorien identifizieren
  output: {
    loadoutName: string,
    totalWeight: { grams: number, formatted: string },
    baseWeight: { grams: number, formatted: string },
    wornWeight: { grams: number, formatted: string },
    consumableWeight: { grams: number, formatted: string },
    categoryBreakdown: Array<{
      category: string,
      weight: number,
      percentage: number,
      itemCount: number,
    }>,
    big3: {
      shelter: { name: string, weight: number } | null,
      sleepSystem: { name: string, weight: number } | null,
      pack: { name: string, weight: number } | null,
      totalBig3Weight: number,
      big3Percentage: number,
    },
    missingEssentials: Array<{
      category: string,
      why: string,           // "Für Packrafting bei Kälte essentiell"
      suggestions?: string[], // Konkrete Produktvorschläge
    }>,
    heaviestItems: Array<{
      name: string,
      weight: number,
      category: string,
      lighterAlternative?: { name: string, weight: number, savings: number },
    }>,
    weightAssessment: {
      classification: 'ultralight' | 'lightweight' | 'standard' | 'heavy',
      benchmarkForActivity: number,  // Typisches Gewicht für diese Aktivität
      deviation: number,              // Prozent über/unter Benchmark
    },
    gearGraphInsights: Array<{
      itemName: string,
      insights: string[],    // Aus GearGraph: Temperatur-Ratings, Tips, etc.
    }>,
  }
}
```

**Tool 3: `findAlternatives`**
```typescript
// Beantwortet: "Welche leichteren Alternativen gibt es?",
// "Welche Kombination wäre die leichteste Regenbekleidung?"
{
  id: 'findAlternatives',
  input: {
    itemNameOrId: string,
    criteria: 'lighter' | 'cheaper' | 'warmer' | 'more_durable' | 'best_value',
    searchScope: 'own_inventory' | 'catalog' | 'both',
    maxResults?: number,
  },
  // INTERN:
  // 1. Item identifizieren (User-Inventar oder Katalog)
  // 2. Kategorie + Gewicht + Preis des Items ermitteln
  // 3. Alternativen aus eigenem Inventar suchen
  // 4. Alternativen aus Katalog suchen
  // 5. GearGraph: LIGHTER_THAN / SIMILAR_TO Beziehungen
  // 6. Ergebnisse nach Kriterium sortieren
  output: {
    originalItem: { name: string, weight: number, price: number },
    fromInventory: Array<{ name: string, weight: number, savings: number }>,
    fromCatalog: Array<{ name: string, brand: string, weight: number, price: number }>,
    fromGearGraph: Array<{ name: string, weight: number, relationship: string }>,
  }
}
```

**Tool 4: `calculateSystemWeight`**
```typescript
// Beantwortet: "Wie schwer ist mein Packraft mit allem Zubehör?"
{
  id: 'calculateSystemWeight',
  input: {
    baseItemNameOrId: string,
    includeOptional?: boolean,
  },
  // INTERN:
  // 1. Base-Item finden
  // 2. dependency_ids rekursiv auflösen
  // 3. Gewichte aggregieren
  output: {
    baseItem: { name: string, weight: number },
    dependencies: Array<{ name: string, weight: number, required: boolean }>,
    totalSystemWeight: { grams: number, formatted: string },
    missingDependencies: string[], // Abhängigkeiten ohne Gewicht
  }
}
```

**Tool 5: `compareGear`**
```typescript
// Beantwortet: "Vergleiche Nallo 2 vs X-Mid 2"
{
  id: 'compareGear',
  input: {
    items: string[],  // 2-4 Item-Namen
    focusAreas?: ('weight' | 'price' | 'warmth' | 'durability' | 'packability')[],
  },
  // INTERN: Parallel alle Items aus Katalog + GearGraph laden
  output: {
    comparison: Array<{
      name: string,
      specs: Record<string, string | number>,
      pros: string[],
      cons: string[],
    }>,
    recommendation: string,
  }
}
```

**Tool 6: `checkSuitability`**
```typescript
// Beantwortet: "Ist mein Schlafsack warm genug für Nordschweden im September?"
{
  id: 'checkSuitability',
  input: {
    itemNameOrLoadoutId: string,
    destination: string,
    season: string,
    activity?: string,
  },
  // INTERN:
  // 1. Item/Loadout-Details laden
  // 2. GearGraph: Temperatur-Ratings, Saison-Eignung
  // 3. Web-Suche: Wetterbedingungen am Zielort
  // 4. Vergleich: Item-Rating vs. erwartete Bedingungen
  output: {
    suitable: boolean,
    confidence: number,
    itemSpecs: { tempRating?: number, seasonRating?: string },
    conditions: { expectedLow: number, expectedHigh: number, source: string },
    assessment: string,
    alternatives?: Array<{ name: string, reason: string }>,
  }
}
```

**Tool 7: `searchGearKnowledge`**
```typescript
// Unified Search: Ersetzt queryUserData + queryCatalog + queryGearGraph
{
  id: 'searchGearKnowledge',
  input: {
    query: string,
    scope: 'my_gear' | 'catalog' | 'knowledge_graph' | 'all',
    filters?: {
      category?: string,
      brand?: string,
      maxWeight?: number,
      maxPrice?: number,
      status?: string,
    },
  },
  // INTERN: Parallel über alle relevanten Datenquellen suchen
  output: {
    myGear: Array<{ name: string, brand: string, weight: number }>,
    catalogProducts: Array<{ name: string, brand: string, weight: number, price: number }>,
    graphInsights: Array<{ type: string, content: string }>,
  }
}
```

**Tool 8: `getRecommendations`**
```typescript
// Beantwortet: "Was soll ich für [Aktivität] im [Saison] mitnehmen?"
{
  id: 'getRecommendations',
  input: {
    activity: string,
    season: string,
    destination?: string,
    prioritize?: 'weight' | 'budget' | 'comfort' | 'safety',
    budget?: number,
  },
  // INTERN:
  // 1. Essentielle Kategorien für Aktivität ermitteln
  // 2. User-Inventar nach passenden Items durchsuchen
  // 3. Lücken identifizieren
  // 4. Katalog-Empfehlungen für Lücken
  output: {
    fromInventory: Array<{ name: string, category: string, weight: number }>,
    gaps: Array<{ category: string, recommendations: string[] }>,
    totalWeight: number,
    notes: string[],
  }
}
```

#### Domain-Wissen in den Tools

Das Schlüsselelement: Die Tools enthalten **eingebautes Outdoor-Domain-Wissen**:

```typescript
// Essentielle Kategorien pro Aktivitätstyp
const ESSENTIAL_CATEGORIES: Record<string, string[]> = {
  hiking: ['shelter', 'sleeping', 'pack', 'rain_protection', 'navigation', 'first_aid'],
  packrafting: ['shelter', 'sleeping', 'pack', 'packraft', 'paddle', 'pfd', 'dry_bags', 'first_aid'],
  winter_camping: ['shelter', 'sleeping', 'pack', 'insulation', 'stove', 'navigation', 'emergency'],
  // ...
};

// Gewichts-Benchmarks pro Aktivitätstyp (Basisgewicht in Gramm)
const WEIGHT_BENCHMARKS: Record<string, { ultralight: number, lightweight: number, standard: number }> = {
  hiking_3season: { ultralight: 4500, lightweight: 6800, standard: 9000 },
  winter_camping: { ultralight: 7000, lightweight: 10000, standard: 14000 },
  packrafting: { ultralight: 8000, lightweight: 12000, standard: 16000 },
  // ...
};
```

#### Erwarteter Impact

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Tool-Calls pro Frage | 3-5 | 1-2 |
| Prompt-Tokens für Tool-Docs | ~3.000 | ~2.000 (weniger, aber reichere Tools) |
| Antwortqualität | LLM muss Query-Logik improvisieren | Tool liefert strukturierte Analyse |
| Domain-Fehler | LLM "vergisst" essentielle Kategorien | Tools haben eingebautes Wissen |
| Kontext-Verlust | Häufig nach 3+ Tool-Calls | Selten (1 Call = komplettes Ergebnis) |

---

### Vorschlag 3: "Active Gear Knowledge Base + Streamlined Prompt" (CONTEXT LAYER)

#### Kernidee

Zwei zusammenhängende Verbesserungen:

**A)** Pre-computed Gear Intelligence: Statt bei jeder Anfrage die Daten zusammenzusuchen, werden angereicherte "Gear Cards" und "Loadout Snapshots" **im Hintergrund** berechnet und aktualisiert.

**B)** Radikal schlankerer System-Prompt: Statt ~8.000 Tokens statischer Instruktionen nur die für den aktuellen Kontext relevanten Informationen.

#### Teil A: Active Gear Knowledge Base

**Konzept: "Enriched Gear Cards"**

Für jedes Gear-Item im Inventar wird eine angereicherte "Card" im Hintergrund erstellt:

```typescript
interface EnrichedGearCard {
  // Basis-Daten (aus gear_items)
  itemId: string;
  name: string;
  brand: string;
  weight: number;
  category: string;

  // Angereichert aus GearGraph (gecacht)
  catalogMatch?: {
    catalogProductId: string;
    confidence: number;
    tempRating?: number;       // Komfort-Temperatur
    seasonRating?: string;     // "3-season", "4-season"
    materials?: string[];      // "Dyneema", "Silnylon"
    waterproofRating?: string; // "10.000mm"
  };

  // Pre-computed Insights
  insights: {
    lighterAlternatives: number;  // Anzahl leichterer Alternativen im Katalog
    categoryRank: number;         // Rang nach Gewicht in seiner Kategorie
    pricePerGram?: number;        // Preis-Gewichts-Verhältnis
  };

  // Abhängigkeiten (aufgelöst)
  dependencies: Array<{
    itemId: string;
    name: string;
    weight: number;
    required: boolean;
  }>;

  // Zeitstempel
  lastEnriched: string;
}
```

**Update-Trigger**: Die Gear Cards werden aktualisiert wenn:
- User ein Item hinzufügt/bearbeitet → Supabase Database Webhook
- GearGraph-Daten sich ändern → Periodischer Sync (täglich)
- Enrichment-Suggestion angenommen wird → Sofort

**Speicherung**: Neue Supabase-Tabelle `gear_cards`:
```sql
CREATE TABLE gear_cards (
  gear_item_id UUID PRIMARY KEY REFERENCES gear_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  catalog_match JSONB,           -- GearGraph-Anreicherung
  insights JSONB,                -- Pre-computed Insights
  dependencies JSONB,            -- Aufgelöste Abhängigkeiten
  system_weight_grams INTEGER,   -- Item + alle Abhängigkeiten
  season_suitability TEXT[],     -- ['spring', 'summer', 'fall']
  temp_rating_celsius NUMERIC,   -- Komfort-Temperatur (wenn anwendbar)
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Index für schnelle User-Lookups
CREATE INDEX idx_gear_cards_user ON gear_cards(user_id);
```

**Konzept: "Loadout Intelligence Snapshot"**

Für jedes Loadout wird ein pre-computed Analyse-Snapshot erstellt:

```typescript
interface LoadoutSnapshot {
  loadoutId: string;

  // Weight Intelligence
  weights: {
    total: number;
    base: number;
    worn: number;
    consumable: number;
    big3: number;
    big3Percentage: number;
    classification: 'ultralight' | 'lightweight' | 'standard' | 'heavy';
  };

  // Category Completeness
  categories: {
    present: string[];
    missing: string[];        // Basierend auf Aktivitätstyp
    breakdown: Record<string, { weight: number, items: number }>;
  };

  // Item Intelligence (aus Gear Cards)
  itemCards: EnrichedGearCard[];

  // Trip Readiness Score (0-100)
  readinessScore: number;
  readinessNotes: string[];

  // Timestamp
  computedAt: string;
}
```

**Update-Trigger**: Loadout Snapshots werden aktualisiert wenn:
- Items hinzugefügt/entfernt werden → Sofort
- Loadout-Metadata sich ändert → Sofort
- Gear Cards aktualisiert werden → Cascade-Update

#### Teil B: Radikal schlankerer System-Prompt

**Aktuell: ~8.000 Tokens statisch**

**Neu: ~2.500-3.500 Tokens dynamisch**, aufgeteilt in:

```
KERN (immer, ~800 Tokens):
├── Identity (200 Tok): Rolle, Sprache, Ton
├── Konversationsstil (300 Tok): Enthusiastisch, direkt, Play-by-Play
└── Limitierungen (100 Tok): Was der Agent nicht kann
    Error Handling (200 Tok): Wie mit Fehlern umgehen

KONTEXT-ABHÄNGIG (nur wenn relevant):
├── [Inventar-View]: Inventar-Summary (200 Tok)
├── [Loadout-View]: Loadout-Snapshot (300-500 Tok)
├── [Gear-Detail]: Gear Card (200 Tok)
└── [Working Memory]: Nutzerprofil (200-500 Tok)

TOOL-DOCS (radikal gekürzt):
└── Tool-Beschreibungen (500-800 Tok)
    → Statt SQL-Beispiele: Natürlichsprachige Beschreibungen
    → Domain-Wissen ist IN den Tools, nicht im Prompt
```

**Was wegfällt:**

| Sektion | Tokens | Warum entfernbar |
|---------|--------|------------------|
| Tool Best Practices | 800 | Domain-Wissen ist jetzt IN den Composite Tools |
| Tool Selection Rules | 500 | Intent Router entscheidet, nicht der LLM |
| Data Validation | 400 | Composite Tools validieren intern |
| Category Reference | 800 | `categorySearch` und Composite Tools lösen das intern |
| Detaillierte SQL-Beispiele | 600 | Composite Tools brauchen kein SQL |
| Loadout Analysis Guidance | 1500 | `analyzeLoadout` Tool enthält die Logik |
| Safety Guidance | 800 | `checkSuitability` Tool enthält die Logik |

**Einsparung: ~5.400 Tokens** → System-Prompt sinkt von ~8.000 auf ~2.500 Tokens

#### Erwarteter Impact

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| System-Prompt Größe | ~8.000 Tokens | ~2.500-3.500 Tokens |
| "Lost in the Middle" | Häufig | Selten (Prompt kurz genug) |
| Daten bei Loadout-Analyse | Muss zur Laufzeit fetchen | Pre-computed Snapshot |
| GearGraph-Latenz | 2-5s pro Query | 0ms (gecacht in Gear Cards) |
| Instruktions-Befolgung | ~70% | ~90%+ (kürzerer Prompt) |
| Context-Window Nutzung | 60% Prompt, 40% Konversation | 25% Prompt, 75% Konversation |

---

## 3. Zusammenspiel der drei Vorschläge

### Flow-Beispiel: "Was fehlt in meiner Packliste?"

```
AKTUELL (30-45 Sekunden):
1. Auth + Memory (4-Tier parallel)                    ~500ms
2. Build 8.000-Token System Prompt                    ~10ms
3. Sonnet liest Prompt, überlegt                      ~3s
4. Tool: queryUserData(loadout_items)                 ~4s
5. Tool: queryUserData(gear_items, IDs)               ~4s
6. Tool: queryCatalog(categories)                     ~4s
7. Tool: queryGearGraph(LIGHTER_THAN für Top-3)       ~8s
8. Sonnet generiert Antwort                           ~5s
9. Memory Save                                        ~300ms
═══════════════════════════════════════════════════════
TOTAL: ~29 Sekunden

NEU MIT ALLEN 3 VORSCHLÄGEN (5-7 Sekunden):
1. Auth                                               ~50ms
2. Intent Router (Gemini Flash): "loadout_analysis"   ~400ms
3. Parallel Pre-Fetch:                                ~500ms
   ├── Loadout Snapshot (aus Cache/DB)                  ~100ms
   ├── Gear Cards für alle Items (aus DB)               ~200ms
   └── Memory (schlank: nur History + WM)               ~300ms
4. Build 2.500-Token Prompt + injizierter Kontext     ~10ms
5. Sonnet: Alle Daten vorhanden → 1-Pass-Antwort     ~4-5s
   └── 0 Tool-Calls nötig!
6. Memory Save (async)                                ~0ms (non-blocking)
═══════════════════════════════════════════════════════
TOTAL: ~5-6 Sekunden (80% schneller!)
```

### Flow-Beispiel: "Wie viele Zelte besitze ich?"

```
AKTUELL (10-20 Sekunden):
1. Auth + Memory (4-Tier parallel)                    ~500ms
2. Build 8.000-Token System Prompt                    ~10ms
3. Sonnet liest Prompt, überlegt                      ~3s
4. Tool: queryUserData(categorySearch: "tents")       ~4s
5. Sonnet generiert Antwort                           ~3s
6. Memory Save                                        ~300ms
═══════════════════════════════════════════════════════
TOTAL: ~11 Sekunden

NEU MIT ALLEN 3 VORSCHLÄGEN (1-2 Sekunden):
1. Auth                                               ~50ms
2. Intent Router (Gemini Flash): "simple_fact"        ~400ms
   → Extrahiert: category = "tents"
3. Pre-Fetch: 1 gezielter DB-Count                    ~100ms
   SELECT COUNT(*) FROM gear_items
   WHERE user_id = ? AND category_id IN (tent-IDs)
4. Gemini Flash antwortet direkt:                     ~500ms
   "Du besitzt aktuell 3 Zelte in deinem Inventar."
5. Memory Save (async)                                ~0ms
═══════════════════════════════════════════════════════
TOTAL: ~1 Sekunde (90% schneller!)
```

---

## 4. Implementierungs-Roadmap

### Phase 1: Context Layer (Vorschlag 3) - Fundament

**Aufwand: ~3-4 Tage**

Warum zuerst? Schafft das Daten-Fundament für die anderen beiden Vorschläge.

1. `gear_cards` Tabelle + RLS-Policies erstellen
2. Background-Enrichment Service implementieren
3. Loadout Snapshot Berechnung implementieren
4. System-Prompt radikal kürzen
5. Update-Trigger via Supabase Webhooks

### Phase 2: Intelligence Layer (Vorschlag 2) - Klügere Tools

**Aufwand: ~4-5 Tage**

Warum als zweites? Nutzt die Gear Cards aus Phase 1.

1. `analyzeLoadout` Tool (das Schlüssel-Tool)
2. `inventoryInsights` Tool
3. `findAlternatives` Tool
4. `calculateSystemWeight` Tool
5. `checkSuitability` Tool
6. `compareGear` Tool
7. `searchGearKnowledge` Tool (Unified Search)
8. `getRecommendations` Tool
9. Alte Tools deprecaten (Übergangsphase)

### Phase 3: Speed Layer (Vorschlag 1) - Maximale Geschwindigkeit

**Aufwand: ~3-4 Tage**

Warum zuletzt? Nutzt sowohl Gear Cards (Phase 1) als auch Composite Tools (Phase 2).

1. Intent Router mit Gemini Flash implementieren
2. Parallel Pre-Fetch Pipeline implementieren
3. Fast-Path für Simple Facts implementieren
4. Chat-Route refactoren für neuen Flow
5. Performance-Monitoring + A/B-Testing

### Gesamtaufwand: ~10-13 Tage

---

## 5. Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Gemini Flash klassifiziert Intent falsch | Mittel | Fallback auf vollen Agent-Flow; Confidence-Threshold |
| Gear Cards werden stale | Niedrig | Update-Trigger + TTL-basierte Revalidierung |
| Composite Tools zu starr für Edge Cases | Mittel | `searchGearKnowledge` als flexibler Fallback |
| System-Prompt zu kurz → Agent verliert Persönlichkeit | Niedrig | Kern-Prompt mit Ton/Stil bleibt erhalten |
| Doppelte Datenquellen (Cards vs. Live) | Mittel | Cards als primär, Live-Query nur als Fallback |

---

## 6. Erfolgsmetriken

| Metrik | Aktuell (geschätzt) | Ziel |
|--------|---------------------|------|
| Median-Antwortzeit (einfache Fragen) | ~15s | <3s |
| Median-Antwortzeit (Loadout-Analyse) | ~35s | <8s |
| Tool-Calls pro Anfrage | 3-5 | 0-1 |
| System-Prompt Tokens | ~8.000 | ~2.500 |
| Kontext-Verlust (subjektiv) | Häufig | Selten |
| Antwortqualität (subjektiv) | Mittelmäßig | Hervorragend |
| Kosten pro Anfrage (geschätzt) | ~$0.05 | ~$0.02-0.03 |
