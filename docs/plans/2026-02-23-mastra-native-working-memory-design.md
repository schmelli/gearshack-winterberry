# Mastra Native Working Memory Migration — Design

> **Status:** Approved
> **Date:** 2026-02-23
> **Branch:** development

## Goal

Replace the hybrid custom/native Working Memory system with Mastra's fully native Working Memory.
Eliminates duplicate storage, conflicting tool registrations, and manual system-prompt injection.

## Context

After the Mastra native memory migration (2026-02-21), Tiers 2 + 3 (Conversation History, Semantic Recall)
are fully native via `threadId`. Working Memory (Tier 1) still runs as a dual system:

- **Custom path:** `user_working_memory` Supabase table → `getWorkingMemory()` → manual system-prompt injection → `persistUserProfile` tool → `saveWorkingMemoryDirect()`
- **Mastra native path:** `workingMemory: { enabled: true, schema: GearshackUserProfileSchema }` configured but writing to its OWN `mastra_resources` table — completely separate from the custom path

Both systems run in parallel, causing duplicate WM sections in the prompt and two competing tools.

## Architecture: Before → After

### Before (hybrid)
```
route.ts
  → getWorkingMemory()        ← reads user_working_memory (Supabase)
  → formatWorkingMemoryForPrompt()
  → buildWorkingMemoryInstructions()
  → system prompt (manual injection)
                ↓
Agent tools: persistUserProfile  ← writes user_working_memory (Supabase)
             + Mastra native updateWorkingMemory (empty, unused)
```

### After (fully native)
```
Mastra Memory (WorkingMemory Processor, scope: resource)
  → reads mastra_resources.workingMemory  ← single source of truth
  → auto-injects JSON profile into every prompt
  → registers updateWorkingMemory tool automatically

route.ts: no working memory code
Agent tools: Mastra native updateWorkingMemory only
```

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Data format | Keep `GearshackUserProfileSchema` (Zod) | Mastra validates natively against it |
| Existing data | Migrate via script | No data loss |
| persistUserProfile tool | Remove, use Mastra native | Cleaner, less code |
| German/English WM instructions | Remove from prompt builder | Mastra's WorkingMemory Processor provides instructions |
| `user_working_memory` table | Keep (unused), document for future GDPR deletion | Safe, no destructive DB ops |

## Files to Delete

| File | Reason |
|------|--------|
| `lib/mastra/tools/update-working-memory.ts` | Replaced by Mastra native updateWorkingMemory tool |
| `lib/mastra/memory/working-memory-adapter.ts` | Custom Supabase adapter no longer needed |
| `lib/mastra/memory/embedding-service.ts` | Dead code — Mastra handles embeddings natively |
| `lib/mastra/memory/semantic-recall.ts` | Dead code — Mastra handles semantic recall natively |

## Files to Modify

| File | Change |
|------|--------|
| `lib/mastra/mastra-agent.ts` | Remove `persistUserProfile` from tools |
| `app/api/mastra/chat/route.ts` | Remove `MemoryContext`, `fetchMemoryContext()`, all `getWorkingMemory`/`saveWorkingMemory` calls |
| `lib/mastra/prompt-builder.ts` or `lib/mastra/config.ts` | Remove WM section (manual injection) from system prompt |
| Tests | Remove `update-working-memory.test.ts`, update `mastra-agent.test.ts` |

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/migrate-working-memory.ts` | One-shot: copies user_working_memory → mastra_resources |

## Migration Script Design

```typescript
// scripts/migrate-working-memory.ts
// Reads all rows from user_working_memory, writes to mastra_resources via Memory API
// Uses existing Memory instance so validation + storage are handled by Mastra
// Idempotent: safe to re-run (upsert semantics)
```

## Storage

- **Before:** `user_working_memory` (Supabase, custom schema)
- **After:** `mastra_resources` (Mastra-managed, column: `workingMemory TEXT`)
- The `mastra_resources` table is auto-created by Mastra's PostgresStore on first run

## What Mastra's Native WM Does Automatically

1. On every `agent.stream()` with `resourceId` + `threadId`:
   - Reads `mastra_resources WHERE id = resourceId`
   - Injects working memory JSON as a system message
   - Validates against `GearshackUserProfileSchema`

2. Registers `updateWorkingMemory` tool:
   - Agent calls it with full updated JSON profile
   - Mastra validates + persists to `mastra_resources`
   - Schema-based: type-safe, no invalid data possible

## Success Criteria

- [ ] No references to `user_working_memory` table in active code
- [ ] No manual WM injection in `route.ts` or `prompt-builder.ts`
- [ ] Agent has exactly ONE working memory tool (Mastra native)
- [ ] Existing user profiles migrated to `mastra_resources`
- [ ] All tests pass
- [ ] Build passes
