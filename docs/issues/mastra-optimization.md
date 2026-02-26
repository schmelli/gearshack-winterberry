# Mastra Framework Optimization — GitHub Issues

> Generiert aus der Analyse "Principles of Building AI Agents" (Sam Bhagwat, 2nd Ed., May 2025)
> Branch: `claude/analyze-matras-framework-ZkQ0l`

---

## Issue 1: feat(mastra): Workflow Fallback Pattern bei Step-Failures

**Labels:** `enhancement`, `ai`, `reliability`, `priority:critical`
**Milestone:** Mastra Optimization Sprint

### Problem

Wenn das `gear-assistant-workflow` bei einem Step scheitert (z.B. Gemini-API-Timeout bei `classifyIntent`), propagiert der Fehler direkt zum User. Der Chat ist dann komplett kaputt — obwohl der Agent auch **ohne** den Workflow-Context arbeiten könnte.

`app/api/mastra/chat/route.ts:497` wirft aktuell:
```typescript
throw new Error(`Workflow failed at step(s): ${stepErrors.join(', ') || 'unknown'}`);
```

Das Workflow-File dokumentiert das Problem selbst:
```typescript
// Note: Per-step retries (retryConfig) are not yet configured.
```

**Buchkapitel:** Kap. 12/13 — *"Many different special cases of workflow graphs, like loops, retries, etc. can be made by combining these primitives."*

### Lösung

In `app/api/mastra/chat/route.ts` den Workflow-Block mit Fallback wrappen:

```typescript
let pipelineOutput: GearAssistantWorkflowOutput;

try {
  const workflow = mastra.getWorkflow('gear-assistant');
  const run = await workflow.createRun({ resourceId: user.id });
  const workflowResult = await run.start({ inputData: { ... } });

  if (workflowResult.status !== 'success' || !workflowResult.result) {
    throw new Error('Workflow step failed');
  }
  pipelineOutput = workflowResult.result as GearAssistantWorkflowOutput;

} catch (workflowError) {
  // GRACEFUL DEGRADATION: Direkter Agent-Call ohne Context-Enrichment
  logWarn('Workflow pipeline failed, falling back to direct agent call', {
    error: workflowError instanceof Error ? workflowError.message : 'unknown',
  });
  pipelineOutput = {
    enrichedSystemPrompt: buildMastraSystemPrompt({ userContext: context }),
    queryComplexity: 'complex',
    fastAnswer: null,
    intent: 'complex',
    dataRequirements: [],
  };
}
```

### Akzeptanzkriterien

- [ ] Bei Workflow-Failure fällt der Chat auf direkten Agent-Call zurück (kein Error zum User)
- [ ] Fallback wird via `logWarn` und OTel-Span protokolliert
- [ ] Unit-Test: Workflow-Mock wirft Error → User erhält trotzdem Antwort
- [ ] Kein Regression bei normalem Workflow-Flow

---

## Issue 2: feat(mastra): Per-Step `retryConfig` für netzwerkgebundene Workflow-Steps

**Labels:** `enhancement`, `ai`, `reliability`, `priority:critical`
**Milestone:** Mastra Optimization Sprint

### Problem

Die netzwerkgebundenen Steps `classifyIntent` (Gemini API) und `prefetchData` (Supabase RPC) haben kein Retry-Handling. Ein einzelner kurzer Netzwerk-Hickup lässt den gesamten Workflow scheitern.

Das `gear-assistant-workflow.ts` dokumentiert das Problem explizit in Zeile 15–17:
```typescript
// Note: Per-step retries (retryConfig) are not yet configured.
// Network-bound steps (classifyIntent → Gemini) could benefit from retries: 1
```

**Buchkapitel:** Kap. 13 — *"Loops, retries, and other special cases can be made by combining these primitives."*

### Lösung

Mastra bietet `retryConfig` nativ als Step-Property. In `gear-assistant-workflow.ts`:

```typescript
const classifyIntentStep = createStep({
  id: 'classifyIntent',
  retryConfig: {
    attempts: 2,   // 1 Wiederholung (2 Versuche total)
    delay: 1000,   // 1s Pause zwischen Versuchen
  },
  // ...
});

const prefetchDataStep = createStep({
  id: 'prefetchData',
  retryConfig: {
    attempts: 2,
    delay: 500,    // Supabase erholt sich schneller als Gemini
  },
  // ...
});
```

### Akzeptanzkriterien

- [ ] `classifyIntent` Step hat `retryConfig: { attempts: 2, delay: 1000 }`
- [ ] `prefetchData` Step hat `retryConfig: { attempts: 2, delay: 500 }`
- [ ] `buildContext` Step braucht kein Retry (nur LLM-Logik, kein externes Netz)
- [ ] Test: Step-Mock schlägt beim ersten Call fehl, zweiter Call erfolgreich → Workflow läuft durch

---

## Issue 3: fix(mastra): Semantic Cache PII-Guard als Middleware-Layer

**Labels:** `bug`, `security`, `privacy`, `ai`, `priority:critical`
**Milestone:** Mastra Optimization Sprint

### Problem

`semantic-cache.ts` Zeile 26–36 dokumentiert ein kritisches Sicherheitsrisiko:

```typescript
// PII / Data-Governance Boundary:
// ASSUMPTION: Cached queries never contain PII
// REALITY: Relies entirely on Intent Router accuracy
// RISK: If intent classifier mislabels a personal query as general_knowledge,
//       it gets cached globally with raw query text exposed.
```

Beispiel: `"Bestes Zelt für meinen Trip nach Patagonien im Februar"` → wenn fälschlicherweise als `general_knowledge` klassifiziert → landet mit Reiseziel + Datum global in `response_cache.query_text`. **DSGVO-relevant.**

**Buchkapitel:** Kap. 9 — *"Security through obscurity becomes less of a viable option when users can ask an agent to retrieve knowledge hidden in nooks and crannies."*

### Lösung

In `lib/mastra/semantic-cache.ts` einen Heuristik-Guard vor jedem Cache-Write hinzufügen:

```typescript
const PII_PATTERNS: RegExp[] = [
  // Possessive + Gear-Kontext
  /\b(my|mine|our|ich|mein|unser)\s+(trip|hike|loadout|pack|gear|zelt|schlafsack)\b/i,
  // Geografische Eigennamen im Reisekontext
  /\b(to|nach|in|für)\s+[A-ZÄÖÜ][a-zäöüß]{2,}(\s+[A-ZÄÖÜ][a-zäöüß]{2,})?\b/,
  // Datums-/Zeitangaben mit persönlichem Kontext
  /\b(in|im|next|nächsten?)\s+(january|february|march|...|dezember)\b/i,
  // Allgemeines Possessiv
  /\b(meine?[rns]?|my)\s+\w+/i,
];

function containsPII(query: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(query));
}

// In storeInSemanticCache() — VOR dem DB-Write:
if (containsPII(query)) {
  logDebug('Semantic cache write skipped: PII heuristic matched');
  return;
}
```

### Akzeptanzkriterien

- [ ] `containsPII()` Funktion mit mindestens 8 Testfällen (EN + DE)
- [ ] Positiv-Tests: "Bestes Zelt für meinen Trip nach Patagonien" → blockiert
- [ ] Negativ-Tests: "Unterschied Gore-Tex vs eVent" → wird gecacht
- [ ] Guard ist unabhängig vom Intent Router (defense-in-depth)
- [ ] Logging bei PII-Block (Debug-Level, kein Query-Text im Log)

---

## Issue 4: feat(mastra): Working Memory — aktive Schreib-Instruktionen im System Prompt

**Labels:** `enhancement`, `ai`, `ux`, `priority:high`
**Milestone:** Mastra Optimization Sprint

### Problem

Das `GearshackUserProfileSchema` (`working-memory.ts`) ist vollständig definiert mit Feldern wie `preferences.weightPhilosophy`, `upcomingTrips[]`, `learnedFacts[]`. Die Memory-Konfiguration übergibt das Schema korrekt an Mastra.

**Aber:** Im `prompt-builder.ts` gibt es keinen einzigen Satz, der den Agenten anweist, dieses Schema während Konversationen **aktiv zu befüllen**. Ohne explizite Instruktion schreibt der Agent nichts in Working Memory.

**Buchkapitel:** Kap. 7 — *"Working memory stores relevant, persistent, long-term characteristics of users. A popular example: ask ChatGPT what it knows about you."*

### Lösung

In `lib/mastra/prompt-builder.ts` einen dedizierten Instruktions-Block hinzufügen:

```typescript
const WORKING_MEMORY_INSTRUCTIONS = `
## Working Memory — Profil-Updates

Du pflegst ein persistentes Profil über diesen User. **Aktualisiere es aktiv**, wenn du folgendes lernst:

| Erkennst du das | Schreibe in Feld |
|---|---|
| User erwähnt Trip ("PCT im Juli") | \`upcomingTrips[]\` — destination + activity + date |
| Gewichtspräferenz ("I love ultralight") | \`preferences.weightPhilosophy\` = 'ultralight' |
| Budget-Kontext ("max €200") | \`preferences.budgetRange\` = 'budget' |
| Faktische Korrektur ("Ich wiege 85kg") | \`learnedFacts[]\` — category 'constraint' |
| Bevorzugter Name ("Nenn mich Alex") | \`name\` |

Merke dir persönliche Informationen — der User erwartet, dass du sie beim nächsten Gespräch kennst.
`;
```

### Akzeptanzkriterien

- [ ] `WORKING_MEMORY_INSTRUCTIONS` Block in beiden Sprachen (EN + DE)
- [ ] Block wird in `buildMastraSystemPrompt()` für alle User-Tiers eingebunden
- [ ] Manueller Test: "Ich plane einen PCT-Hike im Juli" → nächste Session enthält Trip-Info in Working Memory
- [ ] Kein Regression in bestehenden Eval-Scores (Faithfulness, Hallucination)

---

## Issue 5: feat(mastra): ReAG — LLM-gestützte Voranreicherung des Gear-Katalogs

**Labels:** `enhancement`, `ai`, `rag`, `performance`, `priority:high`
**Milestone:** Mastra Optimization Sprint

### Problem

Der Gear-Katalog ist indexiert mit: `name`, `brand`, `description`, `weight`. Semantisch äquivalente Suchanfragen wie *"was nehme ich für nasskaltes Schottland?"* finden keine Treffer — weil kein Produkt mit "rain-resistant, Scottish Highlands, wet weather" getaggt ist. Die implizite Information (Gore-Tex = wasserabweisend) ist nicht als durchsuchbare Semantik vorhanden.

**Buchkapitel:** Kap. 20 (ReAG) — *"Extract rich semantic information, including entity names and structured relationships. Pre-processing is asynchronous, so it doesn't need to be fast."*

### Lösung

Background-Job für asynchrone Katalog-Anreicherung (nicht auf kritischem Pfad):

```typescript
// scripts/enrich-catalog-items.ts

const EnrichmentSchema = z.object({
  useCases: z.array(z.string()),            // "Long-distance hiking, Thru-hiking, PCT"
  alternativeSearchTerms: z.array(z.string()), // "ultralight backpack, frameless pack"
  conditions: z.array(z.string()),           // "rain, wet weather, Scottish Highlands"
  compatibleWith: z.array(z.string()),       // "tarp, bivy, trekking poles"
  avoidFor: z.string().optional(),           // "winter mountaineering"
});

// Als search_enrichment JSONB in catalog_items speichern
// In searchGearKnowledge als zusätzliche Suchfläche einbinden
```

Neue Datenbank-Spalte: `catalog_items.search_enrichment JSONB`

### Akzeptanzkriterien

- [ ] Script `scripts/enrich-catalog-items.ts` verarbeitet alle Katalog-Items ohne `enriched_at`
- [ ] Kosten-Limit: Max. 1000 Items/Run, nur Haiku-Modell (Batch-Processing)
- [ ] `searchGearKnowledge` nutzt `search_enrichment`-Felder als zusätzliche Suchfläche
- [ ] Supabase-Migration: `search_enrichment JSONB`, `enriched_at TIMESTAMPTZ`
- [ ] Test: "nasskaltes Schottland" findet Gore-Tex Jacke trotz fehlendem Keyword

---

## Issue 6: feat(mastra): Hybrid RAG — Qualitätsfilter für Community-Wissen

**Labels:** `enhancement`, `ai`, `rag`, `community`, `priority:high`
**Milestone:** Mastra Optimization Sprint

### Problem

In `search-gear-knowledge.ts` Zeile 407:
```typescript
searchCommunityKnowledge(query, { topK: 3 }).catch(() => []),
```

Kein einziger Qualitätsfilter. Ein 3 Jahre alter Post über ein discontinuiertes Produkt hat die gleiche Ranking-Chance wie ein aktueller, 50-fach upgevoteter Review.

**Buchkapitel:** Kap. 19 — *"Hybrid Queries combine vector similarity search with traditional metadata filtering — narrow down results based on both semantic similarity and structured metadata."*

### Lösung

`CommunitySearchOptions` um Qualitätsparameter erweitern:

```typescript
// lib/community-rag/types.ts
export interface CommunitySearchOptions {
  topK?: number;
  threshold?: number;
  sourceType?: string | null;
  tags?: string[] | null;
  // NEU:
  minReactions?: number;    // Mindest-Upvotes
  maxAgeMonths?: number;    // Max. Alter in Monaten
}

// In search-gear-knowledge.ts:
searchCommunityKnowledge(query, {
  topK: 3,
  maxAgeMonths: 24,    // Nur Posts < 2 Jahre
  minReactions: 2,     // Mindestens 2 Upvotes
}),
```

Supabase RPC `search_community_knowledge` mit neuen Filter-Parametern erweitern.

### Akzeptanzkriterien

- [ ] `CommunitySearchOptions` hat `minReactions` und `maxAgeMonths` Felder
- [ ] Supabase RPC filtert auf `created_at` und `reactions_count`
- [ ] `searchGearKnowledge` nutzt `maxAgeMonths: 24, minReactions: 2` als Standard
- [ ] Migration: Sicherstellen dass `reactions_count` in `community_knowledge_chunks` gespeichert ist
- [ ] Test: Post ohne Reactions und > 2 Jahre alt taucht nicht mehr in Ergebnissen auf

---

## Issue 7: feat(mastra): Critic-Agent für teure Kaufempfehlungen (>€300)

**Labels:** `enhancement`, `ai`, `multi-agent`, `priority:medium`
**Milestone:** Mastra Optimization Sprint

### Problem

Wenn `findAlternatives` oder `searchGearKnowledge` Produkte über €300 empfiehlt, gibt es keine zweite Meinungsperspektive. Der Agent präsentiert teure Empfehlungen ohne Budget-Check.

**Buchkapitel:** Kap. 21 — *"Give creative tasks to one person and review tasks to another. A critic agent: 'Is that really necessary, or would a cheaper model work?'"*

### Lösung

Neues Tool `reviewExpensiveRecommendation` als Post-Processing-Layer:

```typescript
// lib/mastra/tools/review-recommendation.ts

export const reviewRecommendationTool = createTool({
  id: 'reviewExpensiveRecommendation',
  description: 'Review a gear recommendation >€300 with a budget-conscious perspective. ALWAYS call this after recommending gear over €300.',
  inputSchema: z.object({
    recommendedItem: z.string(),
    priceEur: z.number(),
    userNeed: z.string(),
    userInventoryItems: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    // Haiku: Budget-Konsultation ist einfach
    const { object } = await generateObject({
      model: gateway(SIMPLE_MODEL),
      schema: z.object({
        concerns: z.array(z.string()),
        cheaperAlternative: z.string().nullable(),
        recommendation: z.enum(['proceed', 'reconsider', 'check_used_market']),
        reasoning: z.string(),
      }),
      prompt: `Budget-conscious review for: ${context.recommendedItem} at €${context.priceEur}...`,
    });
    return object;
  },
});
```

### Akzeptanzkriterien

- [ ] `reviewRecommendationTool` in `tools/review-recommendation.ts` implementiert
- [ ] Tool bei Standard- und Trailblazer-Tier verfügbar
- [ ] System-Prompt-Instruktion: Tool bei Preisempfehlung >€300 aufrufen
- [ ] Test: Agent empfiehlt €450-Zelt → `reviewExpensiveRecommendation` wird aufgerufen
- [ ] Eval: `ToolCallAccuracy` bleibt ≥ 0.8 nach Hinzufügen des neuen Tools

---

## Issue 8: feat(mastra): GearShack als MCP-Server exponieren

**Labels:** `enhancement`, `ai`, `mcp`, `platform`, `priority:medium`
**Milestone:** Mastra Optimization Sprint

### Problem

GearShack hat einen MCP-**Client** (für GearGraph), aber keinen MCP-**Server**. Die Tools `analyzeLoadout`, `searchGearKnowledge`, `findAlternatives` könnten als standardisierter MCP-Server exponiert werden — nutzbar von anderen Agenten (Claude.ai, Cursor, externe User-Agenten).

**Buchkapitel:** Kap. 11 — *"If you're building a tool that you want other agents to use, you should consider shipping an MCP server. Vendors like Stripe began shipping MCP servers for their API functionality."*

### Lösung

```typescript
// lib/mastra/mcp-server.ts
import { MCPServer } from '@mastra/mcp';

export const gearshackMCPServer = new MCPServer({
  name: 'gearshack',
  version: '1.0.0',
  description: 'GearShack Gear Management — analyze loadouts, search gear, optimize pack weight',
  tools: {
    analyzeLoadout: analyzeLoadoutTool,
    searchGear: searchGearKnowledgeTool,
    inventoryInsights: inventoryInsightsTool,
  },
});

// app/api/mcp/route.ts
export const GET = gearshackMCPServer.handleRequest;
export const POST = gearshackMCPServer.handleRequest;
```

Öffentlicher Endpoint: `GET /api/mcp` → listet verfügbare Tools
`POST /api/mcp` → führt Tool aus (mit Auth via Supabase Session)

### Akzeptanzkriterien

- [ ] `lib/mastra/mcp-server.ts` mit `MCPServer` aus `@mastra/mcp`
- [ ] `app/api/mcp/route.ts` registriert MCP-Endpunkt
- [ ] Auth: Tools können nur für authentifizierte User aufgerufen werden
- [ ] `/.well-known/agent.json` Endpoint für A2A-Protokoll-Kompatibilität
- [ ] Test: `curl POST /api/mcp` mit `analyzeLoadout`-Tool-Call gibt valide Response
- [ ] Dokumentation in `docs/guides/mcp-server.md`

---

## Issue 9: feat(mastra): Supervisor-Agent-Pattern für Multi-Domain-Routing

**Labels:** `enhancement`, `ai`, `multi-agent`, `architecture`, `priority:medium`
**Milestone:** Mastra Optimization Sprint

### Problem

Der GearShack-Agent (je nach Tier 4–9 Tools) deckt 5 Domänen ab: Inventar, Loadouts, Katalog, Community, Marketplace. Bei einfachen Community-Fragen bekommt der Agent dennoch alle Gear-Tools — erhöht Prompt-Size um ~40% und verwirrt das Modell.

**Buchkapitel:** Kap. 22 — *"Agent supervisors coordinate and manage other agents. Pass in the other agents wrapped as tools."*

### Lösung

Supervisor als minimaler Routing-Step vor dem Workflow:

```typescript
// lib/mastra/supervisor-agent.ts

const supervisorAgent = new Agent({
  name: 'GearShack-Concierge',
  instructions: `Classify user intent to ONE domain:
    - "gear": inventory, loadouts, weight analysis, catalog search
    - "community": bulletin board, shakedowns, trip reports
    - "marketplace": buying/selling used gear, prices
    - "profile": settings, account, preferences
    Return only the domain name.`,
  model: gateway('anthropic/claude-haiku-4-5'),  // Haiku: Routing ist trivial
});

const DOMAIN_TOOLS = {
  gear:        [analyzeLoadoutTool, searchGearKnowledgeTool, inventoryInsightsTool, findAlternativesTool],
  community:   [searchGearKnowledgeTool],  // Community-Wissen via searchGear
  marketplace: [searchGearKnowledgeTool, findAlternativesTool],
  profile:     [inventoryInsightsTool],
};
```

### Akzeptanzkriterien

- [ ] `supervisorAgent` klassifiziert Domain in <100ms mit Haiku
- [ ] 4 Tool-Sets (gear, community, marketplace, profile) definiert
- [ ] Integration in `mastra-agent.ts` als optionaler Pre-Step
- [ ] Test: Community-Frage → nur 1 Tool verfügbar (nicht alle 9)
- [ ] Latenz-Overhead des Supervisors: <150ms (Haiku)
- [ ] Fallback: Bei Supervisor-Fehler → voller Tool-Set (safety first)

---

## Issue 10: feat(mastra): Synthetische Eval-Generierung aus Produktions-Traces

**Labels:** `enhancement`, `ai`, `evals`, `observability`, `priority:medium`
**Milestone:** Mastra Optimization Sprint

### Problem

`evals/test-datasets.ts` enthält ~15 handgefertigte Test-Cases. Diese wachsen nie automatisch. Echte Edge-Cases aus der Produktion (z.B. leere Loadouts, gemischte Deutsch/Englisch-Queries, unbekannte Marken) werden nie als Test-Case aufgenommen, weil niemand daran denkt.

**Buchkapitel:** Kap. 34 — *"Some products are synthetically generating evals from tracing data, with human approval."*
**Buchkapitel:** Kap. 16 — *"Teams that have shipped agents talk about how important it is to look at production data for every step, of every run."*

### Lösung

Weekly Cron-Job der aus OTel-Traces Eval-Kandidaten extrahiert:

```typescript
// scripts/generate-evals-from-traces.ts

async function generateEvalsFromTraces() {
  // 1. Traces der letzten 7 Tage abrufen
  const recentTraces = await supabase
    .from('otel_spans')
    .select('input, output, tool_calls, duration_ms, eval_scores')
    .gt('created_at', subDays(new Date(), 7))
    .not('eval_scores', 'is', null)
    .limit(200);

  // 2. LLM wählt diverse, repräsentative Kandidaten
  const { object: candidates } = await generateObject({
    model: gateway('anthropic/claude-sonnet-4-5'),
    schema: EvalCandidateSchema,
    prompt: `From these traces, select 5 diverse edge cases
             that cover failure modes or unusual patterns...`,
  });

  // 3. In Review-Queue (Human-Approval vor Aufnahme in test-datasets.ts)
  await supabase.from('eval_review_queue').insert(
    candidates.evalCandidates.map(c => ({
      ...c,
      status: 'pending_review',
      generated_at: new Date().toISOString(),
    }))
  );
}
```

Neue Tabelle: `eval_review_queue` (id, input, expectedTools, groundTruth, rationale, status, generated_at)

### Akzeptanzkriterien

- [ ] Script `scripts/generate-evals-from-traces.ts` implementiert
- [ ] Supabase-Tabelle `eval_review_queue` mit passenden RLS-Policies
- [ ] Cron-Job läuft wöchentlich (z.B. via Vercel Cron oder pg_cron)
- [ ] Simple Admin-UI oder SQL-Query für Human-Review der Queue
- [ ] Nach Approval: Kandidaten automatisch in `test-datasets.ts` eingetragen (PR-Format)
- [ ] Mindestens 5 echte Traces als Seed-Beispiele für die erste Ausführung

---

## Prioritäts-Übersicht

| Issue | Titel | Priorität | Aufwand | Sicherheitsrelevanz |
|-------|-------|-----------|---------|---------------------|
| #1 | Workflow Fallback | 🔴 Kritisch | Klein | Nein |
| #2 | Per-Step RetryConfig | 🔴 Kritisch | Klein | Nein |
| #3 | Semantic Cache PII-Guard | 🔴 Kritisch | Klein | **Ja (DSGVO)** |
| #4 | Working Memory schreiben | 🟡 Hoch | Klein | Nein |
| #5 | ReAG Katalog-Anreicherung | 🟡 Hoch | Mittel | Nein |
| #6 | Hybrid RAG Qualitätsfilter | 🟡 Hoch | Klein | Nein |
| #7 | Critic-Agent | 🟡 Mittel | Mittel | Nein |
| #8 | MCP-Server exponieren | 🟡 Mittel | Mittel | Ja (Auth) |
| #9 | Supervisor-Agent | 🟡 Mittel | Groß | Nein |
| #10 | Synthetische Evals | 🟡 Mittel | Groß | Nein |
