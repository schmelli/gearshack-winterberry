# ARCHITECTURE.md - Security & Quality Sprint

**Sprint:** Security Hardening + Quality Gates (P0 + P1)
**Datum:** 2026-02-07
**Referenz:** SPEC.md (13 Tasks: 6x P0, 7x P1)

---

## 1. Komponenten-Diagramm (ASCII)

```
                        +-----------------------------+
                        |        ENTRY POINTS         |
                        +-----------------------------+
                        |                             |
                        v                             v
              +-------------------+         +-------------------+
              | middleware.ts     |         | instrumentation.ts |
              | [NEU - P1-8]     |         | [GEAENDERT - P0-6] |
              +-------------------+         +-------------------+
              | - i18n routing    |         | - Sentry init      |
              | - Supabase        |         | - OpenTelemetry    |
              |   session refresh |         | - validateEnv()    |
              | - Security headers|         |   [NEU]            |
              +--------+----------+         +---------+----------+
                       |                              |
          +------------+------------+                 |
          |            |            |                 |
          v            v            v                 v
  +-------------+ +----------+ +-----------+  +-------------+
  | i18n/       | | lib/     | | lib/      |  | lib/env.ts  |
  | config.ts   | | supabase/| | supabase/ |  | [GEAENDERT  |
  | [UNVERAEND.]| | client.ts| | server.ts |  |  P0-6,P1-9] |
  +-------------+ | [UNVER.] | | [UNVER.]  |  +------+------+
  | i18n/       | +----------+ +-----------+         |
  | request.ts  |                                    |
  | [UNVER.]    |                                    |
  +-------------+                                    |
  | i18n/                                            |
  | navigation.ts                                    |
  | [UNVER.]    |                                    |
  +-------------+                                    |
                                                     |
          +------------------------------------------+
          |
          v
  +------------------+       +-------------------------+
  | lib/rate-limit.ts|       | components/auth/        |
  | [KOMPLETT NEU    |       | AdminRoute.tsx           |
  |  P1-9]           |       | [GEAENDERT - P0-2]      |
  +------------------+       +-------------------------+
  | - Upstash Redis  |       | - Auth re-aktiviert      |
  | - In-Memory      |       | - useIsAdmin() aktiv     |
  |   Fallback       |       | - useAuthContext() aktiv  |
  | - Gleiche API    |       | - LoadingSpinner aktiv    |
  +------------------+       | - AccessDenied aktiv      |
                             +------------+-------------+
                                          |
                      +-------------------+-------------------+
                      |                   |                   |
                      v                   v                   v
              +---------------+   +---------------+   +----------------+
              | hooks/        |   | components/   |   | app/[locale]/  |
              | useIsAdmin.ts |   | auth/Supabase |   | admin/         |
              | [UNVERAEND.]  |   | AuthProvider  |   | layout.tsx     |
              +---------------+   | [UNVERAEND.]  |   | [UNVERAEND.]   |
                                  +---------------+   +----------------+

  +-------------------+       +-------------------+       +-------------------+
  | next.config.ts    |       | package.json      |       | .gitignore        |
  | [GEAENDERT P1-12] |       | [GEAENDERT        |       | [GEAENDERT P0-1]  |
  | - compiler:       |       |  P0-3,P1-7,       |       | - env.txt Eintrag |
  |   removeConsole   |       |  P1-9,P1-11]      |       +-------------------+
  +-------------------+       +-------------------+
                              | - typecheck script |
                              | - husky + lint-    |       +-------------------+
                              |   staged           |       | .husky/pre-commit |
                              | - @upstash deps    |       | [NEU - P1-7]      |
                              | - prepare hook     |       +-------------------+
                              +-------------------+

  +-------------------+       +-------------------+       +-------------------+
  | types/supabase.ts |       | 57 Dateien mit    |       | 20+ Dateien mit   |
  | [REGENERIERT P0-4]|------>| (supabase as any) |       | select('*')       |
  +-------------------+       | [GEAENDERT P0-5]  |       | [GEAENDERT P1-10] |
                              +-------------------+       +-------------------+

  +-------------------+       +-------------------+
  | env.txt           |       | CONTRIBUTING.md   |
  | [GELOESCHT P0-1]  |       | [NEU - P1-13]     |
  +-------------------+       +-------------------+
```

---

## 2. Neue/geaenderte Dateien

### Phase A - Parallel startbar (keine Abhaengigkeiten)

| # | Pfad | Typ | Beschreibung | Aufwand |
|---|------|-----|-------------|---------|
| 1 | `env.txt` | LOESCHEN | `git rm env.txt` + Git-History-Bereinigung via `git filter-repo` oder BFG. Secrets ZUERST beim Provider rotieren. | 2h |
| 2 | `.gitignore` | GEAENDERT | Zeile `env.txt` hinzufuegen nach dem bestehenden `.env*` Block (Zeile 34) | 5min |
| 3 | `components/auth/AdminRoute.tsx` | GEAENDERT | Auskommentierten Auth-Code (Zeilen 45-84) re-aktivieren, Bypass `return <>{children}</>` (Zeile 43) entfernen, `_LoadingSpinner` und `_AccessDenied` umbenennen (Underscore entfernen), fehlende Imports re-aktivieren: `useRouter`, `usePathname`, `useTranslations`, `useEffect`, `toast`, `useAuthContext`, `useIsAdmin` | 1h |
| 4 | `lib/env.ts` | GEAENDERT | (a) Upstash-Env-Variablen als optional hinzufuegen (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). (b) Dev-Mode: Warnung statt Error bei fehlenden optionalen Variablen | 30min |
| 5 | `instrumentation.ts` | GEAENDERT | `validateEnv()` Import aus `@/lib/env` hinzufuegen, Aufruf im `register()` innerhalb des `nodejs`-Blocks. Bei Fehler: Error in Production, Warning in Development. | 30min |
| 6 | `package.json` (scripts) | GEAENDERT | Zeile hinzufuegen: `"typecheck": "tsc --noEmit"` im scripts-Block | 5min |
| 7 | `next.config.ts` | GEAENDERT | `compiler.removeConsole` Block hinzufuegen im `nextConfig`-Objekt (Zeile 8ff). Production: `console.log`/`console.debug` entfernen, `console.warn`/`console.error` beibehalten | 15min |

### Phase B - Nach npm install

| # | Pfad | Typ | Beschreibung | Aufwand |
|---|------|-----|-------------|---------|
| 8 | `package.json` (devDeps) | GEAENDERT | `husky` + `lint-staged` als devDependencies, `"prepare": "husky"` Script | 15min |
| 9 | `.husky/pre-commit` | NEU | Datei mit Inhalt: `npx lint-staged` | 5min |
| 10 | `package.json` (lint-staged) | GEAENDERT | `lint-staged` Konfigurationsblock: `*.{ts,tsx}` -> `eslint --fix`, `*.{ts,tsx,json,md}` -> formatieren | 15min |
| 11 | `types/supabase.ts` | REGENERIERT | `npx supabase gen types typescript --project-id <ref> > types/supabase.ts` - Aktuelle Typen fuer alle Tabellen generieren | 1h |
| 12 | `middleware.ts` | NEU | Zentrale Middleware mit: (a) next-intl Routing via `createMiddleware`, (b) Supabase Session-Refresh via `updateSession`, (c) Security-Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`), (d) Matcher-Config die statische Assets und API-Health ausschliesst | 4h |

### Phase C - Nach Types-Regenerierung

| # | Pfad | Typ | Beschreibung | Aufwand |
|---|------|-----|-------------|---------|
| 13 | 57 Dateien mit `(supabase as any)` | GEAENDERT | Authorization-Audit: Jede Datei pruefen auf fehlende `.eq('user_id', userId)` Filter. `as any` Casts durch typisierte Aufrufe ersetzen. Top-Risiko: `lib/vip/vip-admin-service.ts` (7), `lib/ai-assistant/rate-limiter.ts` (6), `hooks/admin/useAdminFeatureFlags.ts` (5), `components/bulletin/LinkedContentPreview.tsx` (5) | 8h |
| 14 | `lib/rate-limit.ts` | KOMPLETT NEU | Migration von In-Memory auf Upstash Redis. Gleiche API-Signatur (`checkRateLimit()`). Alle 4 Limiter migrieren: `imageGenerationLimiter` (5/h), `shakedownCreationLimiter` (10/h), `shakedownFeedbackLimiter` (30/h), `aiChatLimiter` (50/h). Graceful Degradation: In-Memory-Fallback wenn Redis nicht erreichbar | 4h |
| 15 | `package.json` (deps) | GEAENDERT | `@upstash/ratelimit` + `@upstash/redis` als Dependencies | 5min |
| 16 | `.env.example` | GEAENDERT | `UPSTASH_REDIS_REST_URL=` und `UPSTASH_REDIS_REST_TOKEN=` hinzufuegen | 5min |
| 17 | 20+ Dateien mit `select('*')` | GEAENDERT | Top 20 `select('*')` durch explizite Spalten ersetzen. Priorisiert nach User-Facing API-Routes. Kein PII-Leak. | 6h |

### Phase D - Zum Schluss

| # | Pfad | Typ | Beschreibung | Aufwand |
|---|------|-----|-------------|---------|
| 18 | `CONTRIBUTING.md` | NEU | Abschnitte: Architecture (Feature-Sliced Light), Git Workflow (Branch-Naming, Commit-Conventions), PR Checklist, Development Setup, Testing (Vitest), i18n (next-intl) | 3h |

**Gesamt: ~31h effektiv (13 Tasks)**

---

## 3. Interface-Definitionen

### 3.1 middleware.ts - Signatur und Integration

```typescript
// /home/user/gearshack-winterberry/middleware.ts (NEU)

import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/i18n/config';
import { createServerClient } from '@supabase/ssr';

// next-intl Middleware-Instanz (wiederverwendbar)
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',  // oder 'always' je nach aktuellem Verhalten
});

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  // 1. Supabase Session-Refresh (vor i18n, damit Auth-State aktuell ist)
  //    createServerClient mit request/response Cookie-Handling
  // 2. i18n Routing via intlMiddleware
  // 3. Security Headers auf Response setzen
  //    - X-Frame-Options: DENY
  //    - X-Content-Type-Options: nosniff
  //    - Referrer-Policy: strict-origin-when-cross-origin
  //    - Permissions-Policy: camera=(), microphone=(), geolocation=()
  // 4. Response zurueckgeben
}

export const config = {
  matcher: [
    // Match all pathnames except:
    // - /api (API routes handle their own auth)
    // - /_next/static (static files)
    // - /_next/image (image optimization)
    // - /favicon.ico, /robots.txt, /sitemap.xml
    // - /monitoring (Sentry tunnel - disabled but reserved)
    // - Static asset extensions
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
```

**Integration mit bestehendem Code:**
- `i18n/request.ts` bleibt UNVERAENDERT (Server-side getRequestConfig)
- `i18n/config.ts` bleibt UNVERAENDERT (Locale-Definitionen)
- `i18n/navigation.ts` bleibt UNVERAENDERT (Client-side Navigation)
- `lib/supabase/server.ts` bleibt UNVERAENDERT (der Kommentar in Zeile 73-76 erwaehnt bereits Middleware-Session-Refresh)
- `next.config.ts` Zeile 6: `createNextIntlPlugin('./i18n/request.ts')` bleibt bestehen - die Middleware ergaenzt das Plugin, ersetzt es nicht

**Kritische Randbedingung:** Sentry `tunnelRoute` ist disabled (next.config.ts Zeile 120). Die Middleware darf `/monitoring` nicht matchen.

### 3.2 Rate Limiter - Neues API

```typescript
// /home/user/gearshack-winterberry/lib/rate-limit.ts (KOMPLETT NEU)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---- Typen (GLEICH wie bestehend) ----

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface CheckRateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  error?: string;
}

// ---- Factory mit Redis + In-Memory Fallback ----

function createRateLimiter(
  maxAttempts: number,
  windowMs: number
): { check: (userId: string) => Promise<RateLimitResult> } {
  // Wenn Redis konfiguriert -> Upstash Ratelimit
  // Sonst (Dev/Fallback) -> In-Memory RateLimiter (vereinfacht)
}

// ---- Exportierte Limiter (GLEICHE Namen, GLEICHE Limits) ----

export const imageGenerationLimiter: { check(userId: string): Promise<RateLimitResult> };
export const shakedownCreationLimiter: { check(userId: string): Promise<RateLimitResult> };
export const shakedownFeedbackLimiter: { check(userId: string): Promise<RateLimitResult> };
export const aiChatLimiter: { check(userId: string): Promise<RateLimitResult> };

// ---- Helper (GLEICHE Signatur) ----
// ACHTUNG: check() wird jetzt async! Aufrufer muessen await hinzufuegen.
// Alternativ: Synchrone Wrapper die intern async ausfuehren.

export function checkRateLimit(userId: string): CheckRateLimitResult;
// ODER async:
export async function checkRateLimit(userId: string): Promise<CheckRateLimitResult>;
```

**BREAKING CHANGE Risiko:** Die bestehende `checkRateLimit()` ist synchron. Upstash Redis ist async. Entweder:
- (A) `checkRateLimit` wird `async` -> alle Aufrufer muessen `await` hinzufuegen
- (B) Synchroner Wrapper mit cached Redis-Results
- **Empfehlung:** Option (A) mit `async/await` - alle Aufrufer sind bereits in `async` Route-Handlers

### 3.3 Env Validation API

```typescript
// /home/user/gearshack-winterberry/lib/env.ts (GEAENDERT)

// NEUER Abschnitt im envSchema:
const envSchema = z.object({
  ...aiEnvSchema.shape,
  ...supabaseEnvSchema.shape,
  ...cloudinaryEnvSchema.shape,
  // NEU: Upstash Redis (optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

// GEAENDERT: validateEnv() - Dev vs Production Verhalten
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `- ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      if (process.env.NODE_ENV === 'development') {
        // Development: Warnung, kein Crash
        console.warn(`[ENV] Validation warnings:\n${missingVars}`);
        return {} as Env; // Partial env in dev
      }

      // Production: Hard-Fail
      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
}
```

---

## 4. Datenmodell-Aenderungen

**Keine DB-Schema-Aenderungen.** Alle Aenderungen betreffen nur:
- TypeScript-Typen (`types/supabase.ts` wird regeneriert, nicht das Schema)
- Laufzeit-Konfiguration (Middleware, Env-Validation)
- Build-Konfiguration (package.json, next.config.ts)

Die `select('*')` Ersetzung (P1-10) aendert nur Query-Syntax, nicht das Schema.

---

## 5. Error Handling Strategie

### Pro Aenderung:

| Task | Fehler-Szenario | Handling |
|------|-----------------|----------|
| **P0-1** Secret Rotation | Secrets koennen nicht rotiert werden (Provider-Ausfall) | BLOCKIERT: Deployment bis Rotation abgeschlossen. Kein Fallback moeglich. |
| **P0-2** AdminRoute | `useAuthContext()` nicht verfuegbar (Provider fehlt) | React Error Boundary faengt ab. AdminRoute zeigt LoadingSpinner als Fallback. |
| **P0-2** AdminRoute | `useIsAdmin()` gibt `undefined` zurueck | Default `false` (bereits in `useIsAdmin.ts` Zeile 16 via `?? false`) |
| **P0-2** AdminRoute | Race Condition Auth/Profile Loading | `loading = authLoading \|\| adminLoading \|\| profileLoading` - wartet auf ALLE drei. |
| **P0-3** npm install | Lockfile-Inkonsistenz | `rm -rf node_modules package-lock.json && npm install` |
| **P0-4** Supabase Types | Kein Zugriff auf Supabase-Instanz | Manuelles Typen-File als Fallback. `supabase login` erforderlich. |
| **P0-5** Auth Audit | `as any` Cast kann nicht sicher entfernt werden | Kommentar `// TODO: P2 - requires complex join typing` + Issue erstellen. |
| **P0-6** validateEnv | Fehlende Required-Variablen | Production: Start-Abbruch mit klarer Meldung. Development: `console.warn` + weiter. |
| **P1-7** Pre-Commit | Hook blockiert Commit | Entwickler kann mit `--no-verify` ueberspringen (dokumentiert in CONTRIBUTING.md). |
| **P1-8** Middleware | Middleware-Fehler bei Request | `try/catch` um gesamte Middleware. Bei Fehler: Request durchlassen (fail-open) + Sentry Error. |
| **P1-8** Middleware | Performance >50ms | Monitoring via Sentry Performance. Kein blockierender I/O in Middleware. |
| **P1-9** Rate Limit | Redis nicht erreichbar | Graceful Degradation auf In-Memory RateLimiter. `console.warn` bei Fallback-Aktivierung. |
| **P1-9** Rate Limit | Signatur-Aenderung bricht Aufrufer | `checkRateLimit()` wird async -> alle Aufrufer in API-Routes sind bereits async. |
| **P1-10** select('*') | Fehlende Spalte in expliziter Selektion | TypeScript Compile-Error (nach P0-4 Types). Runtime: Supabase gibt `null` fuer fehlende Spalten. |
| **P1-12** Console Removal | Sentry nutzt console.warn intern | `exclude: ['warn', 'error']` - warn/error bleiben erhalten. |
| **P1-12** Console Removal | withSentryConfig ueberschreibt compiler | Test: `npm run build` + Pruefe ob console.log in Production-Bundle fehlt. |
| **P1-13** CONTRIBUTING.md | Inkonsistenz mit CLAUDE.md | Review-Step: CONTRIBUTING.md gegen CLAUDE.md abgleichen. |

---

## 6. State Management

### Auth-State-Flow Aenderung (P0-2: AdminRoute)

**Vorher (KAPUTT):**
```
Request -> AdminRoute -> return <>{children}</> (KEIN Auth-Check)
```

**Nachher (KORREKT):**
```
Request -> AdminRoute
  |
  +-> loading? -> <LoadingSpinner />
  |
  +-> !user? -> redirect('/login?returnUrl=...')
  |
  +-> !isAdmin? -> toast.error() + redirect('/inventory') + <AccessDenied />
  |
  +-> isAdmin -> <>{children}</>
```

**State-Quellen (UNVERAENDERT):**
- `useAuthContext()` aus `SupabaseAuthProvider` -> `{ user, loading, profile }`
- `useIsAdmin()` aus `hooks/useIsAdmin.ts` -> `{ isAdmin, isLoading }`
- Alle State-Quellen bleiben exakt gleich. Nur `AdminRoute.tsx` wird re-aktiviert.

### Middleware Session-Refresh (P1-8: NEU)

**Vorher:**
```
Request -> Next.js Router -> Server Component/Route Handler
           (kein Session-Refresh in Middleware)
```

**Nachher:**
```
Request -> middleware.ts -> Supabase updateSession() -> i18n Routing -> Response + Security Headers
```

- `lib/supabase/server.ts` Zeilen 73-76 kommentieren bereits: "The `setAll` method was called from a Server Component. This can be ignored if you have middleware refreshing user sessions."
- Die Middleware macht diesen Kommentar zur Realitaet.

### Rate-Limit State (P1-9)

**Vorher:** In-Memory `Map<string, RateLimitEntry>` pro Serverless-Instanz
**Nachher:** Upstash Redis (shared across instances) + In-Memory-Fallback

Kein Einfluss auf Client-Side State Management (Zustand, React State).

---

## 7. IMPLEMENTOR-EMPFEHLUNG (KRITISCH!)

### Analyse der Abhaengigkeiten

```
                Phase A (parallel)          Phase B (nach install)       Phase C (nach Types)      Phase D
                ==================          ======================       ====================      =======

Impl. 1:  P0-1 (Secret Rot.)                                                                      P1-13
          P0-3 (npm install) --------+----> P0-4 (Supabase Types) ----> P0-5 (Auth Audit)
          P1-11 (typecheck) ---------+----> P1-7 (Pre-Commit Hooks)     P1-10 (select('*'))
                                     |
Impl. 2:  P0-2 (AdminRoute)         |
          P0-6 (Env Validation)      +----> P1-8 (Middleware)
          P1-12 (Console Removal)           P1-9 (Rate Limit Redis)
```

### Empfehlung: 2 Implementoren

---

#### IMPLEMENTOR 1: "Infrastructure & Types"

**Rolle:** Verwaltet package.json, Build-Config, Typen-System, Tests, Dokumentation

**Datei-Ownership:**
- `package.json` (EXKLUSIV - wird von P0-3, P1-7, P1-9, P1-11 geaendert)
- `.gitignore`
- `env.txt` (Loeschung)
- `.husky/pre-commit` (neu)
- `types/supabase.ts` (regeneriert)
- `CONTRIBUTING.md` (neu)
- Alle 57 Dateien mit `(supabase as any)` (Audit + Type-Fix)
- Alle 20+ Dateien mit `select('*')` (explizite Spalten)
- `.env.example` (Upstash-Variablen)

**Task-Reihenfolge:**

| Schritt | Task | Abhaengigkeit | Aufwand |
|---------|------|---------------|---------|
| 1a | **P0-1** Secret Rotation: Secrets beim Provider rotieren, `git rm env.txt`, `.gitignore` updaten, Git-History bereinigen | Keine | 2h |
| 1b | **P0-3** `npm install` ausfuehren, verifizieren dass `vitest` laeuft | Keine (parallel zu 1a) | 15min |
| 1c | **P1-11** `"typecheck": "tsc --noEmit"` in package.json scripts | Keine (parallel zu 1a) | 5min |
| 2 | **P0-4** Supabase Types regenerieren via `npx supabase gen types` | Nach P0-3 (npm install) | 1h |
| 3 | **P1-7** husky + lint-staged einrichten: devDeps installieren, `.husky/pre-commit` erstellen, lint-staged Config in package.json, `prepare` Script | Nach P0-3 | 1h |
| 4 | **P0-5** Authorization-Audit: 57 Dateien pruefen, `as any` durch typisierte Aufrufe ersetzen, fehlende user_id-Filter ergaenzen | Nach P0-4 (Types) | 8h |
| 5 | **P1-10** Top 20 `select('*')` durch explizite Spalten ersetzen | Nach P0-4 (Types) | 6h |
| 6 | **P1-13** CONTRIBUTING.md erstellen (dokumentiert alle Aenderungen) | Nach allen anderen Tasks | 3h |

**Geschaetzter Aufwand: ~21h**

---

#### IMPLEMENTOR 2: "Security & Middleware"

**Rolle:** Verwaltet Auth-Logik, Middleware, Rate-Limiting, Runtime-Sicherheit

**Datei-Ownership:**
- `components/auth/AdminRoute.tsx`
- `lib/env.ts`
- `instrumentation.ts`
- `middleware.ts` (neu)
- `lib/rate-limit.ts` (komplett neu)
- `next.config.ts`

**Task-Reihenfolge:**

| Schritt | Task | Abhaengigkeit | Aufwand |
|---------|------|---------------|---------|
| 1a | **P0-2** AdminRoute re-aktivieren: Kommentar-Block (Zeilen 45-84) aktivieren, Bypass (Zeile 43) entfernen, Underscore-Prefix von `_LoadingSpinner`/`_AccessDenied` entfernen, Imports hinzufuegen | Keine | 1h |
| 1b | **P0-6** Env-Validation: `lib/env.ts` um Upstash-Variablen erweitern, Dev-Warnung statt Error, `instrumentation.ts` um `validateEnv()` Aufruf erweitern | Keine (parallel zu 1a) | 1h |
| 1c | **P1-12** Console Removal: `compiler.removeConsole` in `next.config.ts` hinzufuegen | Keine (parallel zu 1a) | 15min |
| 2 | **P1-8** Middleware erstellen: i18n + Supabase Session-Refresh + Security Headers | Nach P0-3 (npm install durch Impl. 1 -- `@supabase/ssr` muss installiert sein) | 4h |
| 3 | **P1-9** Rate Limiting auf Upstash Redis migrieren: `lib/rate-limit.ts` komplett neu schreiben, In-Memory-Fallback, gleiche API | Nach P0-3 (npm install durch Impl. 1) | 4h |

**Geschaetzter Aufwand: ~10h**

**HINWEIS zu package.json:** Implementor 2 benoetigt Aenderungen an `package.json` fuer P1-9 (`@upstash/ratelimit`, `@upstash/redis`). Da package.json EXKLUSIV Implementor 1 gehoert, gibt es zwei Optionen:
- **(A) Empfohlen:** Implementor 1 fuegt die Upstash-Dependencies in Schritt 3 (P1-7) mit ein, da er ohnehin devDeps installiert.
- **(B) Alternativ:** Implementor 2 erstellt einen separaten Commit NUR fuer die Dependency-Aenderung und koordiniert mit Impl. 1.

Gleiches gilt fuer `.env.example` (P1-9): Implementor 1 "besitzt" die Datei, Implementor 2 liefert die zu ergaenzenden Zeilen zu.

---

### Zusammenfassung Datei-Ownership

| Datei | Owner | Tasks |
|-------|-------|-------|
| `package.json` | Impl. 1 | P0-3, P1-7, P1-9*, P1-11 |
| `.gitignore` | Impl. 1 | P0-1 |
| `env.txt` | Impl. 1 | P0-1 (loeschen) |
| `.husky/pre-commit` | Impl. 1 | P1-7 |
| `types/supabase.ts` | Impl. 1 | P0-4 |
| `CONTRIBUTING.md` | Impl. 1 | P1-13 |
| `.env.example` | Impl. 1 | P1-9* |
| 57 Dateien `as any` | Impl. 1 | P0-5 |
| 20+ Dateien `select('*')` | Impl. 1 | P1-10 |
| `components/auth/AdminRoute.tsx` | Impl. 2 | P0-2 |
| `lib/env.ts` | Impl. 2 | P0-6, P1-9 |
| `instrumentation.ts` | Impl. 2 | P0-6 |
| `middleware.ts` | Impl. 2 | P1-8 |
| `lib/rate-limit.ts` | Impl. 2 | P1-9 |
| `next.config.ts` | Impl. 2 | P1-12 |

\* = Implementor 2 liefert Aenderungs-Spezifikation, Implementor 1 fuehrt die Datei-Aenderung durch

---

## 8. Implementierungsplan

### Zeitlicher Ablauf

```
Stunde 0                                                            Stunde 36
|========= Phase A =========|==== Phase B ====|======= Phase C =======|= D =|
|                            |                 |                       |     |
| Impl.1: P0-1, P0-3, P1-11 | P0-4, P1-7      | P0-5, P1-10           |P1-13|
|                            |                 |                       |     |
| Impl.2: P0-2, P0-6, P1-12 | P1-8            | P1-9                  |     |
|                            |                 |                       |     |
```

### Detailplan Implementor 1: "Infrastructure & Types"

```
PHASE A (Stunde 0-3):
  [1a] P0-1: Secret Rotation
       - Secrets bei allen Providern rotieren (Supabase, Serper, GearGraph, DeepSeek, YouTube, Google Maps)
       - git rm env.txt
       - .gitignore: "env.txt" hinzufuegen
       - Git-History bereinigen (git filter-repo / BFG)
       - Team informieren ueber Repo-Force-Push
       OUTPUT: env.txt geloescht, .gitignore aktualisiert, History clean

  [1b] P0-3: npm install (parallel zu 1a)
       - npm install ausfuehren
       - Verifizieren: node_modules/.bin/vitest existiert
       - Verifizieren: npm test -- --run laeuft
       OUTPUT: node_modules installiert, Tests laufen

  [1c] P1-11: Typecheck Script (parallel zu 1a)
       - package.json scripts: "typecheck": "tsc --noEmit"
       - Verifizieren: npm run typecheck laeuft
       OUTPUT: typecheck Script verfuegbar

PHASE B (Stunde 3-8):
  [2] P0-4: Supabase Types regenerieren
      - supabase login (falls noetig)
      - npx supabase gen types typescript --project-id pxtvbgilzzppnbienmot > types/supabase.ts
      - Pruefen ob alle Tabellen abgedeckt sind
      - npm run build -> keine neuen TS-Fehler
      OUTPUT: Aktuelle types/supabase.ts

  [3] P1-7: Pre-Commit Hooks
      - npm install --save-dev husky lint-staged
      - npx husky init
      - .husky/pre-commit: "npx lint-staged"
      - package.json: "prepare": "husky"
      - package.json: lint-staged Config
      - GLEICHZEITIG: @upstash/ratelimit + @upstash/redis als deps (fuer Impl. 2)
      - GLEICHZEITIG: UPSTASH-Variablen in .env.example (fuer Impl. 2)
      - Verifizieren: Commit mit Lint-Fehler wird abgelehnt
      OUTPUT: Pre-commit Hooks aktiv, Upstash-Deps installiert

PHASE C (Stunde 8-24):
  [4] P0-5: Authorization-Audit (8h)
      - 57 Dateien systematisch durchgehen
      - Fuer jede Datei:
        a) "as any" entfernen (nach Types-Update sollten ~80% direkt typisierbar sein)
        b) Pruefen ob .eq('user_id', userId) vorhanden
        c) Falls fehlend: Filter hinzufuegen
        d) Falls nicht entfernbar: Kommentar + Issue
      - Top-Risiko zuerst: vip-admin-service.ts, rate-limiter.ts, useAdminFeatureFlags.ts
      OUTPUT: Audit-Bericht, <=30 verbleibende "as any" Casts

  [5] P1-10: select('*') Ersetzung (6h)
      - 20 priorisierte Dateien durchgehen (siehe SPEC.md Abschnitt P1-10)
      - Fuer jede Datei:
        a) Tabellen-Schema in types/supabase.ts nachschlagen
        b) Nur benoetigte Spalten selektieren
        c) Kein PII (email, phone) in User-Facing Responses
        d) TypeScript-Typen aktualisieren
      - npm run build nach jeder Datei
      OUTPUT: 20 Dateien mit expliziten Spalten, kein PII-Leak

PHASE D (Stunde 24-36):
  [6] P1-13: CONTRIBUTING.md (3h)
      - Abschnitte: Architecture, Git Workflow, PR Checklist, Dev Setup, Testing, i18n
      - Konsistenz mit CLAUDE.md sicherstellen
      - Neue Patterns dokumentieren (Middleware, Pre-Commit, Typecheck)
      OUTPUT: CONTRIBUTING.md erstellt
```

### Detailplan Implementor 2: "Security & Middleware"

```
PHASE A (Stunde 0-3):
  [1a] P0-2: AdminRoute re-aktivieren (1h)
       - components/auth/AdminRoute.tsx:
         a) Zeile 43 entfernen: return <>{children}</>
         b) Zeilen 45-84 (Kommentar-Block) aktivieren
         c) _LoadingSpinner -> LoadingSpinner (Underscore entfernen)
         d) _AccessDenied -> AccessDenied (Underscore entfernen)
         e) Imports hinzufuegen (Zeile 10):
            - import { useRouter, usePathname } from 'next/navigation';
            - import { useTranslations } from 'next-intl';
            - import { useEffect } from 'react';
            - import { toast } from 'sonner';
            - import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
            - import { useIsAdmin } from '@/hooks/useIsAdmin';
         f) _fallback -> fallback (Underscore-Prefix im Parameter entfernen)
       - Verifizieren: Admin-Layout (app/[locale]/admin/layout.tsx) rendert korrekt
       - Verifizieren: Nicht-Admin sieht AccessDenied
       OUTPUT: Admin-Routes geschuetzt

  [1b] P0-6: Env-Validation (1h, parallel zu 1a)
       - lib/env.ts:
         a) UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN als optional hinzufuegen
         b) validateEnv(): Dev-Mode Warning statt Error
       - instrumentation.ts:
         a) import { validateEnv } from '@/lib/env';
         b) Im nodejs-Block: validateEnv() aufrufen
         c) try/catch: Bei Fehler in Production -> throw, in Development -> console.warn
       OUTPUT: Env-Validation beim Start aktiv

  [1c] P1-12: Console Removal (15min, parallel zu 1a)
       - next.config.ts Zeile 8ff (im nextConfig-Objekt):
         compiler: {
           removeConsole: process.env.NODE_ENV === 'production' ? {
             exclude: ['warn', 'error'],
           } : false,
         },
       - Verifizieren: npm run build laeuft, Sentry-Config nicht beeinflusst
       OUTPUT: console.log/debug in Production entfernt

PHASE B (Stunde 3-8):
  [2] P1-8: Middleware erstellen (4h)
      WARTEN AUF: Impl. 1 hat npm install abgeschlossen (P0-3)
      - middleware.ts im Project-Root erstellen:
        a) next-intl createMiddleware Integration
        b) Supabase Session-Refresh via createServerClient + updateSession Pattern
        c) Security Headers (X-Frame-Options, X-Content-Type-Options, etc.)
        d) Matcher Config (statische Assets ausschliessen)
      - i18n/request.ts: PRUEFEN ob Anpassungen noetig (wahrscheinlich nicht)
      - Testen: Locale-Switching funktioniert, Auth-Session refreshed, Headers gesetzt
      - Performance-Test: Middleware < 50ms
      OUTPUT: Zentrale Middleware aktiv

PHASE C (Stunde 8-14):
  [3] P1-9: Rate Limiting Migration (4h)
      WARTEN AUF: Impl. 1 hat Upstash-Dependencies installiert (P1-7)
      - lib/rate-limit.ts komplett neu schreiben:
        a) Upstash Redis Client erstellen (aus UPSTASH_REDIS_REST_URL/TOKEN)
        b) 4 Ratelimit-Instanzen mit Upstash Ratelimit API
        c) In-Memory-Fallback Klasse (vereinfacht, basierend auf altem Code)
        d) Factory: Redis verfuegbar? -> Upstash, sonst -> In-Memory
        e) checkRateLimit() mit gleicher Signatur (oder async)
        f) Graceful Degradation: try/catch um Redis-Calls
      - lib/env.ts: UPSTASH-Variablen bereits in P0-6 hinzugefuegt
      - Alle Aufrufer von checkRateLimit() pruefen (falls async)
      - Testen: Rate Limiting funktioniert mit und ohne Redis
      OUTPUT: Serverless-kompatibles Rate Limiting
```

### Synchronisationspunkte

```
Sync 1: Impl. 1 meldet "npm install fertig" (P0-3)
         -> Impl. 2 kann P1-8 (Middleware) starten

Sync 2: Impl. 1 meldet "Dependencies installiert + .env.example aktualisiert" (P1-7)
         -> Impl. 2 kann P1-9 (Rate Limit) starten

Sync 3: Impl. 2 liefert Upstash-Variablen-Namen an Impl. 1
         -> Impl. 1 traegt sie in package.json (deps) und .env.example ein

Sync 4: Beide fertig
         -> Impl. 1 erstellt CONTRIBUTING.md (P1-13)
         -> Finaler Review beider Implementoren
```

### Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Git-History-Bereinigung bricht offene PRs | Hoch | Mittel | Alle PRs VOR Bereinigung mergen oder schliessen |
| Supabase-Types haben Breaking Changes | Mittel | Hoch | `npm run build` nach jeder Type-Datei-Aenderung |
| Middleware verlangsamt alle Requests | Niedrig | Hoch | Performance-Monitoring, kein blocking I/O |
| Upstash Redis in Dev nicht verfuegbar | Hoch | Niedrig | In-Memory-Fallback bereits eingeplant |
| `as any` Casts koennen nicht alle entfernt werden | Mittel | Niedrig | Ziel: 80% Reduktion, Rest als P2 dokumentiert |
| Pre-Commit Hooks verlangsamen DX | Niedrig | Niedrig | lint-staged laeuft nur auf geaenderte Dateien |
| Sentry withSentryConfig ueberschreibt compiler | Niedrig | Mittel | Test: `npm run build` + Bundle-Analyse |
