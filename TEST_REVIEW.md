# Test Coverage Analysis Report
**Gearshack Winterberry** | Generiert: 2026-02-07

---

## Executive Summary

Das Projekt verfügt über **95 Testdateien** mit gutem Qualitätsstandard, aber **kritisch niedriger Coverage** (geschätzt 10-18% je nach Bereich). Die Tests, die existieren, sind gut strukturiert und umfassend, aber decken nur einen Bruchteil der Codebasis ab. **71 API-Routes haben nur 5 Tests** (~7% Coverage), was ein erhebliches Risiko für Produktionsbugs darstellt.

### Quantitative Übersicht

| Bereich | Source-Dateien | Testdateien | Geschätzte Coverage |
|---------|---------------|-------------|---------------------|
| **API Routes** | 71 | 5 | ~7% ⚠️ |
| **Hooks** | 196 | 18 | ~10% ⚠️ |
| **Components** | 420 | 46 | ~11% ⚠️ |
| **Lib/Utils** | 162 | 30 | ~18% ⚠️ |
| **Validations** | ~10 | 7 | ~70% ✅ |
| **GESAMT** | ~849 | 95 | **~12%** ⚠️ |

**Ziel laut vitest.config.ts:** 70% Coverage (lines, functions, branches, statements)
**Aktuell:** Tests nicht ausführbar (vitest nicht installiert/konfiguriert)

---

## Coverage Report

### 1. Test-Framework Status

**Framework:** Vitest 4.0.16 (konfiguriert in vitest.config.ts)
**Status:** ❌ **Nicht ausführbar**

```bash
$ npm test
sh: 1: vitest: not found
```

**Problem:** Vitest ist in package.json als devDependency aufgeführt, aber nicht in node_modules installiert oder nicht im PATH.

**Empfehlung:** `npm install` ausführen und sicherstellen, dass alle devDependencies installiert sind.

### 2. Testabdeckung nach Kategorie

#### 2.1 API Routes (71 Dateien) - **~7% Coverage** ⚠️

**Getestete Routes (5):**
- `/api/catalog/items/search` ✅
- `/api/loadout-images/*` (generate, history, set-active, delete, save-fallback) ✅
- `/api/shakedowns/*` (basic CRUD) ✅
- `/api/shares/*` ✅
- `/api/vip/*` ✅

**Ungetestete kritische Routes (66):**
- `/api/admin/*` (22 Routes) - Admin-Funktionen, VIP-Management, Resellers
- `/api/ai-assistant/stream` - AI-Chat-Streaming
- `/api/mastra/*` (5 Routes) - Mastra-Agent, Memory, Metrics, Voice
- `/api/price-tracking/*` (4 Routes) - Preis-Tracking, Alerts
- `/api/messaging/*` (3 Routes) - User-Messaging, Konversationen
- `/api/cron/*` (4 Routes) - Scheduled Jobs (Price-Check, Enrichment, Offers)
- `/api/catalog/*` (2 Routes) - Produkt-Suche, Brand-Suche
- `/api/geargraph/*` (4 Routes) - GearGraph Health, Stats, Insights
- `/api/gardener/*` (5 Routes) - Review-Queue, Batch-Actions
- `/api/sync-catalog/*` (2 Routes) - Katalog-Synchronisation

**Risiko-Bewertung:** **HOCH** - Kritische Geschäftslogik (Payment, Admin, AI) ungetestet.

#### 2.2 Custom Hooks (196 Dateien) - **~10% Coverage** ⚠️

**Getestete Hooks (18):**
- `useGearItems` ✅ (umfassend: CRUD, Realtime, Error Handling)
- `useLoadouts` ✅
- `useAuth`, `useSupabaseAuth` ✅
- `useWishlist` ✅
- `useWeightConversion` ✅
- `useMerchantAuth` ✅
- `useUserPreferences` ✅
- Social Hooks: `useFollowing`, `useFriendRequests`, etc. ✅
- Price Tracking: `usePriceAlerts`, `usePriceTracking`, `useFuzzyMatching` ✅ (9 Tests)
- Offers: `useOfferBlocking`, `useUserOffers`, `useWishlistItemOffers` ✅ (3 Tests)

**Ungetestete kritische Hooks:**
- `hooks/admin/*` (13 Dateien) - Admin-Dashboards, Gardener, Wiki-Generator
- `hooks/ai-assistant/*` (10 Dateien) - AI-Chat, Voice Input/Output, Rate Limiting
- `hooks/messaging/*` (13 Dateien) - Konversationen, Typing Indicator, Presence
- `hooks/merchant/*` (11 Dateien) - Merchant-Auth, Loadouts, Offers, Billing
- `hooks/shakedowns/*` (10+ Dateien) - Feedback, Badges, Collaborative Editing
- `hooks/bulletin/*` (5 Dateien) - Community Posts, Moderation

**Risiko-Bewertung:** **MITTEL-HOCH** - State-Management-Fehler können zu UI-Inkonsistenzen führen.

#### 2.3 Components (420 Dateien) - **~11% Coverage** ⚠️

**Getestete Components (46):**
- Core: `GearCard`, `GearEditorForm`, `LoadoutCard` ✅
- Auth: `LoginForm`, `GoogleSignInButton` ✅
- Messaging: `MessageBubble`, `MessageInput`, `ConversationList` ✅
- Bulletin: `PostCard`, `PostMenu`, `ReplyThread`, `RichContentRenderer` ✅ (12 Tests)
- Social: `FollowButton`, `OnlineStatusIndicator` ✅
- UI: `WeightDisplay`, `WeightInput`, `WeightDonut`, `ThemeToggle` ✅
- Gallery: `GalleryToolbar`, `SearchBar`, `TagFilter`, `ViewDensityToggle` ✅

**Ungetestete kritische Components:**
- `components/admin/*` (40+ Dateien) - Admin-UI für VIP, Users, Merchants, Wiki
- `components/ai-assistant/*` (15 Dateien) - AI-Chat-Interface, Voice Input
- `components/merchant/*` (15+ Dateien) - Merchant-Dashboard, Analytics, Loadouts
- `components/community/*` (10+ Dateien) - Community Hub, Banner Carousel
- `components/shakedowns/*` (15+ Dateien) - Shakedown-UI, Feedback-System
- `components/gear-detail/*` - Detail-Modals, External Links

**Risiko-Bewertung:** **MITTEL** - UI-Bugs beeinträchtigen UX, aber meist nicht kritisch.

#### 2.4 Lib/Utils (162 Dateien) - **~18% Coverage** ⚠️

**Getestete Libs (30):**
- `lib/validations/*` ✅ (7 Schema-Tests: gear, loadout, messaging, wishlist, etc.)
- `lib/utils/*` ✅ (4 Tests: avatar, category-helpers, matching, weight)
- `lib/cloudinary-utils` ✅
- `lib/contrast-analyzer` ✅
- `lib/prompt-builder` ✅
- `lib/gear-utils` ✅
- `lib/shakedown-utils` ✅
- `lib/mastra/*` ✅ (8 Tests: logging, metrics, rate-limiter, voice, mcp-graph)
- `lib/firecrawl/client` ✅
- `lib/supabase/transformers` ✅

**Ungetestete kritische Libs:**
- `lib/ai-assistant/*` (19 Dateien) - AI-Client, Prompt-Builder, Response-Parser
- `lib/mastra/agent`, `lib/mastra/workflows/*` - Mastra-Agent-Logik
- `lib/ebay/*` (4 Dateien) - eBay API Integration
- `lib/external-apis/*` (6 Dateien) - SerpAPI, Price-Search, Fuzzy-Matcher
- `lib/server/*` - Server-seitige Utilities
- `lib/rate-limits/*` - Rate-Limiting für Features

**Risiko-Bewertung:** **HOCH** - Business Logic Errors können Datenverlust verursachen.

### 3. E2E Tests

**Status:** ❌ **Keine E2E Tests vorhanden**

- Kein Playwright (`playwright.config.*` nicht gefunden)
- Kein Cypress (`cypress.config.*` nicht gefunden)

**Risiko:** Critical User Flows (Login, Checkout, Gear Creation) sind nicht getestet.

---

## Kritische Lücken (nach Risiko)

### 🔴 CRITICAL (Sofortiger Handlungsbedarf)

#### 1. **API Authentication & Authorization** (Keine Tests)
- **Dateien:** Auth-Middleware, RLS Policy Enforcement
- **Risiko:** Unbefugter Zugriff auf User-Daten, Admin-Funktionen
- **Empfehlung:**
  ```typescript
  // __tests__/integration/api/auth.test.ts
  - Test unauthorized access to protected routes
  - Test role-based access control (admin, merchant, user)
  - Test session expiry handling
  ```

#### 2. **Payment & Billing Routes** (Keine Tests)
- **Dateien:** `/api/merchant/billing/*`
- **Risiko:** Falsche Abrechnungen, Payment-Failures
- **Empfehlung:**
  ```typescript
  // __tests__/integration/api/billing.test.ts
  - Test subscription upgrades/downgrades
  - Test payment webhook handling
  - Test invoice generation
  ```

#### 3. **Cron Jobs** (Keine Tests)
- **Dateien:** `/api/cron/check-prices`, `/api/cron/expire-offers`, etc.
- **Risiko:** Scheduled Tasks schlagen fehl, User-Alerts fehlen
- **Empfehlung:**
  ```typescript
  // __tests__/integration/api/cron.test.ts
  - Test price check logic with mocked external APIs
  - Test offer expiry conditions
  - Test alert queue processing
  ```

#### 4. **Data Migrations & Schema Changes** (Keine Tests)
- **Risiko:** Datenverlust bei Supabase-Migrations
- **Empfehlung:**
  ```typescript
  // __tests__/integration/migrations.test.ts
  - Test data transformations (snake_case <-> camelCase)
  - Test backwards compatibility
  ```

### 🟡 HIGH (Wichtig, aber nicht kritisch)

#### 5. **AI Assistant Streaming** (Keine Integration Tests)
- **Dateien:** `/api/ai-assistant/stream`, `lib/ai-assistant/*`
- **Risiko:** AI-Responses abgeschnitten, Rate-Limiting fehlerhaft
- **Empfehlung:**
  ```typescript
  // __tests__/integration/api/ai-assistant.test.ts
  - Test streaming response chunks
  - Test rate limiting (free vs paid users)
  - Test context truncation for long conversations
  ```

#### 6. **Mastra Agent Workflows** (3 Tests, aber unvollständig)
- **Dateien:** `lib/mastra/workflows/*`, `lib/mastra/tools/*`
- **Risiko:** Tool-Aufrufe schlagen fehl, Memory leaks
- **Empfehlung:**
  ```typescript
  // __tests__/unit/lib/mastra/workflows.test.ts
  - Test budget-optimization workflow
  - Test trip-planner workflow
  - Test tool invocation error handling
  ```

#### 7. **Real-time Subscriptions** (Nur in useGearItems getestet)
- **Dateien:** Supabase Realtime Channels in allen Hooks
- **Risiko:** UI-State out-of-sync mit DB
- **Empfehlung:**
  ```typescript
  // __tests__/unit/hooks/useRealtime.test.ts
  - Test INSERT/UPDATE/DELETE events
  - Test channel cleanup on unmount
  - Test reconnection logic
  ```

#### 8. **Image Upload & Processing** (Keine Tests)
- **Dateien:** `/api/gear/import-url`, `lib/image-processing`, Cloudinary Upload
- **Risiko:** File-Size-Exploits, MIME-Type-Bypasses
- **Empfehlung:**
  ```typescript
  // __tests__/integration/api/image-upload.test.ts
  - Test file size limits
  - Test MIME type validation
  - Test background removal failures
  ```

### 🟢 MEDIUM (Sollte verbessert werden)

#### 9. **Admin Dashboards** (Keine Tests)
- **Dateien:** `hooks/admin/*`, `components/admin/*`
- **Risiko:** Admin-UI zeigt falsche Statistiken
- **Empfehlung:** Unit Tests für Daten-Aggregation

#### 10. **Community Features** (Partielle Tests)
- **Dateien:** Bulletin Board, Shakedowns, Wiki
- **Risiko:** Spam, Moderation fehlerhaft
- **Empfehlung:** Integration Tests für Post-Creation, Reporting

---

## Test-Qualitätsbewertung (vorhandene Tests)

### ✅ Positive Findings

1. **Komprehensive Assertions**
   - Beispiel: `useGearItems.test.ts` testet CRUD, Realtime, Error Handling, Edge Cases (1360 Zeilen)
   - Best Practice: AAA-Pattern (Arrange, Act, Assert) konsequent angewendet

2. **Gutes Mocking**
   - Supabase Client vollständig gemockt (`__tests__/mocks/supabase.ts`)
   - Fixtures für realistische Test-Daten (`__tests__/fixtures/gear.ts`, `loadouts.ts`)

3. **Edge Case Coverage**
   - Null-Werte, leere Arrays, ungültige IDs
   - Beispiel: `gearItemFormSchema` testet alle Validations-Regeln

4. **Strukturierte Organisation**
   ```
   __tests__/
   ├── unit/           (Components, Hooks, Lib)
   ├── integration/    (API Routes)
   ├── mastra/         (Mastra-spezifisch)
   ├── mocks/          (Shared Mocks)
   └── fixtures/       (Test-Daten)
   ```

5. **Error Handling getestet**
   - Database Errors, Network Errors, Validation Errors
   - Beispiel: `catalog-search.test.ts` testet 400/500 Responses

### ⚠️ Verbesserungspotential

1. **Unvollständige Integration Tests**
   - Nur 5 von 71 API Routes getestet
   - Keine End-to-End Tests

2. **Fehlende Performance Tests**
   - Keine Tests für Ladezeiten, Rate-Limiting unter Last
   - Empfehlung: k6 oder Artillery für Load Testing

3. **Snapshot Tests fehlen**
   - UI-Komponenten könnten von Snapshot-Tests profitieren
   - Beispiel: `GearCard.test.tsx` könnte Snapshot für verschiedene Props haben

4. **Accessibility Tests fehlen**
   - Keine Tests mit @testing-library/jest-dom für ARIA, Keyboard-Navigation
   - Empfehlung: `axe-core` Integration

5. **Test-Parallelisierung unklar**
   - vitest.config.ts definiert keine `threads` oder `maxConcurrency`

---

## Konkrete Test-Vorschläge (Priorität HOCH)

### 1. API Route Tests (Ziel: 50% Coverage)

```typescript
// __tests__/integration/api/admin/vip.test.ts
describe('POST /api/admin/vip/[id]/invite', () => {
  it('should require admin role', async () => {
    const response = await POST(mockRequest, { params: { id: 'vip-123' } });
    expect(response.status).toBe(403);
  });

  it('should create invitation and send email', async () => {
    const response = await POST(mockAdminRequest, { params: { id: 'vip-123' } });
    expect(response.status).toBe(200);
    expect(mockEmailService.send).toHaveBeenCalledWith({
      to: 'vip@example.com',
      template: 'vip-invitation',
    });
  });
});

// __tests__/integration/api/cron/check-prices.test.ts
describe('POST /api/cron/check-prices', () => {
  it('should fetch prices from external APIs', async () => {
    mockSerpAPI.search.mockResolvedValue({ results: [...] });

    const response = await POST(mockCronRequest);

    expect(mockSerpAPI.search).toHaveBeenCalled();
    expect(mockSupabase.from('price_history').insert).toHaveBeenCalled();
  });

  it('should handle API rate limits gracefully', async () => {
    mockSerpAPI.search.mockRejectedValue(new Error('429 Too Many Requests'));

    const response = await POST(mockCronRequest);

    expect(response.status).toBe(200); // Cron should not fail
    expect(mockLogger.error).toHaveBeenCalledWith('Rate limit exceeded');
  });
});
```

### 2. Hook Tests (Ziel: 30% Coverage)

```typescript
// __tests__/unit/hooks/messaging/useConversations.test.ts
describe('useConversations', () => {
  it('should load conversations on mount', async () => {
    const { result } = renderHook(() => useConversations('user-123'));

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(5);
    });
  });

  it('should mark conversation as read', async () => {
    const { result } = renderHook(() => useConversations('user-123'));

    await act(async () => {
      await result.current.markAsRead('conv-456');
    });

    expect(mockSupabase.from('conversations').update).toHaveBeenCalledWith({
      unread_count: 0,
    });
  });
});

// __tests__/unit/hooks/ai-assistant/useMastraChat.test.ts
describe('useMastraChat', () => {
  it('should stream AI responses', async () => {
    mockMastra.chat.mockReturnValue(mockStreamResponse);

    const { result } = renderHook(() => useMastraChat());

    await act(async () => {
      await result.current.sendMessage('What gear should I bring?');
    });

    expect(result.current.messages).toContainEqual({
      role: 'assistant',
      content: expect.stringContaining('tent'),
    });
  });
});
```

### 3. Component Tests (Ziel: 25% Coverage)

```typescript
// __tests__/unit/components/admin/VipAdminDashboard.test.tsx
describe('VipAdminDashboard', () => {
  it('should display VIP statistics', () => {
    render(<VipAdminDashboard vips={mockVips} />);

    expect(screen.getByText('Total VIPs: 42')).toBeInTheDocument();
    expect(screen.getByText('Active Loadouts: 128')).toBeInTheDocument();
  });

  it('should allow creating new VIP invitation', async () => {
    const user = userEvent.setup();
    render(<VipAdminDashboard vips={[]} />);

    await user.click(screen.getByRole('button', { name: 'Invite VIP' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

### 4. E2E Tests (Neu erstellen)

```typescript
// e2e/critical-flows.spec.ts (Playwright)
test('User can create gear item and add to loadout', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForURL('/inventory');
  await page.click('text=Add Gear');

  await page.fill('[name="name"]', 'Test Tent');
  await page.fill('[name="weightValue"]', '1200');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Test Tent')).toBeVisible();

  await page.goto('/loadouts/new');
  await page.fill('[name="title"]', 'Weekend Trip');
  await page.click('text=Add Gear');
  await page.click('text=Test Tent');
  await page.click('button:has-text("Create Loadout")');

  await expect(page.locator('text=Weekend Trip')).toBeVisible();
});
```

---

## Empfohlener Aktionsplan

### Phase 1: Infrastruktur (Woche 1)
1. ✅ `npm install` ausführen, sicherstellen dass Tests laufen
2. ✅ GitHub Actions CI/CD einrichten mit `npm test`
3. ✅ Coverage Reports konfigurieren (lcov → Codecov/Coveralls)
4. ✅ Pre-commit Hook für Tests (`husky` + `lint-staged`)

### Phase 2: Kritische Tests (Woche 2-3)
1. ✅ API Auth Tests (401/403 Responses)
2. ✅ Cron Job Tests (mit Mocks)
3. ✅ Payment/Billing Tests
4. ✅ Image Upload Validation Tests

### Phase 3: E2E Tests (Woche 4)
1. ✅ Playwright Setup
2. ✅ Critical User Flows (Login, Gear Creation, Loadout Management)
3. ✅ Visual Regression Tests (Percy/Chromatic)

### Phase 4: Kontinuierliche Verbesserung (Ongoing)
1. ✅ Neue Features müssen Tests mitbringen (Definition of Done)
2. ✅ Wöchentliche Coverage-Reviews im Team
3. ✅ Ziel: 50% Coverage in 3 Monaten, 70% in 6 Monaten

---

## Tools & Ressourcen

### Empfohlene Ergänzungen
```json
// package.json devDependencies
{
  "@axe-core/react": "^4.8.0",           // Accessibility Testing
  "@playwright/test": "^1.40.0",         // E2E Testing
  "@testing-library/jest-dom": "^6.9.1", // ✅ Already installed
  "msw": "^2.0.0",                       // API Mocking
  "faker": "^6.0.0"                      // Test Data Generation
}
```

### Coverage-Dashboard
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Nützliche Links
- [Vitest Best Practices](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)

---

## Fazit

**Aktueller Zustand:** ⚠️ **Mangelhaft**
**Testqualität (wenn vorhanden):** ✅ **Gut**
**Dringlichkeit:** 🔴 **Hoch**

Das Projekt hat **solide Test-Fundamente**, aber **kritische Coverage-Lücken**. Mit fokussierten Tests für API Routes, Auth, und Critical Flows kann das Risiko signifikant reduziert werden. Die vorhandenen Tests zeigen, dass das Team die Best Practices kennt - jetzt muss die Coverage systematisch erhöht werden.

**Empfehlung:** Sofortiger Start von Phase 1-2 (API & Cron Tests), dann E2E Tests für Business-Critical Flows.
