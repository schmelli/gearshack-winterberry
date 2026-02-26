# Mastra Native Memory Migration – Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Mastra AI agent from a parallel dual-memory system (custom SupabaseMemoryAdapter + broken Mastra native) to a single, correctly wired Mastra native memory setup that actually works.

**Architecture:** Fix the root cause (missing `threadId` in `agent.stream()`) so Mastra's `PostgresStore` handles conversation history natively. Remove ~800 lines of now-redundant custom infrastructure (`memory-adapter.ts`, `memory-save.ts`, `memory-retry-queue.ts`). Keep the custom `user_working_memory` table for the structured user profile (it has real data + schema). Fix two bonus bugs (catalog_brands filter, no-op config). Remove dead workflow files.

**Tech Stack:** @mastra/core ^1.0.4, @mastra/memory ^1.0.0, @mastra/pg ^1.0.0 (PostgresStore + PgVector), Supabase PostgreSQL, TypeScript strict mode

---

## Background: What's Broken and Why

### Critical Bug: Missing `threadId`

In `lib/mastra/mastra-agent.ts:streamMastraResponse()`, the call to `agent.stream()` never passes `threadId`:

```typescript
// CURRENT (broken - Mastra memory never activates):
const stream = await agent.stream(messages, {
  resourceId: userId,
  requestContext: requestContext,
} as any);
```

Without `threadId`, Mastra's `PostgresStore` and `PgVector` are completely bypassed. The agent has no persistent memory at all from Mastra's perspective. The custom `SupabaseMemoryAdapter` + manual history passing + custom semantic recall were all workarounds for this one missing line.

### Architectural Consequence

Two parallel systems exist:
1. **Custom adapter** (`memory-adapter.ts`): writes to `conversation_memory` table, manually passed as history to `agent.stream()`
2. **Mastra native** (`PostgresStore`, `PgVector`): configured but never used

Fix: Add `threadId` → Mastra native activates → remove custom system.

### Bonus Bugs

- **`observationalMemory` config**: key doesn't exist in `@mastra/memory` v1.0.x → silent no-op
- **`indexConfig` in semanticRecall**: Mastra manages its own index → no-op
- **`catalog_brands.name` ilike filter**: PostgREST can't filter over joins this way → filter always ignored

---

## Task 1: Fix `threadId` in `streamMastraResponse()`

**Files:**
- Modify: `lib/mastra/mastra-agent.ts:280-330`

### Step 1: Add `conversationId` parameter

```typescript
// OLD signature:
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  currentLoadoutId?: string
)

// NEW signature:
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,         // ADD: Mastra threadId
  conversationHistory?: Array<{ role: string; content: string }>,
  currentLoadoutId?: string
)
```

### Step 2: Add `threadId` to `agent.stream()`

```typescript
// In streamMastraResponse(), replace the agent.stream() call:

const stream = await agent.stream(messages, {
  resourceId: userId,
  threadId: conversationId,      // ADD THIS - enables ALL Mastra memory
  requestContext: requestContext,
} as any);
```

### Step 3: Update call site in `route.ts`

In `app/api/mastra/chat/route.ts`, find the `streamMastraResponse` call (around line 851):

```typescript
// OLD:
return await streamMastraResponse(agent, message, user.id, memoryContext.history, currentLoadoutId);

// NEW:
return await streamMastraResponse(agent, message, user.id, conversationId, memoryContext.history, currentLoadoutId);
```

### Step 4: Run lint to verify no TypeScript errors

Run: `npm run lint`
Expected: No errors related to `streamMastraResponse`

### Step 5: Test manually

Start dev server: `npm run dev`
Open the chat and send a message. Check Supabase → the database should now have new tables created by Mastra's PostgresStore (look for tables starting with `mastra_`).

> **Note:** Mastra's PostgresStore auto-creates its tables on first use. This is expected behavior.

### Step 6: Commit

```bash
git add lib/mastra/mastra-agent.ts app/api/mastra/chat/route.ts
git commit -m "fix(mastra): add threadId to agent.stream() to enable native Mastra memory

Without threadId, PostgresStore and PgVector were completely bypassed.
This single fix activates all of Mastra's native memory features:
- Conversation history stored in mastra_messages (PostgresStore)
- Semantic recall via pgvector (PgVector)
- Working memory injection

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Fix `catalog_brands.name` Filter Bug

**Files:**
- Modify: `lib/mastra/tools/search-gear-knowledge.ts:431-491` (function `searchCatalog`)

**Problem:** Line 458 uses `.ilike('catalog_brands.name', ...)` which PostgREST ignores silently on joined tables. The brand filter does nothing.

**Fix:** Fetch matching brand IDs first, then filter by FK.

### Step 1: Rewrite brand filter in `searchCatalog()`

Find and replace the brand filter section in `searchCatalog()`:

```typescript
// OLD (broken):
if (filters?.brand) {
  dbQuery = dbQuery.ilike('catalog_brands.name', `%${filters.brand}%`);
}

// NEW (correct: resolve brand IDs first):
if (filters?.brand) {
  const { data: matchingBrands } = await supabase
    .from('catalog_brands')
    .select('id')
    .ilike('name', `%${filters.brand}%`);
  const brandIds = (matchingBrands ?? []).map((b: { id: string }) => b.id);
  if (brandIds.length > 0) {
    dbQuery = dbQuery.in('brand_id', brandIds);
  } else {
    // No brands match - return empty
    return { type: 'catalog', data: [] };
  }
}
```

### Step 2: Run lint

Run: `npm run lint`
Expected: No errors

### Step 3: Manual test

Use the AI chat: "Show me all Hilleberg products"
Expected: Returns Hilleberg catalog products (previously filter was silently ignored)

### Step 4: Commit

```bash
git add lib/mastra/tools/search-gear-knowledge.ts
git commit -m "fix(ai-tools): fix catalog brand filter - resolve brand IDs before filtering

PostgREST cannot filter over joins with .ilike('catalog_brands.name', ...).
Fix: fetch matching brand IDs first, then filter catalog_products by brand_id.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Remove No-Op Configurations

**Files:**
- Modify: `lib/mastra/mastra-agent.ts`

These configs are silently ignored by @mastra/memory v1.0.x and add confusion.

### Step 1: Remove `observationalMemory` block

In `createAgentMemory()`, remove the entire Observational Memory section:

```typescript
// DELETE these lines (approx line 80-85 and 191-207):
const OM_ENABLED = process.env.OBSERVATIONAL_MEMORY_ENABLED !== 'false';
const OM_MODEL = process.env.OM_MODEL || 'google/gemini-2.5-flash';
const OM_MESSAGE_TOKENS = parseInt(process.env.OM_MESSAGE_TOKENS || '20000', 10);
const OM_OBSERVATION_TOKENS = parseInt(process.env.OM_OBSERVATION_TOKENS || '40000', 10);

// DELETE the entire block:
if (OM_ENABLED) {
  memoryOptions.observationalMemory = { ... };
}
```

### Step 2: Remove `indexConfig` from semanticRecall

In the `semanticRecall` config, remove the `indexConfig` key:

```typescript
// OLD:
memoryOptions.semanticRecall = {
  topK: SEMANTIC_TOP_K,
  messageRange: SEMANTIC_MESSAGE_RANGE,
  threshold: SEMANTIC_THRESHOLD,
  indexConfig: {          // DELETE THIS BLOCK
    type: 'hnsw',         // DELETE
    metric: 'dotproduct', // DELETE
    m: 16,                // DELETE
    efConstruction: 64,   // DELETE
  },                      // DELETE
};

// NEW:
memoryOptions.semanticRecall = {
  topK: SEMANTIC_TOP_K,
  messageRange: SEMANTIC_MESSAGE_RANGE,
  threshold: SEMANTIC_THRESHOLD,
};
```

### Step 3: Update log message at bottom of `createGearAgent()`

```typescript
// OLD:
console.log(`... four-tier memory (OM: ${OM_ENABLED ? 'enabled' : 'disabled'})`);

// NEW:
console.log(`... three-tier memory (working memory, conversation history, semantic recall)`);
```

### Step 4: Run lint + type check

Run: `npm run lint`
Expected: No errors

### Step 5: Commit

```bash
git add lib/mastra/mastra-agent.ts
git commit -m "chore(mastra): remove no-op observationalMemory and indexConfig

observationalMemory key does not exist in @mastra/memory v1.0.x.
indexConfig in semanticRecall is also silently ignored.
Both were dead configuration that caused false documentation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Rename `updateWorkingMemory` Tool ID

**Files:**
- Modify: `lib/mastra/tools/update-working-memory.ts`
- Modify: `lib/mastra/mastra-agent.ts`

Mastra's native working memory system has its own internal concept called "updateWorkingMemory". Using the same ID avoids potential conflicts.

### Step 1: Rename tool ID and key

In `update-working-memory.ts`:
```typescript
// OLD:
export const updateWorkingMemoryTool = createTool({
  id: 'updateWorkingMemory',

// NEW:
export const updateWorkingMemoryTool = createTool({
  id: 'persistUserProfile',
```

In `mastra-agent.ts`, rename the tool key:
```typescript
// OLD:
tools: {
  ...
  updateWorkingMemory: updateWorkingMemoryTool,
}

// NEW:
tools: {
  ...
  persistUserProfile: updateWorkingMemoryTool,
}
```

### Step 2: Update tool description to reference new ID

Also update the description in `update-working-memory.ts` if it self-references the old ID (check the `description` string).

### Step 3: Run lint

Run: `npm run lint`
Expected: No errors

### Step 4: Commit

```bash
git add lib/mastra/tools/update-working-memory.ts lib/mastra/mastra-agent.ts
git commit -m "refactor(mastra): rename updateWorkingMemory tool to persistUserProfile

Avoids potential naming collision with Mastra's internal working memory
update mechanism. Functionally identical.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Simplify `route.ts` – Stop Passing Manual History

**Files:**
- Modify: `app/api/mastra/chat/route.ts`

Now that `threadId` is passed (Task 1), Mastra automatically injects conversation history. We no longer need to:
1. Fetch conversation history manually via `memoryContext.history`
2. Pass `conversationHistory` to `streamMastraResponse()`
3. Build the `messages[]` array with history in `streamMastraResponse()`

> **IMPORTANT:** After this task, the custom `SupabaseMemoryAdapter` still saves messages to `conversation_memory` AND Mastra saves to `mastra_messages`. Both run in parallel. Task 6 removes the custom adapter.

### Step 1: Update `streamMastraResponse()` to not use conversation history

In `lib/mastra/mastra-agent.ts`, simplify the messages building in `streamMastraResponse()`:

```typescript
// OLD: builds long messages array from conversationHistory param
const MAX_HISTORY_MESSAGES = 20;
const messages: any[] = [];
if (conversationHistory && conversationHistory.length > 0) {
  const recentHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
  for (const msg of recentHistory) { ... }
}
messages.push({ role: 'user' as const, content: message });

// NEW: Only the current message - Mastra fetches history via threadId
const messages = [{ role: 'user' as const, content: message }];
```

Also remove `conversationHistory` from the function signature (or keep as unused for now - remove in Task 6 cleanup).

### Step 2: Update call site in `route.ts`

```typescript
// OLD (line ~851):
return await streamMastraResponse(agent, message, user.id, conversationId, memoryContext.history, currentLoadoutId);

// NEW:
return await streamMastraResponse(agent, message, user.id, conversationId, currentLoadoutId);
```

### Step 3: Remove history from system prompt notes

In `route.ts`, in `buildPromptContext()`, remove the history-count note since history is now handled natively:

```typescript
// DELETE this block (around line 441-444):
if (history.length > 0) {
  const historyNote = `\n**Conversation History:** ${history.length} previous messages are included...`;
  promptContext.gearList = (promptContext.gearList || '') + historyNote;
}
```

### Step 4: Run lint

Run: `npm run lint`
Expected: No errors

### Step 5: Manual test – verify memory continuity

1. Start a conversation, mention a preference ("I prefer ultralight gear")
2. Send a follow-up in the same conversation ("What did I say about my preference?")
3. Expected: Agent remembers (Mastra fetches history via threadId from PostgresStore)

### Step 6: Commit

```bash
git add lib/mastra/mastra-agent.ts app/api/mastra/chat/route.ts
git commit -m "refactor(mastra): stop passing manual history - Mastra handles it via threadId

Now that threadId is provided, Mastra's PostgresStore automatically injects
conversation history. No longer need to manually build/pass history array.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Remove Custom Memory Infrastructure

**Files:**
- Modify: `app/api/mastra/chat/route.ts` (remove imports + custom save calls)
- Modify: `lib/mastra/mastra-agent.ts` (remove `conversationHistory` param)
- Delete: `lib/mastra/memory-adapter.ts`
- Delete: `lib/mastra/memory-save.ts`
- Delete: `lib/mastra/memory-retry-queue.ts`
- Modify: `lib/mastra/index.ts` (remove exports)

### Step 1: Remove custom memory imports from `route.ts`

Delete these imports at the top of `route.ts`:

```typescript
// DELETE:
import { createMemoryAdapter, type SupabaseMemoryAdapter } from '@/lib/mastra/memory-adapter';
import { memoryRetryQueue } from '@/lib/mastra/memory-retry-queue';
import { saveToMemory } from '@/lib/mastra/memory-save';
```

### Step 2: Simplify the `MemoryContext` type

In `route.ts`, remove the adapter from `MemoryContext`:

```typescript
// OLD:
interface MemoryContext {
  available: boolean;
  adapter: SupabaseMemoryAdapter | null;
  history: Array<{ role: string; content: string }>;
  userContext: MastraUserContext | null;
  workingMemoryProfile: GearshackUserProfile | null;
  semanticRecallContext: string | null;
  warning?: string;
}

// NEW:
interface MemoryContext {
  available: boolean;
  workingMemoryProfile: GearshackUserProfile | null;
  warning?: string;
}
```

### Step 3: Simplify `fetchMemoryContext()` to only load working memory

The function currently fetches 4 things in parallel. After removing custom memory, it only needs to load the working memory profile (and handle the `warning` case for graceful degradation):

```typescript
async function fetchMemoryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<MemoryContext> {
  try {
    const supabaseClient = supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>;
    const workingMemoryProfile = await getWorkingMemory(supabaseClient, userId);
    return { available: true, workingMemoryProfile };
  } catch (error) {
    logWarn('Working memory unavailable', {
      userId,
      metadata: { error: error instanceof Error ? error.message : 'Unknown' },
    });
    return { available: false, workingMemoryProfile: null };
  }
}
```

> **NOTE:** Remove the `conversationId`, `currentLoadoutId`, `currentMessage` parameters from `fetchMemoryContext()` since they were only used for the custom adapter.

### Step 4: Update `fetchMemoryContext()` call in `POST handler`

```typescript
// OLD:
fetchMemoryContext(supabase, user.id, conversationId, currentLoadoutId, message)

// NEW:
fetchMemoryContext(supabase, user.id)
```

### Step 5: Remove `saveToMemory()` calls from `POST handler`

In the POST handler, find and remove:

1. **Fast-path memory save** (around line 769): Remove the entire `.catch()` block that calls `saveToMemory()` and `memoryRetryQueue.enqueue()`. The fast-path response can simply not save to custom memory (Mastra handles it).

2. **Main memory save** (around line 952): Remove the `saveToMemory()` call. Keep only the working memory save block:

```typescript
// DELETE this block in the memory_save traceWorkflowStep:
const messageIds = await saveToMemory(
  memoryContext.adapter,
  user.id,
  conversationId,
  message,
  fullResponse,
  isCorrection
);
if (messageIds) {
  Promise.all([
    embedAndStoreMessage(...),
    embedAndStoreMessage(...),
  ]).catch(...);
}

// KEEP only working memory save:
if (memoryContext.workingMemoryProfile) {
  getWorkingMemory(supabaseClient, user.id)
    .then((freshProfile) => saveWorkingMemory(supabaseClient, user.id, freshProfile))
    .catch((err) => { ... });
}
```

### Step 6: Remove `embedAndStoreMessage` / `searchSimilarMessages` imports

```typescript
// DELETE from imports:
import {
  searchSimilarMessages,
  embedAndStoreMessage,
  formatSemanticRecallForPrompt,
} from '@/lib/mastra/memory/semantic-recall';
```

Also remove `semanticRecallContext` from `MemoryContext`, `fetchMemoryContext()` return, and `buildPromptContext()` signature.

### Step 7: Remove now-unused variables from `buildPromptContext()`

Remove `history` parameter since we no longer pass conversation history:
```typescript
// OLD:
async function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  history: Array<{ role: string; content: string }>,  // DELETE
  ...
)

// NEW:
async function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  ...
)
```

Also update the call site in the POST handler accordingly.

### Step 8: Remove `isCorrection` (or simplify)

The correction detection (`detectCorrectionIntent`) was used to mark messages in the custom adapter. With Mastra native, we can keep it as a debugging note or remove it entirely. For now, keep the `isCorrection` variable but remove its use in `saveToMemory`.

### Step 9: Delete custom memory files

```bash
rm lib/mastra/memory-adapter.ts
rm lib/mastra/memory-save.ts
rm lib/mastra/memory-retry-queue.ts
```

### Step 10: Update `lib/mastra/index.ts` exports

Remove any exports of deleted modules:
- `saveWorkingMemoryDirect` should stay (used by `update-working-memory.ts`)
- Remove: any adapter/save/retry exports if they exist

Check current exports:
```bash
cat lib/mastra/index.ts
```

### Step 11: Run lint

Run: `npm run lint`
Expected: No errors (all deleted imports resolved)

### Step 12: Manual test – full conversation flow

1. Send a message in a new conversation
2. Send a follow-up referencing the first message
3. Expected: Agent remembers (Mastra native memory working)
4. Check Supabase: `conversation_memory` table should NOT grow (custom adapter removed)
5. Check Supabase: `mastra_messages` (or similar) table SHOULD grow

### Step 13: Commit

```bash
git add -A
git commit -m "refactor(mastra): remove custom memory adapter - replaced by Mastra native

Removes ~800 lines of custom memory infrastructure that was a workaround
for the missing threadId bug. Mastra native (PostgresStore + PgVector)
now handles all conversation storage and semantic recall.

Deleted files:
- lib/mastra/memory-adapter.ts (SupabaseMemoryAdapter - 560 lines)
- lib/mastra/memory-save.ts (saveToMemory utility)
- lib/mastra/memory-retry-queue.ts (retry queue)

Simplified:
- app/api/mastra/chat/route.ts (removed 4 custom memory imports + save calls)
- fetchMemoryContext() now only loads working memory profile

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Remove Dead Workflow Files

**Files:**
- Delete: `lib/mastra/workflows/trip-planner.ts`
- Delete: `lib/mastra/workflows/budget-optimization.ts`
- Delete: `lib/mastra/workflows/base.ts` (only used by the two deleted files)
- Modify: `lib/mastra/config.ts` (remove workflow exports)

### Step 1: Verify workflows are truly unused

Run: `grep -r "tripPlannerWorkflow\|budgetOptimizationWorkflow\|trip-planner\|budget-optimization" --include="*.ts" -l`

Expected: Only the workflow files themselves and `config.ts`. No route imports them.

### Step 2: Remove workflow imports/exports from `config.ts`

Find the `DEFAULT_WORKFLOWS` export in `config.ts`. Either set it to `[]` or remove entirely.

```typescript
// In config.ts, find DEFAULT_WORKFLOWS:
export const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [];
// Remove any imports of tripPlannerWorkflow, budgetOptimizationWorkflow
```

### Step 3: Delete workflow files

```bash
rm lib/mastra/workflows/trip-planner.ts
rm lib/mastra/workflows/budget-optimization.ts
rm lib/mastra/workflows/base.ts
```

### Step 4: Run lint

Run: `npm run lint`
Expected: No errors (no remaining references to deleted workflows)

### Step 5: Commit

```bash
git add -A
git commit -m "chore(mastra): remove dead workflow files (trip-planner, budget-optimization)

These workflows were defined but never imported or invoked from the chat
route or anywhere else in the codebase. They were unreachable dead code
that added confusion and maintenance burden.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Final Cleanup and Build Verification

**Files:**
- Modify: `lib/mastra/mastra-agent.ts` (clean up removed params)
- Modify: `lib/mastra/index.ts` (verify exports)

### Step 1: Remove unused imports across all modified files

Run: `npm run lint`
Fix any remaining `no-unused-vars` or unused import warnings.

### Step 2: Remove `conversationHistory` from `streamMastraResponse()` signature

The parameter was already emptied in Task 5. Now fully remove it from the signature if still present:

```typescript
// OLD:
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  conversationHistory?: Array<{ role: string; content: string }>,  // DELETE
  currentLoadoutId?: string
)

// NEW:
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  currentLoadoutId?: string
)
```

### Step 3: Remove `MEMORY_HISTORY_LIMIT` constant from `route.ts`

If no longer used:
```typescript
// DELETE:
const MEMORY_HISTORY_LIMIT = 50;
```

### Step 4: Remove `USER_CONTEXT_CACHE_TTL_MINUTES` and related cache logic

If `userContext` caching is still used (from `adapter.getUserContext()`), it needs to be removed too since the adapter is gone. If the `userContext` building (`buildUserContext()`) is still needed for the system prompt, keep it but remove the caching via adapter. Look for `storeUserContext()`, `getUserContext()` calls and remove them.

### Step 5: Production build check

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

### Step 6: Commit

```bash
git add -A
git commit -m "chore(mastra): final cleanup after native memory migration

- Remove conversationHistory param from streamMastraResponse()
- Remove MEMORY_HISTORY_LIMIT and unused constants
- Remove user context adapter caching (no adapter)
- Verify production build passes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Create Pull Request

### Step 1: Push branch

```bash
git push -u origin development
```

### Step 2: Create PR

```bash
gh pr create \
  --title "feat(mastra): fix native memory by adding threadId + remove custom adapter" \
  --base development \
  --body "$(cat <<'EOF'
## Summary

- **Critical fix**: Add `threadId` to `agent.stream()` - enables Mastra native PostgresStore + PgVector memory that was completely bypassed
- **Bug fix**: Fix `catalog_brands.name` ilike filter (PostgREST can't filter over joins)
- **Cleanup**: Remove ~800 lines of custom memory adapter that was a workaround for the threadId bug
- **Cleanup**: Remove no-op `observationalMemory` and `indexConfig` configs from Mastra agent
- **Cleanup**: Remove dead workflow files (trip-planner, budget-optimization - never invoked)
- **Refactor**: Rename `updateWorkingMemory` tool to `persistUserProfile` to avoid naming collision

## Test plan

- [ ] Send a message, verify Mastra creates `mastra_messages` rows in Supabase
- [ ] Start a conversation, mention a fact, continue conversation and verify agent remembers
- [ ] Test brand filter: ask "Show me all Hilleberg products" - verify results actually filter by brand
- [ ] Verify `conversation_memory` table no longer grows (custom adapter removed)
- [ ] Run `npm run build` - no TypeScript errors
- [ ] Run `npm run lint` - no lint errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Migration Notes

### Data continuity

- **`conversation_memory` table**: Remains in DB but no longer written to. Old history is preserved for reference. Can be deleted in a future migration after confirmation.
- **`user_working_memory` table**: Unchanged. Our custom working memory schema continues to work exactly as before.
- **Mastra tables**: Auto-created on first use when `threadId` is passed. Initially empty - semantic recall will improve as conversations accumulate.

### Semantic recall transition period

After the migration, semantic recall (vector similarity search for old conversations) will find fewer results initially, since Mastra's PgVector table starts empty. Our old embeddings in `conversation_memory_embeddings` are NOT migrated. This is acceptable - over time the new table fills up.

If old embeddings must be preserved, a data migration script would be needed to copy from `conversation_memory_embeddings` into Mastra's vector table format. This is out of scope for this plan.

### Environment variables to remove (after confirming all clear)

After the migration is stable, these env vars can be removed from `.env.local` and Vercel:
- `OBSERVATIONAL_MEMORY_ENABLED`
- `OM_MODEL`
- `OM_MESSAGE_TOKENS`
- `OM_OBSERVATION_TOKENS`
