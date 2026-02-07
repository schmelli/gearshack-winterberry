# SPEC.md - Security & Quality Sprint (P0 + P1)

**Sprint:** Security Hardening + Quality Gates
**Scope:** P0 (Deploy-Blocker) + P1 (Diese Woche) aus CONSOLIDATED_REVIEW.md
**Geschaetzter Aufwand:** ~36h (12h P0 + 24h P1)
**Datum:** 2026-02-07

---

## 1. Feature-Zusammenfassung

Dieses Sprint behebt 13 priorisierte Findings aus dem Consolidated Code Review: 6 Deploy-Blocker (P0) und 7 High-Priority Items (P1). Die kritischsten Punkte sind ein committeter Supabase Service Role Key in `env.txt`, deaktivierte Admin-Authentifizierung in `AdminRoute.tsx`, und eine kaputte Test-Infrastruktur (vitest nicht in node_modules installiert, 95 Tests koennen nicht ausgefuehrt werden). Dazu kommen fehlende Quality Gates (keine Pre-Commit-Hooks, kein Typecheck-Script, keine Security-Headers, In-Memory Rate Limiting in Serverless-Umgebung).

---

## 2. User Stories

### P0 - Deploy-Blocker

**US-1: Secret-Rotation und Git-History-Bereinigung**
Als Security-Verantwortlicher moechte ich, dass keine Secrets (API-Keys, Service Role Keys) im Git-Repository liegen, damit keine unauthorisierten Zugriffe auf die Datenbank moeglich sind.

**US-2: Admin-Route-Schutz**
Als Admin moechte ich, dass Admin-Routes durch Authentifizierung und Rollenprufung geschuetzt sind, damit nur berechtigte Nutzer auf Admin-Funktionalitaet zugreifen koennen.

**US-3: Test-Infrastruktur reparieren**
Als Entwickler moechte ich, dass `npm test` funktioniert und alle 95 Test-Dateien ausgefuehrt werden, damit ich Code-Aenderungen gegen Regressionen absichern kann.

**US-4: Supabase-Typen regenerieren**
Als Entwickler moechte ich aktuelle Supabase-Typen haben, damit `as any`-Casts eliminiert werden und Type-Safety gewaehrleistet ist.

**US-5: Authorization-Audit fuer Supabase-Casts**
Als Security-Verantwortlicher moechte ich, dass alle `(supabase as any)`-Aufrufe auf fehlende `.eq('user_id')` Filter geprueft werden, damit keine Authorization-Bypasses existieren.

**US-6: Env-Validation aktivieren**
Als Entwickler moechte ich, dass fehlende Umgebungsvariablen beim Start erkannt werden, damit keine kryptischen Runtime-Fehler auftreten.

### P1 - Diese Woche

**US-7: Pre-Commit-Hooks einrichten**
Als Entwickler moechte ich, dass Lint und Typecheck vor jedem Commit automatisch laufen, damit kein kaputter Code committed wird.

**US-8: Next.js Middleware erstellen**
Als Entwickler moechte ich eine zentrale Middleware fuer i18n-Routing, Supabase-Session-Refresh und Security-Headers, damit diese Logik nicht in jeder Route dupliziert wird.

**US-9: Rate Limiting auf Redis migrieren**
Als Security-Verantwortlicher moechte ich, dass Rate Limiting serverless-kompatibel ueber Redis laeuft, damit es ueber alle Instanzen hinweg funktioniert.

**US-10: select('*') durch explizite Spalten ersetzen**
Als Security-Verantwortlicher moechte ich, dass keine unnuetigen Daten (PII) in API-Responses gelangen, und als Performance-Verantwortlicher moechte ich den Payload minimieren.

**US-11: Typecheck-Script hinzufuegen**
Als Entwickler moechte ich `npm run typecheck` ausfuehren koennen, damit TypeScript-Fehler frueh erkannt werden.

**US-12: console.log aus Production entfernen**
Als Security-Verantwortlicher moechte ich, dass keine sensiblen Daten ueber die Browser-Konsole geleakt werden, und als Performance-Verantwortlicher moechte ich den Bundle-Overhead reduzieren.

**US-13: CONTRIBUTING.md erstellen**
Als neuer Entwickler moechte ich eine Onboarding-Dokumentation mit Architektur-Patterns, Git-Workflow und PR-Checklist, damit ich schnell produktiv werde.

---

## 3. Acceptance Criteria

### P0-1: Secret-Rotation und Git-History-Bereinigung

- [ ] AC-1.1: Die Datei `env.txt` ist in `.gitignore` eingetragen
- [ ] AC-1.2: `env.txt` ist aus dem Git-Working-Tree entfernt (`git rm env.txt`)
- [ ] AC-1.3: `env.txt` ist aus der gesamten Git-History entfernt (via `git filter-repo` oder `BFG Repo-Cleaner`)
- [ ] AC-1.4: Alle Secrets aus `env.txt` sind beim Provider rotiert (Supabase Service Role Key, Serper API Key, GearGraph API Key, DeepSeek API Key, YouTube API Key, Memgraph Password, Google Maps API Key)
- [ ] AC-1.5: `.gitignore` enthaelt explizit `env.txt` als Eintrag
- [ ] AC-1.6: `.env.example` enthaelt KEINE echten Secret-Werte (Ist-Zustand: OK - bereits nur Platzhalter)

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/env.txt` (entfernen)
- `/home/user/gearshack-winterberry/.gitignore` (Zeile hinzufuegen: `env.txt`)

**Geaenderte Secrets in `env.txt` (Zeile => Key):**
- Zeile 1: `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDGrrqme3GXKYXMgZ6YVrpwmql7LJVYIPo`
- Zeile 9: `SERPER_API_KEY=abdd6b59c87a9c097b53050a3ed94cd4e6d1e6bc`
- Zeile 11: `GEARGRAPH_API_KEY=a9c8e6b039fddabe48325da3c110f60f77d8aa16c253787ee84c2e76d4628331`
- Zeile 16: `NEXT_PUBLIC_SUPABASE_URL=https://pxtvbgilzzppnbienmot.supabase.co`
- Zeile 17: `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...` (JWT)
- Zeile 19: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBVsH-VWqp_tNNL6yxo0wbi6xFLe4lBShI`
- Zeile 21: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...` (JWT - CRITICAL: bypasses ALL RLS)
- Zeile 23: `DEEPSEEK_API_KEY=sk-500dbfb5d8464bc387145affafc766ea`
- Zeile 25: `MEMGRAPH_USER=memgraph` / Zeile 26: `MEMGRAPH_PASSWORD=geargraph2025`
- Zeile 27: `YOUTUBE_API_KEY=AIzaSyCA5_GpSBwMTMwq3KMxFS162f8PGeXtfCM`

---

### P0-2: Admin-Authentifizierung re-aktivieren

- [ ] AC-2.1: `AdminRoute` in `/home/user/gearshack-winterberry/components/auth/AdminRoute.tsx` prueft Authentication (User muss eingeloggt sein)
- [ ] AC-2.2: `AdminRoute` prueft Admin-Rolle via `useIsAdmin()` Hook (aus `/home/user/gearshack-winterberry/hooks/useIsAdmin.ts`)
- [ ] AC-2.3: Nicht-authentifizierte Nutzer werden auf `/login?returnUrl=...` redirected
- [ ] AC-2.4: Authentifizierte Nicht-Admins sehen AccessDenied-Komponente und werden nach Toast auf `/inventory` redirected
- [ ] AC-2.5: Waehrend Auth-Loading wird ein Spinner angezeigt
- [ ] AC-2.6: Alle 16 Admin-Seiten unter `/app/[locale]/admin/` sind ueber das Admin-Layout (`/home/user/gearshack-winterberry/app/[locale]/admin/layout.tsx`) geschuetzt
- [ ] AC-2.7: Die 6 Admin-API-Routes unter `/app/api/admin/` behalten ihren serverseitigen Check via `checkAdminAccess()` (in `/home/user/gearshack-winterberry/lib/supabase/admin-helpers.ts`)

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/components/auth/AdminRoute.tsx` - Zeile 40-43: Den auskommentierten Auth-Code (Zeile 45-84) re-aktivieren, den Bypass `return <>{children}</>` entfernen. Die Helper-Funktionen `_LoadingSpinner` und `_AccessDenied` umbenennen (Underscore-Prefix entfernen).

**Abhaengigkeiten:**
- `useIsAdmin()` Hook: `/home/user/gearshack-winterberry/hooks/useIsAdmin.ts` - liest `profile.mergedUser?.isAdmin` aus `useAuthContext()`
- `useAuthContext()`: `/home/user/gearshack-winterberry/components/auth/SupabaseAuthProvider.tsx`
- Imports die re-aktiviert werden muessen: `useRouter`, `usePathname` (from `next/navigation`), `useTranslations` (from `next-intl`), `useEffect` (from `react`), `toast` (from `sonner`), `useAuthContext`, `useIsAdmin`

---

### P0-3: Test-Infrastruktur reparieren

- [ ] AC-3.1: `npm install` wird ausgefuehrt und `node_modules/.bin/vitest` existiert danach
- [ ] AC-3.2: `npm test -- --run` fuehrt alle Tests aus und beendet sich ohne "vitest: not found" Fehler
- [ ] AC-3.3: Test-Ergebnisse zeigen mind. 95 Test-Dateien erkannt (aktuell: 95 Test-Dateien in `__tests__/`)
- [ ] AC-3.4: `vitest.config.ts` referenziert `vitest.setup.ts` korrekt (Ist-Zustand: OK)
- [ ] AC-3.5: `vitest.setup.ts` importiert `@testing-library/jest-dom` (Ist-Zustand: OK)

**Ist-Zustand:**
- `package.json` enthaelt `vitest: ^4.0.16` in devDependencies (Zeile 124)
- `node_modules/` Verzeichnis ist leer oder nicht vorhanden - `node_modules/.bin/vitest` fehlt
- `npm test -- --run` ergibt: `sh: 1: vitest: not found`
- `npx vitest --version` gibt `vitest/4.0.18` zurueck (funktioniert ueber npx, nicht ueber npm scripts)

**Root Cause:** `node_modules` wurde nicht installiert oder wurde geloescht. Ein einfaches `npm install` sollte das Problem beheben.

**Betroffene Dateien:**
- Keine Code-Aenderungen noetig - nur `npm install` ausfuehren

---

### P0-4: Supabase-Typen regenerieren

- [ ] AC-4.1: `npx supabase gen types typescript --project-id <project-ref> > types/supabase.ts` generiert aktuelle Typen
- [ ] AC-4.2: Die generierten Typen decken alle genutzten Tabellen ab: `gear_items`, `loadouts`, `profiles`, `categories`, `generated_images`, `friend_requests`, `friendships`, `user_follows`, `friend_activities`, `notifications`, `bulletin_posts`, `conversations`, `messages`, `resellers`, `shakedowns`, `shakedown_feedback`, `merchant_locations`, etc.
- [ ] AC-4.3: Mindestens 80% der bestehenden `as any` Casts koennen entfernt werden (von ~150+ auf <30)
- [ ] AC-4.4: `npm run build` laeuft ohne neue TypeScript-Fehler durch

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/types/supabase.ts` (neu generiert)
- 57 Dateien mit `(supabase as any)` Casts (Top-Kandidaten siehe Liste der 57 Dateien aus Grep-Suche oben)

---

### P0-5: Authorization-Audit fuer (supabase as any) Casts

- [ ] AC-5.1: Alle 57 Dateien mit `(supabase as any)` wurden auditiert
- [ ] AC-5.2: Jede Query-Datei wurde auf fehlende `.eq('user_id', userId)` Filter geprueft
- [ ] AC-5.3: Fehlende user_id-Filter wurden ergaenzt wo noetig
- [ ] AC-5.4: Ein Audit-Report mit den Ergebnissen liegt vor (als Kommentare in den Dateien oder als separate Checkliste)
- [ ] AC-5.5: Keine API-Route erlaubt Zugriff auf Daten anderer User ohne RLS oder expliziten Filter

**Betroffene Dateien (57 Dateien - Top-Risiko):**
- `/home/user/gearshack-winterberry/lib/vip/vip-admin-service.ts` (7 Casts)
- `/home/user/gearshack-winterberry/lib/ai-assistant/rate-limiter.ts` (6 Casts)
- `/home/user/gearshack-winterberry/hooks/admin/useAdminFeatureFlags.ts` (5 Casts)
- `/home/user/gearshack-winterberry/components/bulletin/LinkedContentPreview.tsx` (5 Casts)
- `/home/user/gearshack-winterberry/app/[locale]/vip/[slug]/[loadoutSlug]/page.tsx` (4 Casts)
- Alle weiteren 52 Dateien mit 1-2 Casts

**Hinweis:** Diese Aufgabe hat eine starke Abhaengigkeit zu P0-4 (Typen-Regenerierung). Nach der Typen-Regenerierung werden die meisten `as any` Casts unnoetig und der Audit wird klarer.

---

### P0-6: Env-Validation beim Start aktivieren

- [ ] AC-6.1: `validateEnv()` aus `/home/user/gearshack-winterberry/lib/env.ts` wird beim Serverstart aufgerufen
- [ ] AC-6.2: Bei fehlenden Required-Variablen bricht der Start mit klarer Fehlermeldung ab
- [ ] AC-6.3: Optional-Variablen (ANTHROPIC_API_KEY, SERPER_API_KEY, etc.) verursachen KEINEN Fehler wenn sie fehlen
- [ ] AC-6.4: In Development-Mode wird eine Warnung statt eines Errors ausgegeben

**Betroffene Dateien:**
- Neue Datei oder bestehende Datei fuer den Import: z.B. `/home/user/gearshack-winterberry/app/layout.tsx` oder `instrumentation.ts` (Next.js Instrumentation Hook)
- `/home/user/gearshack-winterberry/lib/env.ts` - bereits implementiert, nur Import fehlt

**Implementierung:** Entweder:
- Option A: In `instrumentation.ts` (Next.js 16 Instrumentation Hook) - empfohlen
- Option B: In `app/layout.tsx` als Server Component Side-Effect
- Option C: In `next.config.ts` als Top-Level-Import (Risiko: bricht den Build wenn Env nicht gesetzt)

---

### P1-7: Pre-Commit-Hooks (husky + lint-staged)

- [ ] AC-7.1: `husky` und `lint-staged` sind als devDependencies installiert
- [ ] AC-7.2: `npx husky init` wurde ausgefuehrt, `.husky/` Verzeichnis existiert
- [ ] AC-7.3: `.husky/pre-commit` fuehrt `npx lint-staged` aus
- [ ] AC-7.4: `lint-staged` Konfiguration in `package.json` definiert:
  - `*.{ts,tsx}`: `eslint --fix` + `tsc-files --noEmit` (oder `tsc --noEmit` auf geaenderte Dateien)
  - `*.{ts,tsx,json,md}`: `prettier --write` (falls Prettier verwendet wird)
- [ ] AC-7.5: Ein Commit mit einem Lint-Fehler wird abgelehnt
- [ ] AC-7.6: `prepare` Script in package.json: `"prepare": "husky"`

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/package.json` - neue devDependencies + Scripts + lint-staged Config
- `/home/user/gearshack-winterberry/.husky/pre-commit` (neu)

---

### P1-8: Next.js Middleware erstellen

- [ ] AC-8.1: `/home/user/gearshack-winterberry/middleware.ts` existiert im Project-Root
- [ ] AC-8.2: i18n-Routing wird ueber die Middleware gehandhabt (Integration mit next-intl)
- [ ] AC-8.3: Supabase Session-Refresh laeuft in der Middleware (via `@supabase/ssr` `updateSession`)
- [ ] AC-8.4: Security-Headers werden gesetzt: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- [ ] AC-8.5: `matcher` Config schliesst statische Assets und API-Health-Routes aus
- [ ] AC-8.6: Die Middleware laeuft in unter 50ms (Performance-Anforderung aus Cross-Review)

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/middleware.ts` (neu erstellen)
- Moeglicherweise `/home/user/gearshack-winterberry/i18n/request.ts` (Anpassung fuer Middleware-Integration)
- Moeglicherweise `/home/user/gearshack-winterberry/next.config.ts` (Entfernung redundanter Header-Config falls vorhanden)

---

### P1-9: Rate Limiting auf Upstash Redis migrieren

- [ ] AC-9.1: `@upstash/ratelimit` und `@upstash/redis` sind als Dependencies installiert
- [ ] AC-9.2: `/home/user/gearshack-winterberry/lib/rate-limit.ts` verwendet Upstash Redis statt In-Memory Map
- [ ] AC-9.3: Alle 4 vorhandenen Rate-Limiter-Instanzen sind migriert:
  - `imageGenerationLimiter` (5/h)
  - `shakedownCreationLimiter` (10/h)
  - `shakedownFeedbackLimiter` (30/h)
  - `aiChatLimiter` (50/h)
- [ ] AC-9.4: `checkRateLimit()` Helper-Funktion behalt die gleiche Signatur
- [ ] AC-9.5: Fallback auf In-Memory wenn Redis nicht erreichbar (Graceful Degradation)
- [ ] AC-9.6: `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN` in `.env.example` dokumentiert
- [ ] AC-9.7: In Development kann weiterhin ohne Redis gearbeitet werden (In-Memory Fallback)

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/lib/rate-limit.ts` (komplett umschreiben, Zeilen 1-244)
- `/home/user/gearshack-winterberry/package.json` (neue Dependencies)
- `/home/user/gearshack-winterberry/.env.example` (neue Variablen)
- `/home/user/gearshack-winterberry/lib/env.ts` (optionale Upstash-Env-Variablen hinzufuegen)

---

### P1-10: Top 20 select('*') durch explizite Spalten ersetzen

- [ ] AC-10.1: Die 20 haeufigsten `select('*')` in User-Facing API-Routes sind durch explizite Spalten ersetzt
- [ ] AC-10.2: Keine PII-Felder (Email, Phone, etc.) werden unnoetig zurueckgegeben
- [ ] AC-10.3: Alle betroffenen API-Routes funktionieren weiterhin korrekt (keine fehlenden Felder)
- [ ] AC-10.4: TypeScript-Typen sind aktualisiert um die Partial-Responses zu reflektieren

**Betroffene Dateien (Top 20 von 60 Dateien, priorisiert nach User-Facing API-Routes):**
1. `/home/user/gearshack-winterberry/app/api/shakedowns/route.ts` (2 Vorkommen, Zeilen 238, 506)
2. `/home/user/gearshack-winterberry/app/api/shakedowns/[id]/route.ts` (2 Vorkommen, Zeilen 127, 338)
3. `/home/user/gearshack-winterberry/app/api/shakedowns/bookmarks/route.ts` (4 Vorkommen, Zeilen 249, 289, 426, 448)
4. `/home/user/gearshack-winterberry/app/api/shakedowns/bookmarks/[id]/route.ts` (2 Vorkommen, Zeilen 306, 321)
5. `/home/user/gearshack-winterberry/app/api/shakedowns/feedback/route.ts` (1 Vorkommen, Zeile 395)
6. `/home/user/gearshack-winterberry/app/api/shakedowns/feedback/[id]/route.ts` (2 Vorkommen, Zeilen 185, 250)
7. `/home/user/gearshack-winterberry/app/api/resellers/search/route.ts` (2 Vorkommen, Zeilen 138, 185)
8. `/home/user/gearshack-winterberry/app/api/settings/exchange-rates/route.ts` (1 Vorkommen, Zeile 31)
9. `/home/user/gearshack-winterberry/app/api/price-tracking/track/route.ts` (1 Vorkommen, Zeile 41)
10. `/home/user/gearshack-winterberry/app/api/price-tracking/search/route.ts` (1 Vorkommen, Zeile 99)
11. `/home/user/gearshack-winterberry/app/api/price-tracking/search/confirm-match/route.ts` (1 Vorkommen, Zeile 46)
12. `/home/user/gearshack-winterberry/app/api/ebay-search/route.ts` (1 Vorkommen, Zeile 103)
13. `/home/user/gearshack-winterberry/app/api/gear-items/apply-enrichment/route.ts` (1 Vorkommen)
14-20: Top-Hooks mit `select('*')`:
  - `/home/user/gearshack-winterberry/hooks/useSupabaseProfile.ts`
  - `/home/user/gearshack-winterberry/hooks/useFeatureFlags.ts`
  - `/home/user/gearshack-winterberry/hooks/admin/useAdminFeatureFlags.ts`
  - `/home/user/gearshack-winterberry/hooks/settings/useCurrencyFormat.ts`
  - `/home/user/gearshack-winterberry/hooks/price-tracking/usePriceAlerts.ts`
  - `/home/user/gearshack-winterberry/hooks/wiki/useWikiEditor.ts`
  - `/home/user/gearshack-winterberry/hooks/wiki/useWikiCategories.ts`

---

### P1-11: npm run typecheck Script hinzufuegen

- [ ] AC-11.1: `package.json` enthaelt Script `"typecheck": "tsc --noEmit"`
- [ ] AC-11.2: `npm run typecheck` fuehrt den TypeScript Compiler im Check-Modus aus
- [ ] AC-11.3: Der Exit-Code ist 0 bei Erfolg und non-zero bei Fehlern
- [ ] AC-11.4: tsconfig.json `exclude` Array ist korrekt konfiguriert (aktuell: `["node_modules", "specs", "__tests__", "**/*.test.ts", "**/*.test.tsx"]`)

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/package.json` Zeile 9-18 (scripts-Block): Neue Zeile `"typecheck": "tsc --noEmit"` hinzufuegen

---

### P1-12: console.log aus Production entfernen

- [ ] AC-12.1: `next.config.ts` enthaelt `compiler.removeConsole` Konfiguration fuer Production
- [ ] AC-12.2: In Production werden `console.log` und `console.debug` entfernt
- [ ] AC-12.3: `console.warn` und `console.error` bleiben erhalten (fuer Fehler-Monitoring)
- [ ] AC-12.4: In Development bleiben alle Console-Methoden verfuegbar
- [ ] AC-12.5: Der existierende structured Logger (`lib/utils/logger.ts`) wird als Alternative dokumentiert

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/next.config.ts` Zeile 8 (nextConfig-Objekt): Hinzufuegen:
  ```typescript
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['warn', 'error'],
    } : false,
  },
  ```

**Hinweis:** Da Sentry/Next.js 16 im Einsatz ist, muss geprueft werden ob `withSentryConfig()` die `compiler`-Option durchreicht.

---

### P1-13: CONTRIBUTING.md erstellen

- [ ] AC-13.1: `/home/user/gearshack-winterberry/CONTRIBUTING.md` existiert
- [ ] AC-13.2: Enthaelt Abschnitt "Architecture" mit Feature-Sliced Light Erklaerung
- [ ] AC-13.3: Enthaelt Abschnitt "Git Workflow" mit Branch-Naming, Commit-Conventions
- [ ] AC-13.4: Enthaelt Abschnitt "PR Checklist" mit Quality-Gates
- [ ] AC-13.5: Enthaelt Abschnitt "Development Setup" mit Schritt-fuer-Schritt Anleitung
- [ ] AC-13.6: Enthaelt Abschnitt "Testing" mit Vitest-Instruktionen
- [ ] AC-13.7: Enthaelt Abschnitt "i18n" mit next-intl Regeln
- [ ] AC-13.8: Ist konsistent mit CLAUDE.md Inhalten

**Betroffene Dateien:**
- `/home/user/gearshack-winterberry/CONTRIBUTING.md` (neu erstellen)

---

## 4. Edge Cases und Fehlerszenarien

### P0-1: Secret-Rotation
- **Edge Case:** `git filter-repo` aendert alle Commit-Hashes. Alle offenen Branches und PRs muessen rebased werden.
- **Risiko:** Andere Entwickler haben moeglicherweise die alten Secrets lokal im Cache. Alle Team-Mitglieder muessen informiert werden.
- **Risiko:** Die Secrets koennten bereits extrahiert und missbraucht worden sein. Insbesondere der `SUPABASE_SERVICE_ROLE_KEY` erlaubt vollen DB-Zugriff unter Umgehung aller RLS Policies.
- **Mitigation:** Secrets ZUERST beim Provider rotieren, DANN aus Git entfernen.

### P0-2: Admin-Auth Re-Aktivierung
- **Edge Case:** `useIsAdmin()` haengt von `useAuthContext()` ab. Wenn der SupabaseAuthProvider nicht korrekt wrapped, crasht die App.
- **Edge Case:** Race Condition: Auth-Loading und Profile-Loading laufen asynchron. Der auskommentierte Code hat dies korrekt behandelt (`const loading = authLoading || adminLoading || profileLoading`).
- **Risiko:** Die Admin-API-Routes unter `/api/admin/` haben einen eigenen serverseitigen Check via `checkAdminAccess()`. Der Client-seitige AdminRoute-Check und der serverseitige Check muessen konsistent sein.
- **Edge Case:** Falls `profile.mergedUser?.isAdmin` undefined ist (z.B. bei neuem User ohne Profil), muss der Default `false` sein (ist korrekt implementiert in `useIsAdmin.ts` Zeile 16).

### P0-3: Test-Infrastruktur
- **Edge Case:** `npm install` kann wegen Lockfile-Inkonsistenz fehlschlagen. In dem Fall `rm -rf node_modules package-lock.json && npm install` ausfuehren.
- **Risiko:** Einige Tests koennten fehlschlagen weil sie nie ausgefuehrt wurden. Das ist akzeptabel - Ziel ist "Tests laufen", nicht "alle Tests bestehen".
- **Edge Case:** `vitest.config.ts` referenziert `vitest.setup.ts` und `__mocks__/next/navigation.ts`. Beide Dateien muessen existieren.

### P0-4: Supabase-Typen
- **Edge Case:** Die Typen-Generierung braucht Zugriff auf die Supabase-Instanz (via `SUPABASE_ACCESS_TOKEN` oder Login). Falls nicht verfuegbar, muss manuell gearbeitet werden.
- **Risiko:** Generierte Typen koennten Breaking Changes fuer bestehenden Code verursachen. Jede Datei die `as any` entfernt braucht manuelle Pruefung.
- **Edge Case:** Einige `as any` Casts sind legitim (z.B. fuer dynamische Queries oder PostgREST Joins die nicht typbar sind).

### P1-8: Middleware
- **Edge Case:** Middleware laeuft bei JEDEM Request. Performance ist kritisch - niemals blockierende Operationen.
- **Risiko:** Falsche Matcher-Konfiguration kann statische Assets blocken oder API-Routes verlangsamen.
- **Edge Case:** Sentry `tunnelRoute` ist disabled wegen Konflikten mit `[locale]` Routing. Die neue Middleware muss dieses Problem nicht verschaerfen.
- **Edge Case:** next-intl hat eigene Middleware (`createMiddleware`). Die muss mit Supabase-Session-Refresh und Security-Headers zusammenarbeiten.

### P1-9: Rate Limiting Migration
- **Edge Case:** In lokaler Entwicklung ohne Redis-Zugang muss ein In-Memory-Fallback greifen.
- **Risiko:** Waehrend der Migration koennten Rate Limits kurzzeitig nicht greifen. Deployment sollte atomar sein.
- **Edge Case:** Die bestehende `checkRateLimit()` Funktion hat eine feste Signatur die von API-Routes verwendet wird. Die Signatur darf sich NICHT aendern.

### P1-12: Console Removal
- **Edge Case:** `withSentryConfig()` Wrapper koennte die `compiler`-Option ueberschreiben. Testen ob beide koexistieren.
- **Risiko:** Sentry selbst nutzt `console.warn` - muss erhalten bleiben.

---

## 5. Nicht-funktionale Anforderungen

### Security
- Alle rotierten Secrets muessen Provider-seitig invalidiert sein BEVOR der Code deployed wird
- Kein Secret darf in Git-History, Logs, oder Client-Bundles auftauchen
- Admin-Routes muessen sowohl client-seitig (AdminRoute) als auch server-seitig (checkAdminAccess) geschuetzt sein
- Rate Limiting muss ueber alle Serverless-Instanzen hinweg funktionieren

### Performance
- Middleware-Ausfuehrung unter 50ms (p99)
- `select('*')` Ersetzung soll Payload-Groesse um mind. 30% reduzieren fuer betroffene Endpoints
- Pre-Commit-Hook-Laufzeit unter 10 Sekunden fuer typische Commits
- `npm run typecheck` unter 60 Sekunden

### Backward Compatibility
- Alle bestehenden API-Signaturen bleiben erhalten (Rate Limit, etc.)
- Kein Breaking Change fuer Frontend-Komponenten die `AdminRoute` verwenden
- `.env.example` behaelt alle bestehenden Variablen, neue werden nur hinzugefuegt
- Bestehende Test-Dateien muessen unmodifiziert laufen koennen

### Testing
- Nach P0-3: `npm test -- --run` muss mit Exit-Code 0 beenden (oder nur erwartete Failures)
- Jede P0/P1 Aenderung soll durch mindestens einen existierenden oder neuen Test abgedeckt sein

---

## 6. Abgrenzung - NICHT Teil dieses Sprints

Folgende Items aus dem Consolidated Review sind explizit **NICHT** im Scope:

### P2 Items (Diesen Sprint - spaeter)
- **#14:** Pagination fuer Inventory, Loadouts, Social Feeds (~8h)
- **#15:** API-Route-Tests schreiben (~16h)
- **#16:** Verbleibende `as any` Casts eliminieren nach Typen-Regenerierung (~8h)
- **#17:** React.memo fuer List-Komponenten (GearCard, ConversationItem) (~3h)
- **#18:** CSP + erweiterte Security-Headers (~3h) - Basis-Headers sind in P1-8 enthalten
- **#19:** Error Boundaries fuer Route-Segmente (~6h)

### P3 Items (Backlog)
- **#20:** God Files splitten (5 Dateien >1000 LOC) (~10h)
- **#21:** 102 Komponenten mit useState zu Custom Hooks refactoren (~40-60h)
- **#22:** WASM Background-Removal in Web Worker verschieben (~8-12h)
- **#23:** Caching-Strategie implementieren (~12-16h)
- **#24:** useSupabaseStore splitten (~8-12h)
- **#25:** E2E-Tests mit Playwright (~12h)
- **#26:** 46 relative Imports fixen (~2-3h)
- **#27:** Grosse Hooks splitten (~8h)
- **#28:** Komplexe Queries zu PostgreSQL RPC migrieren (~12-16h)
- **#29:** Conventional Commits + PR Template (~1.5h)
- **#30:** Dependabot/Renovate einrichten (~0.5h)

### Explizit ausgeschlossen:
- Refactoring bestehender Architektur
- Neue Features
- UI-Aenderungen (ausser AdminRoute AccessDenied-Seite die bereits existiert)
- Datenbank-Schema-Aenderungen
- Deployment-Pipeline / CI/CD Setup (ausser Pre-Commit-Hooks)

---

## 7. Abhaengigkeiten und Reihenfolge

### Abhaengigkeitsgraph

```
P0-1 (Secret Rotation)     [UNABHAENGIG - sofort starten]
  |
  v
P0-3 (npm install)         [UNABHAENGIG - sofort starten]
  |
  v
P0-4 (Supabase Types)      [HAENGT AB VON: P0-3 (npm install fuer npx supabase)]
  |
  v
P0-5 (Auth Audit)          [HAENGT AB VON: P0-4 (Types muessen erst generiert sein)]
  |
P0-2 (Admin Auth)          [UNABHAENGIG - kann parallel zu P0-3/4 laufen]
  |
P0-6 (Env Validation)      [UNABHAENGIG - kann parallel laufen]

P1-11 (typecheck Script)   [UNABHAENGIG - trivial, sofort machbar]
  |
  v
P1-7 (Pre-Commit Hooks)    [HAENGT AB VON: P0-3 (npm install), P1-11 (typecheck)]
  |
P1-12 (Console Removal)    [UNABHAENGIG]
  |
P1-8 (Middleware)           [HAENGT AB VON: P0-3 (npm install fuer @supabase/ssr)]
  |
P1-9 (Redis Rate Limit)    [HAENGT AB VON: P0-3 (npm install)]
  |
P1-10 (select('*'))        [HAENGT AB VON: P0-4 (Types fuer explizite Spaltenauswahl)]
  |
P1-13 (CONTRIBUTING.md)    [HAENGT AB VON: Allen anderen P0/P1 (dokumentiert finalen Stand)]
```

### Empfohlene Reihenfolge

**Phase A - Parallel startbar (Stunde 1-3):**
1. P0-1: Secret Rotation (extern beim Provider + git rm env.txt + .gitignore)
2. P0-3: `npm install` (1 Befehl)
3. P0-2: AdminRoute re-aktivieren (Code-Uncomment + Cleanup)
4. P0-6: validateEnv() Import hinzufuegen
5. P1-11: typecheck Script (1 Zeile in package.json)
6. P1-12: console.log Removal Config (3 Zeilen in next.config.ts)

**Phase B - Nach npm install (Stunde 3-8):**
7. P0-4: Supabase Types regenerieren
8. P1-7: Pre-Commit Hooks einrichten (husky + lint-staged)
9. P1-8: Middleware erstellen

**Phase C - Nach Types (Stunde 8-24):**
10. P0-5: Authorization Audit (57 Dateien pruefen)
11. P1-9: Rate Limiting Migration
12. P1-10: Top 20 select('*') ersetzen

**Phase D - Zum Schluss (Stunde 24-36):**
13. P1-13: CONTRIBUTING.md erstellen (dokumentiert alles was sich geaendert hat)

### Dateien nach Aenderungshaeufigkeit

| Datei | Wird geaendert in |
|-------|-------------------|
| `package.json` | P0-3, P1-7, P1-9, P1-11 |
| `.env.example` | P1-9 |
| `.gitignore` | P0-1 |
| `next.config.ts` | P1-12 |
| `components/auth/AdminRoute.tsx` | P0-2 |
| `lib/rate-limit.ts` | P1-9 |
| `lib/env.ts` | P0-6, P1-9 |
| `types/supabase.ts` | P0-4 |
| `middleware.ts` | P1-8 (neu) |
| `CONTRIBUTING.md` | P1-13 (neu) |
| `.husky/pre-commit` | P1-7 (neu) |
| `env.txt` | P0-1 (loeschen) |
| 57 Dateien mit `(supabase as any)` | P0-4, P0-5 |
| 20+ Dateien mit `select('*')` | P1-10 |
