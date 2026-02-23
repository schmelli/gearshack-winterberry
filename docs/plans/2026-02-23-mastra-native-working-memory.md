# Mastra Native Working Memory Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hybrid custom/native Working Memory system with Mastra's fully native Working Memory (mastra_resources table), eliminating all custom adapter code.

**Architecture:** Mastra's Memory class with `workingMemory: { enabled: true, schema: GearshackUserProfileSchema }` (already configured) stores and auto-injects working memory via `mastra_resources`. The agent gets Mastra's native `updateWorkingMemory` tool automatically. All custom adapter code, manual prompt injection, and the `persistUserProfile` tool are removed. A one-time migration script moves existing data from `user_working_memory` → `mastra_resources`.

**Tech Stack:** `@mastra/memory` v1.0, `@mastra/pg` PostgresStore (`updateResource` API), Supabase service role client, `tsx` for migration script, Vitest for tests.

**Design Doc:** `docs/plans/2026-02-23-mastra-native-working-memory-design.md`

---

## Existing Test Setup (read before touching tests)

Run all tests with: `npm test`
Run single file: `npx vitest run __tests__/unit/lib/mastra/mastra-agent.test.ts`

Vitest mocking pattern used everywhere:
```typescript
vi.mock('@/lib/mastra/tools/some-tool', () => ({ someTool: {} }));
```

---

## Task 1: Delete dead code — embedding-service.ts + semantic-recall.ts

These files were superseded by Mastra native semantic recall (via `threadId`). Only `index.ts` still exports them — no active caller.

**Files:**
- Delete: `lib/mastra/memory/embedding-service.ts`
- Delete: `lib/mastra/memory/semantic-recall.ts`
- Modify: `lib/mastra/index.ts`

**Step 1: Verify no active callers (just check)**

```bash
grep -r "embedding-service\|semantic-recall\|generateEmbedding\|searchSimilarMessages\|embedAndStoreMessage" \
  lib app --include="*.ts" --include="*.tsx" | grep -v "memory/semantic-recall\|memory/embedding-service\|index.ts"
```

Expected: only `semantic-recall.ts` and `index.ts` themselves — no callers.

**Step 2: Remove exports from lib/mastra/index.ts**

In `lib/mastra/index.ts`, delete these two lines (currently lines 42-43):
```typescript
export { searchSimilarMessages, embedAndStoreMessage } from './memory/semantic-recall';
export { generateEmbedding, generateEmbeddings, isEmbeddingAvailable } from './memory/embedding-service';
```

**Step 3: Delete the files**

```bash
rm lib/mastra/memory/embedding-service.ts
rm lib/mastra/memory/semantic-recall.ts
```

**Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors referencing `embedding-service` or `semantic-recall`.

**Step 5: Commit**

```bash
git add lib/mastra/index.ts
git rm lib/mastra/memory/embedding-service.ts lib/mastra/memory/semantic-recall.ts
git commit -m "chore: remove dead embedding-service and semantic-recall (Mastra handles natively)"
```

---

## Task 2: Remove persistUserProfile tool from agent

The `persistUserProfile` (wrapping `updateWorkingMemoryTool`) wrote to the custom `user_working_memory` table. Mastra now provides its own `updateWorkingMemory` tool automatically.

**Files:**
- Modify: `lib/mastra/mastra-agent.ts`
- Modify: `__tests__/unit/lib/mastra/mastra-agent.test.ts`
- Delete: `lib/mastra/tools/update-working-memory.ts`
- Delete: `__tests__/unit/lib/mastra/tools/update-working-memory.test.ts`

**Step 1: Write failing test in mastra-agent.test.ts**

In `__tests__/unit/lib/mastra/mastra-agent.test.ts`, find the section with the mock for `update-working-memory` (around line 58):

```typescript
vi.mock('@/lib/mastra/tools/update-working-memory', () => ({
  updateWorkingMemoryTool: {},
}));
```

**Replace** this mock with a test that verifies the tool is gone. Add a new describe block (keep the existing structure, just modify the mock and add assertions):

Find the existing test that checks tools (look for `persistUserProfile` in the test). Change it so the test:
1. Does NOT mock `update-working-memory` anymore (remove that `vi.mock` line entirely)
2. Asserts that `createGearAgent` returns an agent (smoke test — can't easily inspect tool list without deeper mocking)

The full replacement for the update-working-memory mock line and related assertions:
```typescript
// NOTE: update-working-memory mock REMOVED — persistUserProfile tool was removed from agent
// Mastra provides its own updateWorkingMemory tool natively
```

Run to confirm test file still compiles:
```bash
npx vitest run __tests__/unit/lib/mastra/mastra-agent.test.ts 2>&1 | tail -20
```

Expected: some tests may still PASS (they don't depend on the removed mock). Fix any that break due to missing mock.

**Step 2: Remove import and tool from mastra-agent.ts**

In `lib/mastra/mastra-agent.ts`:

Remove this import (line 33-34):
```typescript
// Working memory persistence
import { updateWorkingMemoryTool } from './tools/update-working-memory';
```

Remove this tool entry from the `tools` object in `createGearAgent()` (around line 221-222):
```typescript
      // Working memory persistence (fix: agent can now actually write the profile)
      persistUserProfile: updateWorkingMemoryTool,
```

Update the console.log on the next line to reflect 7 tools (not 8):
```typescript
  console.log(
    `[Mastra Agent] Created for user ${userId} with ${AI_CHAT_MODEL}, 7 tools (3 composite + 1 action + 3 legacy), three-tier memory`
  );
```

**Step 3: Run tests**

```bash
npx vitest run __tests__/unit/lib/mastra/mastra-agent.test.ts 2>&1 | tail -30
```

Expected: all tests pass.

**Step 4: Delete the tool file and its test**

```bash
rm lib/mastra/tools/update-working-memory.ts
rm __tests__/unit/lib/mastra/tools/update-working-memory.test.ts
```

**Step 5: Run all tests to confirm no regressions**

```bash
npm test 2>&1 | tail -30
```

Expected: 0 failing tests (the 40 tests from `update-working-memory.test.ts` are gone, but all others pass).

**Step 6: Commit**

```bash
git add lib/mastra/mastra-agent.ts __tests__/unit/lib/mastra/mastra-agent.test.ts
git rm lib/mastra/tools/update-working-memory.ts __tests__/unit/lib/mastra/tools/update-working-memory.test.ts
git commit -m "feat: remove persistUserProfile tool — Mastra native updateWorkingMemory replaces it"
```

---

## Task 3: Simplify prompt-builder.ts

Remove the manual WM injection from the system prompt. Mastra's `WorkingMemory` processor now handles this automatically on every `agent.stream()` call.

**Files:**
- Modify: `lib/mastra/prompt-builder.ts`
- Create: `__tests__/unit/lib/mastra/prompt-builder.test.ts`

**Step 1: Write the failing test**

Create `__tests__/unit/lib/mastra/prompt-builder.test.ts`:

```typescript
/**
 * Unit Tests for buildMastraSystemPrompt
 *
 * After native WM migration: prompt-builder no longer injects working memory.
 * Mastra's WorkingMemory processor handles that automatically.
 */
import { describe, it, expect } from 'vitest';
import { buildMastraSystemPrompt } from '@/lib/mastra/prompt-builder';
import type { PromptContext } from '@/lib/mastra/prompt-builder';

const baseContext: PromptContext = {
  userContext: {
    screen: 'inventory',
    locale: 'en',
    inventoryCount: 5,
    userId: 'user-123',
    subscriptionTier: 'standard',
  },
};

describe('buildMastraSystemPrompt', () => {
  it('builds a prompt without workingMemoryProfile field', () => {
    // After migration: PromptContext has no workingMemoryProfile field
    const prompt = buildMastraSystemPrompt(baseContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('does not include manual working memory instructions', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    // These strings were in buildWorkingMemoryInstructions() — should be gone
    expect(prompt).not.toContain('persistUserProfile');
    expect(prompt).not.toContain('user_working_memory');
  });

  it('still includes core identity section', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    expect(prompt).toContain('Gearshack');
  });

  it('works for German locale', () => {
    const deContext: PromptContext = {
      ...baseContext,
      userContext: { ...baseContext.userContext, locale: 'de' },
    };
    const prompt = buildMastraSystemPrompt(deContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });
});
```

**Step 2: Run to verify test fails**

```bash
npx vitest run __tests__/unit/lib/mastra/prompt-builder.test.ts 2>&1 | tail -30
```

Expected: TypeScript error because `PromptContext` still has `workingMemoryProfile`, or test passes because `workingMemoryProfile` is optional. Either way, verify the test runs.

**Step 3: Remove WM from prompt-builder.ts**

In `lib/mastra/prompt-builder.ts`:

**Remove** these lines from the top of the file (lines 13-17):
```typescript
import type { GearshackUserProfile } from './schemas/working-memory';
import {
  formatWorkingMemoryForPrompt,
  buildWorkingMemoryInstructions,
} from './memory/working-memory-adapter';
```

**Remove** `workingMemoryProfile` from the `PromptContext` interface (lines 296-297):
```typescript
  /** Working memory profile (three-tier memory system) */
  workingMemoryProfile?: GearshackUserProfile;
```

**Remove** the WM injection block from `buildMastraSystemPrompt()` (lines 334-345):
```typescript
  // 1b. Working Memory (three-tier memory system)
  if (context.workingMemoryProfile) {
    const workingMemorySection = formatWorkingMemoryForPrompt(
      context.workingMemoryProfile,
      locale
    );
    sections.push(`\n${workingMemorySection}`);

    // Add working memory update instructions
    const wmInstructions = buildWorkingMemoryInstructions(locale);
    sections.push(wmInstructions);
  }
```

**Step 4: Run tests**

```bash
npx vitest run __tests__/unit/lib/mastra/prompt-builder.test.ts 2>&1 | tail -30
```

Expected: all 4 tests PASS.

**Step 5: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all remaining tests pass.

**Step 6: Commit**

```bash
git add lib/mastra/prompt-builder.ts __tests__/unit/lib/mastra/prompt-builder.test.ts
git commit -m "feat: remove manual WM injection from prompt-builder — Mastra WorkingMemory processor handles it"
```

---

## Task 4: Simplify route.ts

Remove all custom working memory fetch/save logic from the chat API route.

**Files:**
- Modify: `app/api/mastra/chat/route.ts`

**Step 1: Remove imports at top of file (lines 57-63)**

Remove these lines:
```typescript
// Three-tier memory system (Feature 002-mastra-memory-system)
import {
  getWorkingMemory,
  saveWorkingMemory,
} from '@/lib/mastra/memory/working-memory-adapter';

import type { GearshackUserProfile } from '@/lib/mastra/schemas/working-memory';
```

**Step 2: Remove MemoryContext interface (lines 95-99)**

Remove:
```typescript
interface MemoryContext {
  available: boolean;
  workingMemoryProfile: GearshackUserProfile | null;
  warning?: string;
}
```

**Step 3: Remove fetchMemoryContext() function (lines 172-195)**

Remove the entire function:
```typescript
/**
 * Fetch working memory profile for the current user.
 * Mastra native (PostgresStore + PgVector) handles all conversation storage.
 */
async function fetchMemoryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<MemoryContext> {
  try {
    const supabaseClient = supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>;
    const workingMemoryProfile = await getWorkingMemory(supabaseClient, userId);
    return { available: true, workingMemoryProfile };
  } catch (error) {
    logWarn('Working memory unavailable, continuing without', {
      userId,
      metadata: { error: error instanceof Error ? error.message : 'Unknown' },
    });
    return { available: false, workingMemoryProfile: null };
  }
}
```

**Step 4: Simplify buildPromptContext() signature**

Current signature (lines 201-208):
```typescript
async function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  userId: string,
  memoryWarning?: string,
  subscriptionTier?: 'standard' | 'trailblazer',
  parsedQuery?: ParsedQuery,
  workingMemoryProfile?: GearshackUserProfile | null,
): Promise<{ promptContext: PromptContext; loadoutContext: LoadoutContext | null }>
```

Replace with:
```typescript
async function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  userId: string,
  subscriptionTier?: 'standard' | 'trailblazer',
  parsedQuery?: ParsedQuery,
): Promise<{ promptContext: PromptContext; loadoutContext: LoadoutContext | null }>
```

**Step 5: Simplify promptContext construction inside buildPromptContext (lines 224-232)**

Current:
```typescript
  const promptContext: PromptContext = {
    userContext: promptUserContext,
    workingMemoryProfile: workingMemoryProfile ?? undefined,
  };

  // Add memory warning if applicable
  if (memoryWarning) {
    promptContext.catalogResults = `SYSTEM NOTE: ${memoryWarning}`;
  }
```

Replace with:
```typescript
  const promptContext: PromptContext = {
    userContext: promptUserContext,
  };
```

**Step 6: Update Phase 1 in POST handler**

In the `ReadableStream.start()` function, find Phase 1 (around lines 479-495):

Current:
```typescript
          // --- Phase 1: Memory + Intent (emit progress before starting) ---
          emitProgress('memory', progressMessages[locale].memory);

          // Memory context fetch and intent classification in parallel
          const [memoryContextResult, intentResult] = await Promise.all([
            traceWorkflowStep(
              `chat-${conversationId}`,
              'memory_retrieval',
              () => fetchMemoryContext(supabase, user.id),
              { userId: user.id }
            ).then(r => r.result),
            classifyIntent(
              message,
              context?.screen as string | undefined,
              currentLoadoutId
            ),
          ]);

          const memoryContext = memoryContextResult;
```

Replace with:
```typescript
          // --- Phase 1: Intent classification ---
          emitProgress('memory', progressMessages[locale].memory);

          const intentResult = await classifyIntent(
            message,
            context?.screen as string | undefined,
            currentLoadoutId
          );
```

**Step 7: Update buildPromptContext call (around line 557)**

Current:
```typescript
          const { promptContext, loadoutContext } = await buildPromptContext(
            context,
            user.id,
            memoryContext.warning,
            undefined, // subscriptionTier
            parsedQuery,
            memoryContext.workingMemoryProfile,
          );
```

Replace with:
```typescript
          const { promptContext, loadoutContext } = await buildPromptContext(
            context,
            user.id,
            undefined, // subscriptionTier
            parsedQuery,
          );
```

**Step 8: Remove WM save block after streaming (lines 689-702)**

Find and remove this entire block:
```typescript
          // Save working memory after successful response (non-blocking)
          if (memoryContext.workingMemoryProfile) {
            const supabaseClient = supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>;
            getWorkingMemory(supabaseClient, user.id)
              .then((freshProfile) =>
                saveWorkingMemory(supabaseClient, user.id, freshProfile)
              )
              .catch((err) => {
                logWarn('Working memory save failed (non-blocking)', {
                  userId: user.id,
                  metadata: { error: err instanceof Error ? err.message : 'Unknown' },
                });
              });
          }
```

**Step 9: Clean up log metadata (around line 720)**

Find:
```typescript
              memoryAvailable: memoryContext.available,
```

Remove that line from the logInfo call.

**Step 10: Remove unused Database import if now unused**

Check if `Database` type is still used elsewhere in the file:
```bash
grep "Database" app/api/mastra/chat/route.ts
```

If the only remaining use was in the WM adapter cast, remove the import:
```typescript
import type { Database } from '@/types/supabase';
```

**Step 11: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 12: Commit**

```bash
git add app/api/mastra/chat/route.ts
git commit -m "feat: remove custom WM fetch/save from route — Mastra Memory handles it natively"
```

---

## Task 5: Delete working-memory-adapter.ts and update index.ts

Now that all callers are removed, delete the file.

**Files:**
- Delete: `lib/mastra/memory/working-memory-adapter.ts`
- Modify: `lib/mastra/index.ts`

**Step 1: Verify no remaining imports**

```bash
grep -r "working-memory-adapter\|formatWorkingMemoryForPrompt\|buildWorkingMemoryInstructions\|getWorkingMemory\|saveWorkingMemory\|deleteWorkingMemory" \
  lib app __tests__ --include="*.ts" --include="*.tsx" | grep -v "working-memory-adapter.ts"
```

Expected: zero results (other than in index.ts which we're about to fix).

**Step 2: Remove exports from index.ts**

In `lib/mastra/index.ts`, remove line 41:
```typescript
export { getWorkingMemory, saveWorkingMemory, saveWorkingMemoryDirect, deleteWorkingMemory } from './memory/working-memory-adapter';
```

**Step 3: Delete the file**

```bash
git rm lib/mastra/memory/working-memory-adapter.ts
```

**Step 4: Run full test suite + build**

```bash
npm test 2>&1 | tail -20
npm run build 2>&1 | tail -20
```

Expected: all tests pass, build succeeds.

**Step 5: Commit**

```bash
git add lib/mastra/index.ts
git commit -m "chore: delete working-memory-adapter — replaced by Mastra native storage"
```

---

## Task 6: Create data migration script

One-time script to move existing user profiles from `user_working_memory` (Supabase custom table) to `mastra_resources` (Mastra's native table).

**Context:** Mastra's `PostgresStore.updateResource()` creates a new resource if it doesn't exist, or updates the `workingMemory` field if it does. The `mastra_resources` table is auto-created by PostgresStore on first use (during app startup in production).

**Files:**
- Create: `scripts/migrate-working-memory.ts`
- Modify: `package.json`

**Step 1: Add npm script to package.json**

In `package.json`, in the `"scripts"` section, add after `"seed:ontology"`:
```json
"migrate:working-memory": "tsx scripts/migrate-working-memory.ts"
```

**Step 2: Create the migration script**

Create `scripts/migrate-working-memory.ts`:

```typescript
/**
 * Migration Script: user_working_memory → mastra_resources
 *
 * Moves existing user working memory profiles from the custom
 * user_working_memory Supabase table into Mastra's native
 * mastra_resources table (column: workingMemory TEXT).
 *
 * Safe to re-run — uses upsert semantics (PostgresStore.updateResource).
 *
 * Prerequisites:
 * - DATABASE_URL in .env.local (direct PostgreSQL connection string)
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage:
 *   npm run migrate:working-memory
 */

import 'dotenv/config';
import { PostgresStore } from '@mastra/pg';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Config
// =============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
  process.exit(1);
}

// =============================================================================
// Migration
// =============================================================================

async function migrate() {
  console.log('=== Working Memory Migration: user_working_memory → mastra_resources ===\n');

  // Source: Supabase user_working_memory table
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: rows, error } = await supabase
    .from('user_working_memory')
    .select('user_id, profile');

  if (error) {
    throw new Error(`Failed to read user_working_memory: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    console.log('No users found in user_working_memory. Nothing to migrate.');
    return;
  }

  console.log(`Found ${rows.length} user(s) to migrate.\n`);

  // Target: Mastra PostgresStore (mastra_resources table)
  const store = new PostgresStore({
    id: 'gearshack-migration',
    connectionString: DATABASE_URL!,
  });

  // Ensure mastra_resources table exists
  await store.init();

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // updateResource creates the resource if it doesn't exist,
      // or updates workingMemory if it already exists — idempotent.
      await store.updateResource({
        resourceId: row.user_id,
        workingMemory: JSON.stringify(row.profile),
      });

      console.log(`  ✓ Migrated user ${row.user_id}`);
      migrated++;
    } catch (err) {
      console.error(`  ✗ Failed user ${row.user_id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\n=== Done: ${migrated} migrated, ${failed} failed ===`);

  if (failed > 0) {
    console.error('\nSome users failed to migrate. Check errors above.');
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 3: Verify the script compiles**

```bash
npx tsx --no-cache scripts/migrate-working-memory.ts 2>&1 | head -10
```

If env vars are not set locally, you'll see the "ERROR: DATABASE_URL is required" message — that's correct behavior.

**Step 4: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add scripts/migrate-working-memory.ts package.json
git commit -m "feat: add working memory migration script (user_working_memory → mastra_resources)"
```

---

## Task 7: Final cleanup and verification

**Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -40
```

Expected: all tests pass (fewer total — 40 update-working-memory tests are gone).

**Step 2: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build, 0 errors.

**Step 3: Verify no remaining references to old adapter**

```bash
grep -r "user_working_memory\|working-memory-adapter\|persistUserProfile\|updateWorkingMemoryTool\|saveWorkingMemory\|getWorkingMemory" \
  lib app __tests__ --include="*.ts" --include="*.tsx" | grep -v "migrate-working-memory\|memory-adapter.ts"
```

Expected: zero results.

**Step 4: Push all commits**

```bash
git push origin development
```

**Step 5: Document migration run in README or docs (optional)**

After running in production: `npm run migrate:working-memory`

---

## Summary of Changes

| File | Action |
|------|--------|
| `lib/mastra/memory/embedding-service.ts` | Deleted |
| `lib/mastra/memory/semantic-recall.ts` | Deleted |
| `lib/mastra/memory/working-memory-adapter.ts` | Deleted |
| `lib/mastra/tools/update-working-memory.ts` | Deleted |
| `__tests__/unit/lib/mastra/tools/update-working-memory.test.ts` | Deleted |
| `lib/mastra/index.ts` | Removed dead exports |
| `lib/mastra/mastra-agent.ts` | Removed persistUserProfile tool |
| `lib/mastra/prompt-builder.ts` | Removed WM injection section |
| `app/api/mastra/chat/route.ts` | Removed fetchMemoryContext, MemoryContext, WM save |
| `scripts/migrate-working-memory.ts` | Created |
| `package.json` | Added migrate:working-memory script |
| `__tests__/unit/lib/mastra/prompt-builder.test.ts` | Created |
