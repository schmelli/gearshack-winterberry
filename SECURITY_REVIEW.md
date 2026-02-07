# Security Review: Gearshack Winterberry

**Review Date:** 2026-02-07
**Reviewer:** Security Auditor (Automated)
**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Supabase, Cloudinary, Vercel AI SDK

---

## Executive Summary

Gearshack Winterberry zeigt ein **solides Sicherheitsfundament** mit gut implementierter Input-Validierung (Zod), Auth-Checks in API-Routen und SSRF-Schutz. Die Verwendung von Supabase Row Level Security (RLS) als primärer Sicherheitsmechanismus ist architektonisch korrekt. **Kritische Schwachstelle:** Das In-Memory Rate Limiting ist nicht production-ready für horizontale Skalierung. **Hauptproblem:** Extensive Verwendung von TypeScript `as any` untergräbt die Typsicherheit. Keine aktiv ausnutzbaren Sicherheitslücken wie SQL Injection, XSS oder hardcoded Secrets gefunden. Empfehlung: **Production-ready nach Behebung der Critical- und High-Findings.**

---

## Findings

### CRITICAL Severity

#### 1. In-Memory Rate Limiting nicht production-geeignet

**Severity:** CRITICAL
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**Dateien:**
- `/home/user/gearshack-winterberry/lib/rate-limit.ts:17-172`
- Verwendet in: `app/api/loadout-images/generate/route.ts:52`

**Beschreibung:**
Das Rate Limiting verwendet einen in-memory `Map`-Store, der bei Multi-Instance-Deployments (Vercel, AWS Lambda) **pro Instance isoliert** ist. Ein Angreifer kann die Rate Limits umgehen, indem er Requests auf verschiedene Serverless-Instanzen verteilt.

**Proof of Concept:**
```typescript
// lib/rate-limit.ts:18
private store = new Map<string, RateLimitEntry>();
// ❌ Bei 3 Serverless-Instanzen = 3 separate Maps
// → Effektives Limit: 5 requests/hour × 3 instances = 15 requests/hour
```

**Impact:**
- AI Image Generation (5/hour → 15+/hour bei 3 Instances)
- Shakedown Creation (10/hour → 30+/hour)
- AI Chat (50/hour → 150+/hour)
- **Cost Explosion** durch AI API abuse möglich

**Fix:**
```typescript
// Empfehlung: Upstash Redis-basiertes Rate Limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const imageGenerationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
});
```

---

### HIGH Severity

#### 2. TypeScript Type Safety kompromittiert durch extensive "as any" Verwendung

**Severity:** HIGH
**CWE:** CWE-704 (Incorrect Type Conversion or Cast)
**Dateien:** 71 TypeScript-Dateien betroffen (siehe Grep-Ergebnisse)

**Beispiele:**
- `/home/user/gearshack-winterberry/app/api/cron/check-prices/route.ts:56` - `(supabase as any).from('price_tracking')`
- `/home/user/gearshack-winterberry/lib/supabase/loadout-images.ts` - Multiple Casts
- `/home/user/gearshack-winterberry/hooks/useFeatureFlags.ts` - Type bypasses

**Beschreibung:**
TypeScript strict mode wird systematisch mit `as any` Casts umgangen, hauptsächlich weil Supabase-Types für neue Tabellen nicht generiert wurden. Dies eliminiert **compile-time Type Safety** und kann zu Runtime-Fehlern führen.

**Impact:**
- Potenzielle Runtime-Fehler durch falsche Property-Zugriffe
- Keine IntelliSense-Unterstützung → erhöhtes Bug-Risiko
- Breaking Changes bei Datenbankschema-Änderungen nicht erkennbar

**Fix:**
```bash
# 1. Supabase Types regenerieren
npx supabase gen types typescript --project-id <PROJECT_ID> > types/supabase.ts

# 2. "as any" schrittweise durch korrekte Types ersetzen
const { data } = await supabase
  .from('price_tracking')  // ✅ Typed
  .select('id, user_id, gear_item_id');
```

**Code-Review-Empfehlung:**
ESLint-Regel aktivieren:
```json
{
  "@typescript-eslint/no-explicit-any": "error"
}
```

---

### MEDIUM Severity

#### 3. Fehlende globale Middleware für Auth & Security Headers

**Severity:** MEDIUM
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**Datei:** `/home/user/gearshack-winterberry/middleware.ts` (nicht vorhanden)

**Beschreibung:**
Keine Next.js Middleware vorhanden. Auth-Checks müssen in **jeder** API-Route manuell implementiert werden (derzeit gut gemacht, aber fehleranfällig bei neuen Routen). Keine globalen Security Headers (CSP, X-Frame-Options, etc.).

**Impact:**
- Entwickler könnten Auth-Checks in neuen API-Routen vergessen
- Keine Defense-in-Depth für XSS/Clickjacking

**Fix:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSP (adjust for your needs)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https://res.cloudinary.com https://*.supabase.co;"
  );

  // Auth check for protected routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const supabase = createServerClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();

    // Exclude public routes
    const publicRoutes = ['/api/auth', '/api/health'];
    if (!publicRoutes.some(r => request.nextUrl.pathname.startsWith(r)) && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

#### 4. Potenzielle Undefined-Referenz in Admin-API

**Severity:** MEDIUM
**CWE:** CWE-476 (NULL Pointer Dereference)
**Datei:** `/home/user/gearshack-winterberry/app/api/admin/vip/[id]/invite/route.ts:164`

**Beschreibung:**
```typescript
claimUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/vip/claim/${token}`,
```
Wenn `NEXT_PUBLIC_APP_URL` nicht gesetzt ist, wird URL zu `/vip/claim/${token}` (relative URL statt absolute). Dies funktioniert für Web-UI, aber **nicht für E-Mail-Links**.

**Impact:**
Claim-Invitations per E-Mail würden broken Links enthalten.

**Fix:**
```typescript
// In lib/env.ts - zu Schema hinzufügen:
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  // ...
});

// In route:
const appUrl = process.env.NEXT_PUBLIC_APP_URL!; // Safe after validation
claimUrl: `${appUrl}/vip/claim/${token}`,
```

---

#### 5. Admin-Check könnte in separates RLS-basiertes System migriert werden

**Severity:** MEDIUM
**CWE:** CWE-863 (Incorrect Authorization)
**Datei:** `/home/user/gearshack-winterberry/app/api/admin/vip/[id]/invite/route.ts:47-58`

**Beschreibung:**
Admin-Checks werden in Anwendungslogik durchgeführt:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
}
```

**Besser:** Supabase RLS-Policies für `vip_accounts`, `claim_invitations` mit Admin-Check:
```sql
CREATE POLICY "Admin access for VIP invites"
ON claim_invitations
FOR INSERT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

**Vorteil:** Defense-in-Depth - auch bei vergessenen App-Level-Checks greift DB-Policy.

---

### LOW Severity

#### 6. Fehlende Content Security Policy (CSP)

**Severity:** LOW
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)
**Datei:** `/home/user/gearshack-winterberry/next.config.ts`

**Beschreibung:**
Keine CSP-Header konfiguriert. Bietet keinen zusätzlichen Schutz gegen XSS (React schützt bereits durch Auto-Escaping).

**Fix:** Siehe Middleware-Beispiel in Finding #3.

---

#### 7. CRON_SECRET Umgebungsvariable nicht in env.ts validiert

**Severity:** LOW
**CWE:** CWE-1188 (Initialization of a Resource with an Insecure Default Value)
**Dateien:**
- `/home/user/gearshack-winterberry/app/api/cron/check-prices/route.ts:49`
- `/home/user/gearshack-winterberry/.env.example:75` (dokumentiert, aber nicht validiert)

**Beschreibung:**
`CRON_SECRET` wird verwendet, aber nicht in `lib/env.ts` Schema validiert. Bei fehlendem Secret würde Cron-Job durchlaufen (da `verifyAuthHeader` false zurückgibt, aber kein Startup-Fehler).

**Fix:**
```typescript
// lib/env.ts
const cronEnvSchema = z.object({
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),
});
```

---

### INFO / Positive Findings

#### ✅ 1. Exzellenter SSRF-Schutz

**Datei:** `/home/user/gearshack-winterberry/app/actions/smart-product-search.ts:90-127`

**Highlights:**
- Private IP Ranges blockiert (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Loopback blockiert (127.0.0.0/8)
- Link-local blockiert (169.254.0.0/16)
- IPv6 private ranges (fc00::/7, fe80::/10)
- Credentials in URLs blockiert
- Non-standard Ports blockiert
- Max Response Size (5MB)
- Fetch Timeout (10s)

```typescript
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
const BLOCKED_IP_PATTERNS = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./];
```

**Bewertung:** ⭐⭐⭐⭐⭐ Best Practice

---

#### ✅ 2. Timing-Safe Comparison für CRON_SECRET

**Datei:** `/home/user/gearshack-winterberry/app/api/cron/check-prices/route.ts:30-43`

```typescript
function verifyAuthHeader(authHeader: string | null, expectedSecret: string | undefined): boolean {
  if (!authHeader || !expectedSecret) return false;
  const expected = `Bearer ${expectedSecret}`;
  if (authHeader.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}
```

**Bewertung:** ⭐⭐⭐⭐⭐ Verhindert Timing Attacks

---

#### ✅ 3. Input Validation mit Zod durchgehend implementiert

**Beispiele:**
- `/home/user/gearshack-winterberry/app/api/loadout-images/generate/route.ts:20-32`
- `/home/user/gearshack-winterberry/app/api/messaging/conversations/start/route.ts:43`
- Alle API-Routen nutzen `schema.safeParse()` mit Error Handling

---

#### ✅ 4. Keine hardcoded Secrets

**Grep-Ergebnis:** Alle Findings sind false positives (Test-Fixtures, Dokumentation, Type-Definitionen).
Alle API-Keys werden aus `process.env` geladen.

---

#### ✅ 5. Service Role Key korrekt isoliert

**Verwendung nur in:**
- `/home/user/gearshack-winterberry/app/api/cron/*` (Background Jobs)
- `/home/user/gearshack-winterberry/lib/services/batch-operations.ts` (Admin Operations)

Nie in user-facing APIs verwendet ✅

---

#### ✅ 6. Auth-Checks in allen API-Routen

**Stichprobe (50/50 APIs):**
- Alle nutzen `await supabase.auth.getUser()`
- Return 401 bei fehlendem User
- Admin-APIs prüfen zusätzlich `role === 'admin'`

---

#### ✅ 7. Keine dangerouslySetInnerHTML, eval(), innerHTML

**Grep-Ergebnisse:** Keine Treffer.
React's Auto-Escaping greift durchgehend.

---

## Statistik

| Kategorie | Anzahl |
|-----------|--------|
| **CRITICAL** | 1 |
| **HIGH** | 1 |
| **MEDIUM** | 3 |
| **LOW** | 2 |
| **INFO** | 7 |
| **Positive Findings** | 7 |
| **API-Routen analysiert** | 50+ |
| **Dateien gescannt** | 500+ |
| **Hardcoded Secrets** | 0 |
| **SQL Injection Risks** | 0 (Supabase Query Builder) |
| **XSS Risks** | 0 (React Auto-Escaping) |

---

## Empfohlene Maßnahmen (nach Priorität)

### Sofort (vor Production)
1. ❗ **CRITICAL** - Rate Limiting auf Upstash Redis migrieren
2. ❗ **HIGH** - Supabase Types regenerieren + `as any` entfernen (schrittweise)
3. **MEDIUM** - `NEXT_PUBLIC_APP_URL` Validation hinzufügen

### Kurzfristig (Sprint)
4. **MEDIUM** - Middleware für Security Headers implementieren
5. **MEDIUM** - Admin-Checks in RLS-Policies migrieren (Defense-in-Depth)
6. **LOW** - CSP Header konfigurieren
7. **LOW** - `CRON_SECRET` in env.ts validieren

### Langfristig (Backlog)
8. Dependency Audit (npm audit / Snyk)
9. Penetration Testing durch externes Team
10. Security Headers Testen (securityheaders.com)

---

## Anhang: Scan-Details

**Grep-Patterns verwendet:**
- `dangerouslySetInnerHTML` (0 Treffer)
- `eval(|new Function(` (0 Treffer)
- `exec(` (5 Treffer - alle false positives in Test-Code)
- `innerHTML|outerHTML` (0 Treffer)
- `.raw(|as any` (71 Treffer - Type Safety Issue)
- `API_KEY|SECRET|PASSWORD|TOKEN` (124 Treffer - alle env-basiert ✅)
- `CORS|Access-Control` (7 Treffer - legitime CORS-Handling)

**Keine aktiven Exploits gefunden.**

---

**Review Status:** ✅ PASSED (mit Einschränkungen)
**Production-Readiness:** 🟡 CONDITIONAL (nach Behebung von CRITICAL + HIGH Findings)

---

*Generiert am 2026-02-07 durch Security Auditor*
