# Architecture Review: Gearshack Winterberry

**Date:** 2026-02-07
**Reviewer:** Architecture Review Agent
**Codebase Size:** 7.5M (app: 1.2M, components: 2.7M, hooks: 1.3M, lib: 1.6M, types: 717K)
**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9.3 (strict), Supabase, Zustand, next-intl

---

## Executive Summary

Gearshack Winterberry ist eine **komplexe, feature-reiche Next.js-Anwendung** (~50+ Features) mit einer **überwiegend konsistenten "Feature-Sliced Light" Architektur**. Die Trennung von UI (components/) und Business Logic (hooks/) ist **partiell umgesetzt**, aber nicht vollständig konsequent.

**Hauptbefunde:**
- ✅ **Starke Seiten:** Supabase-Integration (3 Client-Typen), Zustand State Management, konsistente `@/`-Imports, i18n mit next-intl, TypeScript strict mode
- ⚠️ **Kritische Schwachstellen:** 102 useState/useEffect-Vorkommen in Components (sollten stateless sein), 46 relative Imports (../) statt @/, fehlende Middleware für i18n-Routing, API-Route-Organisation
- 🔴 **Architekturverletzungen:** Feature-Sliced Light wird in ~25% der Components verletzt (useState/useEffect direkt in UI-Komponenten)

**Risikobewertung:** 🟡 **MEDIUM** – System funktionsfähig, aber technische Schulden akkumulieren. Refactoring empfohlen vor weiteren großen Features.

---

## Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GEARSHACK WINTERBERRY                            │
│                    Next.js 16 App Router + React 19                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   app/ (1.2M)   │   │ components/ (2.7M)  │   hooks/ (1.3M)  │
    │                 │   │                 │   │                 │
    │ [locale]/       │   │ ui/             │   │ social/         │
    │ ├─ admin/       │   │ gear-editor/    │   │ ai-assistant/   │
    │ ├─ community/   │   │ loadouts/       │   │ inventory/      │
    │ ├─ inventory/   │   │ social/         │   │ messaging/      │
    │ ├─ loadouts/    │   │ messaging/      │   │ bulletin/       │
    │ ├─ merchant/    │   │ ai-assistant/   │   │ shakedowns/     │
    │ └─ ...          │   │ ...             │   │ ...             │
    │                 │   │                 │   │                 │
    │ api/ (71 routes)│   │ ⚠️ 102x useState │   │ ✅ Business Logic│
    │ ├─ mastra/      │   │ ⚠️ 102x useEffect│   │ State Machines  │
    │ ├─ shakedowns/  │   │                 │   │ Data Fetching   │
    │ ├─ sync-catalog/│   │ ⚠️ 46x ../..    │   │ Calculations    │
    │ └─ ...          │   └─────────────────┘   └─────────────────┘
    └─────────────────┘            │                     │
            │                      └──────────┬──────────┘
            │                                 │
            ▼                                 ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    lib/ (1.6M, 162 files)                   │
    │                                                               │
    │  supabase/               ai-assistant/          cloudinary/  │
    │  ├─ client.ts (Browser)  ├─ mastra/             ├─ config.ts│
    │  ├─ server.ts (SSR)      ├─ ai-client.ts        └─ ...      │
    │  ├─ admin-helpers.ts     ├─ prompt-builder.ts                │
    │  ├─ *-queries.ts (19)    └─ ...                              │
    │  └─ transformers.ts                                          │
    │                                                               │
    │  ✅ 8,069 LOC Supabase logic                                 │
    │  ✅ Well-organized service layer                             │
    └─────────────────────────────────────────────────────────────┘
            │
            ▼
    ┌─────────────────────────────────────────────────────────────┐
    │               types/ (717K) - Shared Interfaces              │
    │  database.ts, gear.ts, loadout.ts, messaging.ts, ...        │
    └─────────────────────────────────────────────────────────────┘
            │
            ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    PERSISTENCE LAYER                         │
    │                                                               │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
    │  │   Supabase   │  │   Zustand    │  │  Cloudinary  │      │
    │  │  PostgreSQL  │  │ localStorage │  │  CDN Storage │      │
    │  │   + RLS      │  │   (persist)  │  │  (images)    │      │
    │  └──────────────┘  └──────────────┘  └──────────────┘      │
    └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ZUSTAND STATE STORES (2)                      │
│                                                                   │
│  useCategoriesStore         useSupabaseStore                    │
│  ├─ 24h TTL Cache           ├─ items: GearItem[]               │
│  ├─ fetchCategories()       ├─ loadouts: LoadoutLocal[]        │
│  └─ persist middleware      ├─ addItem(), updateItem(), ...    │
│                              ├─ optimistic updates             │
│                              └─ rollback on error               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Findings by Impact

### 🔴 CRITICAL: Fehlende i18n Middleware

**Impact:** CRITICAL
**Module:** Root-Level (middleware.ts fehlt)
**Beschreibung:**
Next.js-Apps mit `next-intl` benötigen typischerweise eine `middleware.ts` im Root für Locale-Routing ([locale]-Segment). Die App nutzt `next-intl` mit [locale]-Routing (`app/[locale]/`), aber es gibt KEINE `middleware.ts` im Root-Verzeichnis.

**Risiko:**
- Locale-Routing funktioniert möglicherweise nicht korrekt bei direktem Zugriff auf `/` (ohne locale)
- Fehlende Redirects für Default-Locale
- Session-Refresh für Supabase könnte fehlen (siehe Supabase-Docs: "middleware refreshing user sessions")

**Fix:**
1. Erstelle `middleware.ts` im Root mit `createMiddleware` von `next-intl/middleware`
2. Integriere Supabase Session-Refresh (siehe `lib/supabase/server.ts` Kommentar Zeile 74-76)
3. Teste Locale-Switching und Session-Handling

**Aufwand:** 4-6h (inkl. Testing)

---

### 🔴 HIGH: Feature-Sliced Light Verletzungen in Components

**Impact:** HIGH
**Module:** components/ (102 useState/useEffect-Vorkommen)
**Beschreibung:**
Laut CLAUDE.md müssen UI-Komponenten **stateless** sein: "No `useEffect` or complex logic allowed in components." Aktuell haben **102 Files** useState/useEffect-Aufrufe.

**Beispiel-Verletzungen:**
```tsx
// ❌ components/ai-assistant/ChatInterface.tsx
const [voiceEnabled, setVoiceEnabled] = useState(() => { ... });
useEffect(() => { /* Auto-play TTS logic */ }, [messages, ...]);

// ❌ components/gear-editor/ImageUploadZone.tsx
const [isDragOver, setIsDragOver] = useState(false);
const [removeBackground, setRemoveBackground] = useState(true);
useEffect(() => { /* Cleanup logic */ }, []);
```

**Korrekte Architektur (bereits in useMastraChat implementiert):**
```tsx
// ✅ hooks/ai-assistant/useMastraChat.ts
export function useMastraChat() {
  const [messages, setMessages] = useState<MastraMessage[]>([]);
  const [state, setState] = useState<ChatState>('idle');
  // ... alle State-Management-Logik hier
}

// ✅ components/ai-assistant/ChatInterface.tsx (sollte sein)
export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { messages, sendMessage, isStreaming } = useMastraChat();
  return <div>{/* Nur JSX, kein useState */}</div>;
}
```

**Risiko:**
- Code-Duplikation (gleiche Logic in mehreren Components)
- Schwer testbar (Business Logic & UI vermischt)
- Verletzung der Single Responsibility Principle
- Schwierige Refactorings bei State-Changes

**Fix:**
1. Identifiziere die 102 Komponenten mit useState/useEffect
2. Extrahiere Logic in Custom Hooks (z.B. `useImageUpload`, `useVoiceToggle`)
3. Refactor Components zu Pure Components mit Props

**Aufwand:** 40-60h (schrittweise über mehrere Sprints)

---

### 🟡 MEDIUM: Relative Imports statt @/ Alias

**Impact:** MEDIUM
**Module:** components/ (46 Files mit ../ Imports)
**Beschreibung:**
46 Component-Files nutzen relative Imports (`from '../..'` oder `from './'`) statt des konfigurierten `@/` Alias. Dies verstößt gegen CLAUDE.md: "Use `@/*` for absolute imports."

**Beispiele:**
```tsx
// ❌ Gefunden in 46 Files
import { MessageBubble } from './MessageBubble';
import { ConversationView } from '../messaging/ConversationView';

// ✅ Sollte sein
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { ConversationView } from '@/components/messaging/ConversationView';
```

**Risiko:**
- Schwierige Refactorings (Pfade brechen bei File-Moves)
- Inkonsistente Codebase (Mix aus relativen & absoluten Imports)
- Längere Import-Pfade bei tiefer Verschachtelung

**Fix:**
1. ESLint-Regel hinzufügen: `no-restricted-imports` für `../*`
2. Batch-Replace mit Regex: `from ['"]\.\.\/` → `from '@/components/...`
3. Validierung mit `eslint --fix`

**Aufwand:** 2-3h (automatisierbar)

---

### 🟡 MEDIUM: API Route Organization

**Impact:** MEDIUM
**Module:** app/api/ (71 route.ts Files)
**Beschreibung:**
71 API-Routes verteilt auf viele Unterordner (`mastra/`, `shakedowns/`, `sync-catalog/`, etc.). Keine zentrale Service-Layer-Abstraction sichtbar. Routes mischen oft DB-Queries, externe API-Calls und Business Logic.

**Probleme:**
- Keine zentrale Error-Handling-Middleware
- Duplikation von Auth-Checks (siehe `createClient()` in vielen Routes)
- Schwierige Testbarkeit (DB, API, Logic in einer Datei)

**Best Practice:**
```
app/api/
├─ _middleware/          # Shared middleware (auth, error, logging)
├─ _services/            # Reusable service functions
│  ├─ shakedown-service.ts
│  └─ catalog-service.ts
└─ shakedowns/
   └─ route.ts           # Nur Routing-Logic, delegiert an Service
```

**Fix:**
1. Erstelle `app/api/_middleware/` für Auth/Error-Handling
2. Extrahiere Business Logic in `lib/services/`
3. Refactor Routes zu dünnen Controllern

**Aufwand:** 20-30h (schrittweise)

---

### 🟡 MEDIUM: Zustand Store Fragmentierung

**Impact:** MEDIUM
**Module:** hooks/ (useSupabaseStore, useCategoriesStore)
**Beschreibung:**
Nur **2 Zustand Stores** für eine App mit 50+ Features. `useSupabaseStore` hat 577 LOC und mischt Gear Items + Loadouts + Sync State. Mögliche Kandidaten für weitere Stores:
- Messaging (aktuell in hooks/messaging/ als einzelne Hooks)
- Social (aktuell in hooks/social/ als einzelne Hooks)
- Bulletin/Community (aktuell in hooks/bulletin/, hooks/community/)

**Risiko:**
- `useSupabaseStore` wird zu groß (bereits 577 LOC)
- Schwierige Performance-Optimierung (zu viele Re-Renders bei großem Store)
- Zustand-Namespace-Kollisionen bei weiteren Features

**Fix:**
1. Evaluiere, ob Messaging/Social eigene Stores brauchen
2. Splitte `useSupabaseStore` in `useGearStore` + `useLoadoutStore`
3. Nutze Zustand Slices Pattern

**Aufwand:** 8-12h

---

### 🟢 LOW: Supabase Query Files könnten RPC-Funktionen nutzen

**Impact:** LOW
**Module:** lib/supabase/*-queries.ts (19 Files, 8,069 LOC)
**Beschreibung:**
Viele Query-Files haben komplexe Joins und Aggregationen in TypeScript. Supabase unterstützt PostgreSQL Functions (RPC), die Performance-Vorteile bieten könnten.

**Beispiel:**
```typescript
// ❌ Aktuell: Komplexe Joins in TypeScript
const { data } = await supabase
  .from('loadouts')
  .select('*, loadout_items(*, gear_items(*))')
  .eq('user_id', userId);

// ✅ Besser: RPC Function in PostgreSQL
CREATE FUNCTION get_user_loadouts_with_items(user_id UUID)
RETURNS TABLE(...) AS $$
  -- Optimierte Query mit Indexes
$$ LANGUAGE sql;

// TypeScript
const { data } = await supabase.rpc('get_user_loadouts_with_items', { user_id });
```

**Fix:**
1. Profiling: Identifiziere langsame Queries (> 200ms)
2. Migriere zu RPC Functions für Bottlenecks
3. Behalte einfache Queries als TypeScript-Queries

**Aufwand:** 12-16h (Performance-Optimierung)

---

### 🟢 LOW: Missing API Route Type Safety

**Impact:** LOW
**Module:** app/api/**/*.ts
**Beschreibung:**
API-Routes haben keine shared Types mit Frontend. Request/Response-Payloads sind nicht typisiert.

**Beispiel:**
```typescript
// ❌ Aktuell
export async function POST(request: Request) {
  const body = await request.json(); // any type
  const { message, conversationId } = body; // no validation
}

// ✅ Mit Zod Validation
import { z } from 'zod';
const RequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = RequestSchema.parse(await request.json());
  // body is typed!
}
```

**Fix:**
1. Definiere Zod-Schemas in `types/api/`
2. Validiere Request-Bodies in allen API-Routes
3. Exportiere inferred Types für Frontend

**Aufwand:** 8-10h

---

## Positive Findings ✅

### Exzellente Supabase-Integration
- **3 Client-Typen** korrekt implementiert:
  - `createClient()` (Browser) → Cookie-basiert
  - `createClient()` (Server) → SSR-sicher mit Next.js cookies()
  - `createServiceRoleClient()` → Admin-Operationen (bypasses RLS)
- **Query-Organisation:** 19 dedizierte Query-Files (`*-queries.ts`) → 8,069 LOC gut strukturiert
- **Transformers:** `lib/supabase/transformers.ts` für DB ↔ App-Model-Mapping

### Konsistente Import-Aliases
- **@/ Alias** in 86+ Files korrekt verwendet (nur 46 Ausnahmen)
- `tsconfig.json` korrekt konfiguriert: `"@/*": ["./*"]`

### Zustand mit Persist Middleware
- `useSupabaseStore`: localStorage-Sync mit Custom Date-Serialization
- `useCategoriesStore`: 24h TTL Cache mit Zustand Persist
- **useShallow** für Performance-Optimierung (verhindert Re-Renders)

### TypeScript Strict Mode
- `strict: true` in tsconfig.json
- Keine `any` Types (laut CLAUDE.md-Policy)

### i18n mit next-intl
- `messages/en.json`, `messages/de.json` korrekt strukturiert
- `useTranslations()` Hook konsequent genutzt
- **Automated i18n Audit:** `.claude/hooks/i18n-audit.sh` prüft TSX-Files nach hardcoded Strings

### Service Layer (lib/)
- **1.6M Code** gut organisiert in Feature-Ordnern:
  - `ai-assistant/` (Mastra Integration)
  - `supabase/` (Database Abstraction)
  - `cloudinary/` (CDN Upload)
  - `external-apis/` (eBay, SerpAPI, Weather)

---

## Dependency Analysis

### Core Dependencies (Production)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `next` | 16.1.1 | App Router, SSR | ✅ Stable |
| `react` | 19.2.0 | UI Framework | ⚠️ React 19 = Bleeding Edge |
| `@supabase/supabase-js` | 2.87.1 | Database Client | ✅ Stable |
| `@supabase/ssr` | 0.8.0 | SSR Cookie Handling | ✅ Stable |
| `zustand` | 5.0.9 | State Management | ✅ Stable |
| `next-intl` | 4.5.8 | i18n | ✅ Stable |
| `zod` | 4.1.13 | Validation | ⚠️ Zod v4 = Early Adopter |
| `ai` (Vercel AI SDK) | 5.0.114 | AI Integration | ✅ Stable |
| `mastra` | 1.0.1 | Agentic AI | ⚠️ New Library (v1.0) |

### Heavy Dependencies (Potential Bloat)

| Package | Size Impact | Purpose | Recommendation |
|---------|-------------|---------|----------------|
| `@imgly/background-removal` | 🔴 Large (WASM) | Image BG Removal | ✅ Keep (core feature) |
| `@opentelemetry/*` (8 packages) | 🟡 Medium | Observability | ⚠️ Only if APM needed |
| `@sentry/nextjs` | 🟡 Medium | Error Tracking | ✅ Keep |
| `recharts` | 🟡 Medium | Charts | ✅ Keep |
| `react-markdown` | 🟢 Small | Markdown Rendering | ✅ Keep |

### Potential Conflicts

1. **React 19 + Next.js 16:** Beide sind sehr neu. Mögliche Breaking Changes bei Minor Updates.
2. **Zod 4.x:** Erst seit Nov 2025 stabil. Breaking Changes zu v3 (see CLAUDE.md mentions).
3. **Mastra 1.0.x:** Neue Library, API könnte sich noch ändern.

**Recommendation:** Pin exact versions in package.json (`"react": "19.2.0"` statt `"^19.2.0"`) für kritische Deps.

---

## Recommended Actions (Prioritized)

### Immediate (Sprint 1-2)

1. **[CRITICAL]** Erstelle `middleware.ts` für i18n + Supabase Session Refresh
2. **[HIGH]** Fix 46 relative Imports → `@/` Alias (automatisierbar)
3. **[MEDIUM]** Dokumentiere bewusste Architektur-Ausnahmen (wenn useState in Components erlaubt)

### Short-Term (Sprint 3-6)

4. **[HIGH]** Extrahiere Top 10 Components mit useState in Custom Hooks
5. **[MEDIUM]** Splitte `useSupabaseStore` in `useGearStore` + `useLoadoutStore`
6. **[MEDIUM]** Zod-Validation für API Routes (start mit `/api/mastra/chat`)

### Long-Term (Q2 2026)

7. **[HIGH]** Vollständiges Refactoring zu Feature-Sliced Light (alle 102 Components)
8. **[MEDIUM]** Service Layer für API Routes (`app/api/_services/`)
9. **[LOW]** Performance-Optimierung mit PostgreSQL RPC Functions

---

## Conclusion

Gearshack Winterberry ist eine **funktionale, gut strukturierte Anwendung** mit soliden Fundamenten (Supabase, Zustand, i18n). Die **Feature-Sliced Light Architektur ist erkennbar, aber nicht konsistent durchgezogen**.

**Key Takeaway:** Die App ist **production-ready**, aber technische Schulden (useState in Components, fehlende Middleware) sollten adressiert werden, bevor weitere große Features hinzukommen.

**Gesamtbewertung:** 🟡 **7/10** (Gut mit Verbesserungspotenzial)

---

**Generated:** 2026-02-07
**Tool:** Claude Code Architecture Agent
**Review Scope:** Full Codebase (app/, components/, hooks/, lib/, types/)
