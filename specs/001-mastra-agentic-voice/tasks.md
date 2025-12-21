# Tasks: Mastra Agentic Voice AI

**Feature Branch**: `001-mastra-agentic-voice`
**Created**: 2025-12-21
**Input**: Design documents from `/specs/001-mastra-agentic-voice/`

---

## Summary

**Total Tasks**: 112 tasks across 10 implementation phases
**User Stories**: 5 stories (2 P1, 2 P2, 1 P3)
**MVP Scope**: Phase 1-4 (Setup + Foundational + US1 + US2) = ~35 tasks
**Parallel Opportunities**: 45 tasks marked [P] can run in parallel within their phases

---

## Task Breakdown by User Story

| User Story | Priority | Tasks | Independent Test |
|------------|----------|-------|------------------|
| **US1: Persistent Memory** | P1 | 18 tasks | Have conversation → close app → reopen → AI recalls previous context |
| **US2: Trip Planning Workflow** | P1 | 15 tasks | Request trip plan with constraints → verify workflow executes all steps in <10s |
| **US3: GearGraph MCP** | P2 | 12 tasks | Ask for gear alternatives → verify MCP queries GearGraph and returns graph-derived insights |
| **US4: Voice Interaction** | P2 | 16 tasks | Record spoken question → verify end-to-end latency <3s |
| **US5: Personalized Expertise** | P3 | 8 tasks | Simulate 3-month history → ask for advice → verify AI synthesizes historical context |

---

## Dependencies Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS ALL USER STORIES
    ↓
    ├─→ Phase 3 (US1: Memory) ────────┐
    ├─→ Phase 4 (US2: Workflows) ─────┼─→ Phase 8 (Observability)
    ├─→ Phase 5 (US3: MCP) ───────────┤
    ├─→ Phase 6 (US4: Voice) ─────────┘
    └─→ Phase 7 (US5: Expertise)
              ↓
        Phase 9 (Rate Limiting & GDPR)
              ↓
        Phase 10 (Polish)
```

**Critical Path**: Setup → Foundational → US1 → US2 → Observability → Rate Limiting → Polish

---

## Format Convention

Tasks follow strict checklist format:
```
- [ ] T### [P] [US#] Description with exact file path
```

- **T###**: Sequential task ID (T001, T002, ...)
- **[P]**: Parallelizable (no dependencies on incomplete tasks)
- **[US#]**: User story label ([US1], [US2], etc.) for story phases
- **File path**: Absolute or relative from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure environment
**Duration**: 0.5 days
**Parallel Opportunities**: 5 tasks can run in parallel

- [X] T001 [P] Install Mastra dependencies: `npm install mastra @mastra/memory @modelcontextprotocol/sdk prom-client pino`
- [X] T002 [P] Install OpenTelemetry dependencies: `npm install @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/instrumentation-http`
- [X] T003 [P] Configure `.env.local` with Mastra environment variables (MASTRA_RUNTIME, MCP_TRANSPORT, OPENAI_API_KEY)
- [X] T004 [P] Create TypeScript interfaces in `types/mastra.ts` (ConversationMemory, WorkflowExecution, RateLimitTracking, GdprDeletionRecord)
- [X] T005 [P] Create instrumentation hook `instrumentation.ts` for Next.js OpenTelemetry setup

**Checkpoint**: Dependencies installed, environment configured, types defined

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation
**Duration**: 4-5 days
**Parallel Opportunities**: 8 tasks can run in parallel

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema (Sequential)

- [X] T006 Create Supabase migration `supabase/migrations/20250120_conversation_memory.sql` with conversation_memory table, indexes, RLS policies
- [X] T007 Create Supabase migration `supabase/migrations/20250122_workflow_executions.sql` with workflow_executions table, indexes, RLS policies
- [X] T008 Create Supabase migration `supabase/migrations/20250125_rate_limit_tracking.sql` with rate_limit_tracking table, indexes, RLS policies
- [X] T009 Create Supabase migration `supabase/migrations/20250126_gdpr_deletion_records.sql` with gdpr_deletion_records table, indexes, RLS policies
- [ ] T010 Apply all migrations to Supabase: `npx supabase db push`

### Core Mastra Agent (After database ready)

- [X] T011 [P] Create Mastra agent configuration in `lib/mastra/config.ts` (model: claude-sonnet-4-5, instructions: migrate from existing prompt-builder.ts)
- [X] T012 [P] Implement custom Supabase memory adapter in `lib/mastra/memory-adapter.ts` (saveMessages, getMessages, deleteMessages, last-write-wins conflict resolution)
- [X] T013 [P] Implement Supabase auth adapter in `lib/mastra/auth-adapter.ts` (MastraAuthSupabase integration)
- [X] T014 [P] Create Mastra agent initialization in `lib/mastra/agent.ts` (connects memory adapter, auth adapter, config)
- [X] T015 [P] Create SSE streaming wrapper in `lib/mastra/streaming.ts` (wrapMastraStreamForVercelAI function for useChat compatibility)
- [X] T016 [P] Migrate existing tools to Mastra format in `lib/mastra/tools/query-user-data.ts` (from lib/ai-assistant/tools/)
- [X] T017 [P] Migrate existing tools to Mastra format in `lib/mastra/tools/search-catalog.ts`
- [X] T018 [P] Migrate existing tools to Mastra format in `lib/mastra/tools/search-web.ts`

### Observability Foundation

- [X] T019 [P] Create structured logging module in `lib/mastra/logging.ts` (Pino JSON logger with context fields: userId, conversationId, traceId)
- [X] T020 [P] Create PII sanitizer in `lib/mastra/log-sanitizer.ts` (removes emails, phone numbers, sensitive data)
- [X] T021 [P] Create Prometheus metrics module in `lib/mastra/metrics.ts` (histograms, counters for agent latency, tool calls, errors)
- [X] T022 [P] Create distributed tracing module in `lib/mastra/tracing.ts` (OpenTelemetry span creation for workflows)

**Checkpoint**: Foundation ready - database tables exist, Mastra agent initializes, tools migrated, observability instrumented

---

## Phase 3: User Story 1 - Persistent Memory Across Sessions (Priority: P1) 🎯 MVP

**Goal**: Enable AI to recall conversation context across sessions and devices

**Independent Test**: Have conversation → close app → reopen → ask "What did we discuss earlier?" → verify AI recalls specific facts

**Duration**: 3-4 days
**Parallel Opportunities**: 6 tasks can run in parallel

### Implementation for User Story 1

- [X] T023 [P] [US1] Create chat API route `app/api/mastra/chat/route.ts` with POST handler (streaming SSE, Node.js runtime)
- [X] T024 [P] [US1] Implement rate limiting logic in `lib/mastra/rate-limiter.ts` (tiered limits: unlimited simple, 20 workflows/hour, 40 voice/hour)
- [X] T025 [P] [US1] Create custom hook `hooks/ai-assistant/useMastraChat.ts` (state machine: idle → loading → streaming → success/error)
- [X] T026 [US1] Integrate memory adapter with chat route (save user message before agent call, save assistant response after)
- [X] T027 [US1] Implement memory retrieval in chat route (fetch last 50 messages from conversation_memory for context)
- [X] T028 [US1] Add memory correction handler in chat route (detect "Actually, that's wrong..." patterns, update stored facts)
- [X] T029 [US1] Implement graceful degradation in chat route (stateless mode when memory store unavailable, return warning)
- [X] T030 [US1] Add structured logging to chat route (log request start, memory retrieval, agent invocation, memory save, response complete)
- [X] T031 [US1] Add Prometheus metrics to chat route (histogram: agent latency, counter: requests by operation type, counter: errors by type)
- [X] T032 [US1] Add distributed tracing to chat route (create spans for memory retrieval, agent processing, memory save)

### User Story 1 Testing (Acceptance Scenarios from spec.md)

- [ ] T033 [US1] Test Scenario 1: Conversation in session A → close app → reopen session B → verify AI recalls facts from session A
- [ ] T034 [US1] Test Scenario 2: User asks "What did we discuss yesterday?" → verify AI provides summary of previous day's conversations
- [ ] T035 [US1] Test Scenario 3: User states "I prefer ultralight gear" → later conversation without restating → verify AI applies preference automatically
- [ ] T036 [US1] Test Scenario 4: Conversation on phone → switch to tablet → verify memory consistent across devices
- [ ] T037 [US1] Test Scenario 5: Simulate 90+ day old conversations → verify older memories archived/deleted

**Checkpoint**: User Story 1 complete - AI remembers conversations across sessions, devices, and time

---

## Phase 4: User Story 2 - Complex Trip Planning Workflow (Priority: P1) 🎯 MVP

**Goal**: Enable multi-step reasoning for trip planning with parallel data gathering

**Independent Test**: Request "Plan 5-day Sweden trip in February, <10kg" → verify workflow executes: intent → parallel (weather+inventory) → gaps → recommendations in <10s

**Duration**: 4-5 days
**Parallel Opportunities**: 4 tasks can run in parallel

### Implementation for User Story 2

- [X] T038 [P] [US2] Create workflow base framework in `lib/mastra/workflows/base.ts` (WorkflowDefinition, WorkflowStep interfaces, execution engine)
- [X] T039 [P] [US2] Create weather API integration in `lib/external-apis/weather.ts` (fetch Sweden February weather data)
- [X] T040 [P] [US2] Implement trip planner workflow in `lib/mastra/workflows/trip-planner.ts` (5 steps: intent → parallel data → gap analysis → graph query → synthesis)
- [X] T041 [US2] Implement Step 1 (Intent Analysis) in trip-planner.ts (parse location, season, weight constraints from user query)
- [X] T042 [US2] Implement Step 2 (Parallel Data Gathering) in trip-planner.ts (Promise.all for weather API + queryUserData tool)
- [X] T043 [US2] Implement Step 3 (Gap Analysis) in trip-planner.ts (compare inventory to environmental requirements, identify missing gear)
- [X] T044 [US2] Implement Step 4 (Graph Query) in trip-planner.ts (query MCP for alternatives that close gaps)
- [X] T045 [US2] Implement Step 5 (Recommendation Synthesis) in trip-planner.ts (stream final plan incrementally)
- [X] T046 [US2] Add workflow progress streaming in chat route (emit SSE events for each step: "Gathering weather data...", "Analyzing gaps...")
- [X] T047 [US2] Add workflow timeout handling (10-second max, return partial results on timeout)
- [X] T048 [US2] Add workflow error handling (weather API fails → proceed with cached data, emit warning)
- [X] T049 [US2] Add workflow execution tracking (insert into workflow_executions table with status, step_results)
- [X] T050 [US2] Add workflow metrics (histogram: step durations, counter: workflow success/failure/timeout)

### User Story 2 Testing (Acceptance Scenarios)

- [ ] T051 [US2] Test Scenario 1: Request trip plan with constraints → verify steps execute in correct order (intent → parallel data → gaps → graph → synthesis)
- [ ] T052 [US2] Test Scenario 2: Verify weather + inventory queries execute in parallel (not sequentially, benchmark latency)
- [ ] T053 [US2] Test Scenario 3: Verify AI identifies gear gaps → queries GearGraph via MCP for alternatives matching constraints
- [ ] T054 [US2] Test Scenario 4: Verify final plan streams incrementally (environment → gaps → recommendations → cost estimate)
- [ ] T055 [US2] Test Scenario 5: Simulate weather API failure → verify AI explains error, provides partial results

**Checkpoint**: User Story 2 complete - Trip planning workflow executes multi-step reasoning with parallel operations

---

## Phase 5: User Story 3 - GearGraph Intelligence via MCP (Priority: P2)

**Goal**: Enable AI to query GearGraph for gear alternatives and graph-derived insights

**Independent Test**: Ask "What's a lighter alternative to MSR PocketRocket?" → verify MCP queries graph, returns alternatives with comparative metrics

**Duration**: 3-4 days
**Parallel Opportunities**: 3 tasks can run in parallel

### Implementation for User Story 3

- [X] T056 [P] [US3] Create MCP client wrapper in `lib/mastra/mcp-client.ts` (stdio transport for dev, HTTP for prod)
- [X] T057 [P] [US3] Implement MCP tool discovery in mcp-client.ts (listTools, cache tool schemas)
- [X] T058 [P] [US3] Create MCP tool wrappers in `lib/mastra/tools/mcp-graph.ts` (findAlternatives, searchGear, queryGearGraph)
- [X] T059 [US3] Register MCP tools with Mastra agent in `lib/mastra/agent.ts` (dynamic tool registration from MCP server)
- [X] T060 [US3] Add MCP error handling (5-second timeout, fallback to searchCatalog tool)
- [X] T061 [US3] Add MCP metrics (counter: tool calls by name, histogram: MCP call latency, counter: MCP errors/timeouts)
- [X] T062 [US3] Add MCP connection health check (periodic ping to MCP server, emit warning on unavailable)

### User Story 3 Testing (Acceptance Scenarios)

- [X] T063 [US3] Test Scenario 1: Ask for alternatives to specific gear → verify MCP query retrieves similar items with weight/price/ratings
- [X] T064 [US3] Test Scenario 2: Verify MCP alternatives include graph-derived reasoning ("Most popular in your region", "Top 10% weight class")
- [X] T065 [US3] Test Scenario 3: Ask "lighter alternative to X" → verify AI only returns items lighter than X (validates results)
- [X] T066 [US3] Test Scenario 4: Complex graph traversal ("Find tents used by users with my sleeping bag") → verify MCP tools invoked correctly
- [X] T067 [US3] Test Scenario 5: Simulate MCP server unavailable → verify fallback to catalog search, inform user

**Checkpoint**: User Story 3 complete - AI queries GearGraph via MCP for intelligent gear recommendations

---

## Phase 6: User Story 4 - Voice Interaction with Low Latency (Priority: P2)

**Goal**: Enable hands-free voice queries with <3s end-to-end latency

**Independent Test**: Record spoken question → verify transcription → AI processes → TTS plays → total latency <3s (P90)

**Duration**: 5-6 days
**Parallel Opportunities**: 8 tasks can run in parallel

### Implementation for User Story 4

#### Voice Input (Transcription)

- [X] T068 [P] [US4] Create Whisper integration in `lib/mastra/voice/whisper.ts` (OpenAI Whisper API wrapper)
- [X] T069 [P] [US4] Create transcription API route `app/api/mastra/voice/transcribe/route.ts` (POST, FormData audio upload)
- [X] T070 [P] [US4] Add transcription confidence check (threshold: 70%, retry prompt if below)
- [X] T071 [P] [US4] Create voice input hook `hooks/ai-assistant/useVoiceInput.ts` (MediaRecorder capture, upload, transcription)

#### Voice Output (TTS)

- [X] T072 [P] [US4] Create TTS integration in `lib/mastra/voice/tts.ts` (OpenAI TTS API with streaming support)
- [X] T073 [P] [US4] Create TTS API route `app/api/mastra/voice/synthesize/route.ts` (POST, text → audio stream)
- [X] T074 [P] [US4] Create voice output hook `hooks/ai-assistant/useVoiceOutput.ts` (TTS synthesis, Web Audio API playback)
- [X] T075 [P] [US4] Implement streaming TTS (start playback before synthesis completes)

#### Voice UI Components

- [X] T076 [P] [US4] Create voice input button `components/ai-assistant/VoiceInputButton.tsx` (mic icon, stateless)
- [X] T077 [P] [US4] Create recording indicator `components/ai-assistant/VoiceRecordingIndicator.tsx` (pulsing animation)
- [X] T078 [P] [US4] Create audio playback controls `components/ai-assistant/AudioPlaybackControls.tsx` (pause, stop, volume)
- [X] T079 [US4] Integrate voice components into existing chat UI (add voice button to message input)

#### Voice Pipeline Optimization

- [X] T080 [US4] Optimize audio encoding (reduce file size to <100KB for 10s clips, use optimal format)
- [X] T081 [US4] Add TTS response caching (common phrases like "I didn't catch that")
- [X] T082 [US4] Benchmark end-to-end latency (audio capture → transcribe → process → synthesize → playback)

### User Story 4 Testing (Acceptance Scenarios)

- [X] T083 [US4] Test Scenario 1: Speak clear question → verify transcription accuracy ≥95%
- [X] T084 [US4] Test Scenario 2: Verify transcribed text processed same as typed query (tool calls, memory, workflows)
- [X] T085 [US4] Test Scenario 3: Verify TTS synthesis plays automatically after AI response
- [X] T086 [US4] Test Scenario 4: Benchmark 100 voice queries → verify 90% <3s, 99% <5s end-to-end latency
- [X] T087 [US4] Test Scenario 5: Simulate noisy environment → verify confidence <70% triggers retry prompt
- [X] T088 [US4] Test Scenario 6: Verify pause button and live transcript appear during playback

**Checkpoint**: User Story 4 complete - Voice interaction works with <3s latency

---

## Phase 7: User Story 5 - Personalized Expertise Recall (Priority: P3)

**Goal**: Enable AI to synthesize long-term memory patterns for personalized recommendations

**Independent Test**: Simulate 3-month conversation history with preferences → ask "What should I upgrade?" → verify AI synthesizes historical context

**Duration**: 2-3 days
**Parallel Opportunities**: 3 tasks can run in parallel

### Implementation for User Story 5

- [ ] T089 [P] [US5] Create memory pattern analyzer in `lib/mastra/memory-analyzer.ts` (extract preferences, constraints, plans from history)
- [ ] T090 [P] [US5] Add semantic search to memory adapter (full-text search index on message_content with to_tsvector)
- [ ] T091 [P] [US5] Create memory summarization cron job (summarize conversations older than 30 days)
- [ ] T092 [US5] Integrate memory patterns with agent instructions (inject user preferences into system prompt)
- [ ] T093 [US5] Add conflict detection for preferences (e.g., "ultralight" vs "durable" → ask clarifying question)
- [ ] T094 [US5] Add proactive pattern detection (detect shift from summer to winter trips → ask confirmation)

### User Story 5 Testing (Acceptance Scenarios)

- [ ] T095 [US5] Test Scenario 1: State preferences across conversations → verify AI applies automatically without restatement
- [ ] T096 [US5] Test Scenario 2: Mention planned trip weeks earlier → verify AI prioritizes upgrades for that trip
- [ ] T097 [US5] Test Scenario 3: Complain about gear performance → verify AI prioritizes replacing that item
- [ ] T098 [US5] Test Scenario 4: Simulate conflicting preferences → verify AI acknowledges trade-off, asks clarifying question
- [ ] T099 [US5] Test Scenario 5: Simulate pattern shift (summer → winter trips) → verify AI proactively asks about change

**Checkpoint**: User Story 5 complete - AI provides expert-level personalized recommendations

---

## Phase 8: Observability & Rate Limiting

**Purpose**: Production-grade monitoring and cost control

**Duration**: 3-4 days
**Parallel Opportunities**: 4 tasks can run in parallel

**Note**: This phase can start after Phase 2 (Foundational) completes, running in parallel with user story phases

### Observability

- [X] T100 [P] Create Prometheus metrics endpoint `app/api/mastra/metrics/route.ts` (GET, returns text/plain Prometheus format)
- [X] T101 [P] Add latency percentile metrics (P50/P95/P99 for agent responses, workflow steps, tool calls)
- [X] T102 [P] Add error rate metrics by type (network, validation, timeout, MCP failure)
- [X] T103 [P] Configure OpenTelemetry exporter in instrumentation.ts (send traces to Grafana Cloud/Jaeger)

### Rate Limiting

- [X] T104 Implement tiered rate limiting in chat route (check rate_limit_tracking table before agent invocation)
- [X] T105 Add rate limit headers to chat response (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [X] T106 Add rate limit exceeded response (429 status, Retry-After header, clear error message)

**Checkpoint**: Observability complete - metrics exported, traces visible, rate limits enforced

---

## Phase 9: GDPR Compliance

**Purpose**: Data deletion rights and retention policies

**Duration**: 2-3 days
**Parallel Opportunities**: 2 tasks can run in parallel

- [X] T107 [P] Create memory deletion endpoint `app/api/mastra/memory/route.ts` (DELETE handler)
- [X] T108 [P] Implement GDPR deletion logic in `lib/mastra/gdpr.ts` (delete conversation_memory, workflow_executions, rate_limit_tracking)
- [X] T109 Create deletion audit trail (insert into gdpr_deletion_records with status tracking)
- [X] T110 Create deletion status endpoint `app/api/mastra/memory/deletion-status/[deletionId]/route.ts` (GET handler)
- [X] T111 Create 90-day retention cron job migration `supabase/migrations/20250127_data_retention_cron.sql` (auto-delete old conversations)
- [X] T112 Implement log sanitization (anonymize userId in structured logs after deletion)

**Checkpoint**: GDPR compliance complete - users can delete data, 90-day retention enforced

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

**Duration**: 2-3 days

- [X] T113 Update frontend to use useMastraChat hook (replace existing useChat with new Mastra-powered version)
- [ ] T114 Add workflow progress indicators to UI (show step names during trip planning)
- [ ] T115 Add memory settings dialog (show stored facts, allow corrections)
- [ ] T116 Add voice settings dialog (enable/disable, language preference)
- [ ] T117 Update developer documentation (`quickstart.md` validation, API reference updates)
- [ ] T118 Security audit (input sanitization, RLS policy verification, API key rotation)
- [ ] T119 Performance optimization (reduce bundle size, optimize database queries)
- [ ] T120 Load testing (25 concurrent users, verify no degradation)

**Checkpoint**: Feature complete and production-ready

---

## Execution Strategy

### MVP First (User Story 1 + 2 Only)

**Goal**: Fastest path to core agentic value

1. **Phase 1**: Setup (0.5 days)
2. **Phase 2**: Foundational (4-5 days) ← CRITICAL
3. **Phase 3**: User Story 1 - Memory (3-4 days)
4. **Phase 4**: User Story 2 - Workflows (4-5 days)
5. **Phase 8**: Observability (3-4 days)
6. **Phase 9**: GDPR (2-3 days)
7. **Phase 10**: Polish (2-3 days)

**Total**: ~20-28 days (4-6 weeks) for P1 stories only

### Incremental Delivery (All Stories)

**Goal**: Add value incrementally, validate each story independently

1. **Phase 1-2**: Foundation (5-6 days)
2. **Phase 3**: US1 → Deploy/Demo (MVP: memory works!)
3. **Phase 4**: US2 → Deploy/Demo (MVP: workflows work!)
4. **Phase 5**: US3 → Deploy/Demo (Graph intelligence!)
5. **Phase 6**: US4 → Deploy/Demo (Voice interaction!)
6. **Phase 7**: US5 → Deploy/Demo (Personalized expertise!)
7. **Phase 8-10**: Production hardening (7-10 days)

**Total**: ~33-43 days (7-9 weeks) for all stories

### Parallel Team Strategy

**With 3 developers:**

1. **Week 1**: All devs on Setup + Foundational together
2. **Week 2-3**: Dev A (US1), Dev B (US2), Dev C (US3) in parallel
3. **Week 4**: Dev A (US4), Dev B (US5), Dev C (Observability) in parallel
4. **Week 5-6**: All devs on GDPR, Polish, and integration testing

**Total**: ~30-38 days (6-8 weeks) with parallelization

---

## Dependencies Within Phases

### Phase 3 (User Story 1) Internal Dependencies

```
T023 (chat route) ← T024 (rate limiter)
T023 (chat route) ← T025 (useMastraChat hook)
T026 (memory integration) ← T023 (chat route exists)
T027-T032 (all features) ← T026 (basic memory works)
```

### Phase 4 (User Story 2) Internal Dependencies

```
T038 (workflow base) ← foundation for all workflow tasks
T041-T045 (workflow steps) ← T038 (base exists)
T041 (intent) → T042 (parallel data) → T043 (gaps) → T044 (graph) → T045 (synthesis)
T046-T050 (workflow features) ← T041-T045 (steps complete)
```

### Phase 6 (Voice) Internal Dependencies

```
T068-T071 (voice input) can run in parallel
T072-T075 (voice output) can run in parallel
T076-T078 (UI components) can run in parallel
T079 (integration) ← all voice input/output complete
T080-T082 (optimization) ← T079 (integration works)
```

---

## Parallel Execution Examples

### Setup Phase (All in parallel)

```bash
Task T001: "Install Mastra dependencies"
Task T002: "Install OpenTelemetry dependencies"
Task T003: "Configure .env.local"
Task T004: "Create types/mastra.ts"
Task T005: "Create instrumentation.ts"
```

### Foundational Phase (After database migrations)

```bash
Task T011: "Create lib/mastra/config.ts"
Task T012: "Create lib/mastra/memory-adapter.ts"
Task T013: "Create lib/mastra/auth-adapter.ts"
Task T014: "Create lib/mastra/agent.ts"
Task T015: "Create lib/mastra/streaming.ts"
Task T016-T018: "Migrate tools to Mastra format"
Task T019-T022: "Create observability modules"
```

### User Story 1 (After chat route exists)

```bash
Task T027: "Implement memory retrieval"
Task T028: "Add memory correction handler"
Task T029: "Implement graceful degradation"
Task T030: "Add structured logging"
Task T031: "Add Prometheus metrics"
Task T032: "Add distributed tracing"
```

---

## Testing Strategy

### Independent Story Validation

**After each user story phase completes, test independently:**

1. **US1**: Close app → reopen → verify memory recall (no other features needed)
2. **US2**: Request trip plan → verify workflow executes (no voice, no MCP needed)
3. **US3**: Ask for gear alternatives → verify MCP queries graph (no workflows needed)
4. **US4**: Record voice query → verify end-to-end latency (no workflows needed)
5. **US5**: Simulate long history → verify personalized advice (no voice needed)

**Each story should work independently and not break when others are added.**

---

## Success Metrics (from spec.md)

| Metric | Target | Validation Task |
|--------|--------|-----------------|
| **SC-001**: Memory recall accuracy | 95% across 100 conversations | T033-T037 (US1 testing) |
| **SC-002**: Workflow completion (P90) | <10 seconds | T051-T055 (US2 testing) |
| **SC-003**: MCP query success rate | 100% when available | T063-T067 (US3 testing) |
| **SC-004**: Voice latency (P90) | <3 seconds end-to-end | T086 (US4 benchmarking) |
| **SC-006**: Preference application | 90% of recommendations | T095-T099 (US5 testing) |
| **SC-012**: Concurrent user capacity | 25 users no degradation | T120 (load testing) |

---

## Notes

- **[P] tasks**: Different files, can run in parallel
- **[US#] labels**: Map task to specific user story for traceability
- **Checkpoints**: Stop and validate story independently before proceeding
- **MVP Scope**: Phases 1-4 deliver core agentic value (memory + workflows)
- **Avoid**: Cross-story dependencies that break independence
- **Commit**: After each task or logical group of parallelizable tasks
