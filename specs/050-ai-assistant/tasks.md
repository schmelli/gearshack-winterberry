# Tasks: GearShack AI Assistant

**Input**: Design documents from `/specs/050-ai-assistant/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in specification - focus on implementation tasks

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web application structure (Next.js App Router):
- `app/[locale]/` - Next.js routes and Server Actions
- `components/ai-assistant/` - React components
- `hooks/ai-assistant/` - Custom hooks
- `types/ai-assistant.ts` - TypeScript interfaces
- `lib/ai-assistant/` - Utility functions
- `supabase/migrations/` - Database migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [ ] T001 Install Vercel AI SDK dependencies (ai, @ai-sdk/anthropic) via npm
- [ ] T002 [P] Install OpenTelemetry dependencies (@opentelemetry/sdk-node, @opentelemetry/api, @opentelemetry/instrumentation, @opentelemetry/exporter-trace-otlp-http, @opentelemetry/exporter-metrics-otlp-http, @opentelemetry/exporter-logs-otlp-http, @opentelemetry/auto-instrumentations-node, @opentelemetry/instrumentation-pg) via npm
- [ ] T003 [P] Configure environment variables in .env.local (AI_GATEWAY_API_KEY, AI_CHAT_MODEL, AI_CHAT_ENABLED, OTEL endpoints)
- [ ] T004 [P] Create instrumentation.node.ts with OpenTelemetry SDK initialization at repository root
- [ ] T005 [P] Enable experimental.instrumentationHook in next.config.ts
- [ ] T006 Run database migration supabase/migrations/050_ai_assistant.sql to create conversations, messages, rate_limits, cached_responses tables
- [ ] T007 [P] Regenerate Supabase TypeScript types: npx supabase gen types typescript > types/supabase.ts
- [ ] T008 [P] Add subscription_tier column to user_profiles table if not exists (migration: ALTER TABLE user_profiles ADD COLUMN subscription_tier text CHECK (subscription_tier IN ('standard', 'trailblazer')) DEFAULT 'standard')
- [ ] T009 Create types/ai-assistant.ts with Conversation, Message, InlineCard, Action, UserContext, RateLimitStatus interfaces from data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create lib/ai-assistant/ai-client.ts with Vercel AI SDK initialization (anthropic model, API key configuration)
- [ ] T011 [P] Create lib/ai-assistant/prompt-builder.ts with buildSystemPrompt function (context-aware prompt construction per contracts/ai-query.md)
- [ ] T012 [P] Create lib/ai-assistant/response-parser.ts with parseAIResponse function (extract inline cards, actions from AI responses)
- [ ] T013 [P] Create lib/ai-assistant/cache-strategy.ts with getCachedResponse, cacheResponse functions (graceful degradation pattern)
- [ ] T014 [P] Create lib/ai-assistant/sync-protocol.ts with Supabase Realtime event handlers (Postgres Changes, Broadcast events)
- [ ] T015 [P] Create lib/ai-assistant/observability.ts with OpenTelemetry tracer, metrics, logging utilities
- [ ] T016 Create app/[locale]/ai-assistant/actions.ts with Server Action stub: sendAIMessage (authentication, rate limit check, conversation creation)
- [ ] T017 [P] Implement check_rate_limit Supabase function in migration (already in 050_ai_assistant.sql, verify deployment)
- [ ] T018 [P] Implement increment_rate_limit Supabase function in migration (already in 050_ai_assistant.sql, verify deployment)
- [ ] T019 [P] Seed cached_responses table with common queries (base weight, reduce pack weight - already in migration, verify)
- [ ] T020 Create hooks/ai-assistant/useConversationSync.ts with Supabase Realtime subscription setup (Postgres Changes for messages, Broadcast for typing/context)
- [ ] T021 [P] Create hooks/ai-assistant/useRateLimiting.ts with rate limit state management, countdown timer, broadcast listener
- [ ] T022 [P] Create hooks/ai-assistant/useContextDetection.ts with screen context detection (usePathname, inventory count fetching)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 6 - Upgrade Modal for Standard Users (Priority: P1) 🎯 MVP

**Goal**: Monetization - Show upgrade modal to standard users when they tap AI icon, driving Trailblazer conversions

**Independent Test**: Sign in as standard user, tap AI icon in title bar, verify upgrade modal appears with headline, features, example questions, CTA button navigates to upgrade flow. Close modal and verify it dismisses correctly.

### Implementation for User Story 6

- [ ] T023 [P] [US6] Create components/ai-assistant/AIAssistantButton.tsx with icon button, Trailblazer badge overlay, onClick handler (stateless component)
- [ ] T024 [P] [US6] Create components/ai-assistant/UpgradeModal.tsx with Dialog wrapper, headline "Your Personal Gear Expert Awaits", feature highlights, example questions, CTA button (stateless component)
- [ ] T025 [US6] Create hooks/ai-assistant/useSubscriptionCheck.ts with subscription tier check (query user_profiles.subscription_tier from Supabase)
- [ ] T026 [US6] Integrate AIAssistantButton into app/[locale]/layout.tsx title bar (next to messages icon, conditionally show for logged-in users)
- [ ] T027 [US6] Wire up AIAssistantButton onClick to show UpgradeModal for standard users (useSubscriptionCheck hook, conditional modal rendering)
- [ ] T028 [US6] Add i18n translations for upgrade modal content (messages/en.json, messages/de.json - headline, features, questions, CTA button)
- [ ] T029 [US6] Implement CTA button navigation to Trailblazer upgrade flow (router.push to existing upgrade route)
- [ ] T030 [US6] Add observability: track engagement.modal.opens metric when upgrade modal displays (OpenTelemetry counter)

**Checkpoint**: At this point, User Story 6 should be fully functional - standard users see upgrade modal, Trailblazer users ready for chat (next story)

---

## Phase 4: User Story 1 - Quick Fact Lookup (Priority: P1) 🎯 MVP

**Goal**: Core value proposition - Users can ask AI about gear specifications and get instant answers with inline preview cards

**Independent Test**: Open chat modal as Trailblazer user, ask "What's the R-value of my sleeping pad?", verify AI responds with accurate specification from user's inventory and displays inline gear card. Close/reopen modal and verify conversation persists.

### Implementation for User Story 1

- [ ] T031 [P] [US1] Create components/ai-assistant/AIAssistantModal.tsx with Dialog wrapper, modal header, message list container, input area (stateless component)
- [ ] T032 [P] [US1] Create components/ai-assistant/ChatInterface.tsx with main chat UI layout, scroll area, context display (stateless component)
- [ ] T033 [P] [US1] Create components/ai-assistant/MessageList.tsx with conversation history display, message grouping by role (stateless component)
- [ ] T034 [P] [US1] Create components/ai-assistant/MessageBubble.tsx with individual message rendering, timestamp, role-based styling (stateless component)
- [ ] T035 [P] [US1] Create components/ai-assistant/InlineGearCard.tsx with gear preview card (image, name, brand, key specs from InlineCard type)
- [ ] T036 [P] [US1] Create components/ai-assistant/ChatInput.tsx with message input field, send button, rate limit display, character counter (stateless component)
- [ ] T037 [US1] Create hooks/ai-assistant/useAIChat.ts with conversation management (sendMessage function, optimistic updates, AI streaming, message state)
- [ ] T038 [US1] Create hooks/ai-assistant/useConversationHistory.ts with message persistence (fetch from Supabase, pagination, 90-day retention)
- [ ] T039 [US1] Implement sendAIMessage Server Action in app/[locale]/ai-assistant/actions.ts (Trailblazer check, rate limit, AI query via Vercel AI SDK, streaming response, save to database)
- [ ] T040 [US1] Add conversation creation logic in sendAIMessage (create conversation record if first message, update context_snapshot)
- [ ] T041 [US1] Implement AI streaming response handling in useAIChat (createStreamableValue consumption, chunk-by-chunk updates, inline card extraction)
- [ ] T042 [US1] Add gear inventory context injection in sendAIMessage (fetch user's gear items, inject into system prompt via buildSystemPrompt)
- [ ] T043 [US1] Implement inline gear card rendering in MessageBubble (parse message.inline_cards JSONB, render InlineGearCard components)
- [ ] T044 [US1] Wire up AIAssistantButton onClick for Trailblazer users to open AIAssistantModal
- [ ] T045 [US1] Add observability: track ai.requests.total, ai.response.latency metrics in sendAIMessage (OpenTelemetry histogram)
- [ ] T046 [US1] Add error handling for AI failures in sendAIMessage (try/catch with getCachedResponse fallback, AIChatError with user-friendly messages)
- [ ] T047 [US1] Implement rate limit enforcement in sendAIMessage (check_rate_limit RPC call, increment_rate_limit, throw error if exceeded)
- [ ] T048 [US1] Display rate limit error in ChatInput (show countdown timer, disable input when rate limited, toast notification)
- [ ] T049 [US1] Add i18n translations for chat UI (messages/en.json, messages/de.json - placeholders, send button, error messages)
- [ ] T050 [US1] Implement conversation history loading in useConversationHistory (fetch messages from Supabase on modal open, display in MessageList)
- [ ] T051 [US1] Add Supabase Realtime sync for new messages in useConversationSync (Postgres Changes subscription, handleNewMessage to update local state)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can open chat, ask questions, get AI responses with inline cards, see conversation history persist

---

## Phase 5: User Story 2 - Gear Comparison and Alternatives (Priority: P1) 🎯 MVP

**Goal**: Streamline gear research - AI provides context-aware alternatives with actionable buttons (Add to Wishlist, Compare, Send Message)

**Independent Test**: View any gear item detail page, open AI chat, verify context-aware greeting, ask for alternatives, verify AI provides 3-4 alternatives with comparative metrics, tap "Add to Wishlist" button, confirm item added to wishlist and inline confirmation appears.

### Implementation for User Story 2

- [ ] T052 [P] [US2] Create components/ai-assistant/ActionButtons.tsx with Add to Wishlist, Compare, Send Message buttons (stateless component, onClick handlers via props)
- [ ] T053 [US2] Create hooks/ai-assistant/useChatActions.ts with action execution functions (addToWishlist, compareGear, sendCommunityMessage, navigateToScreen - call Server Actions)
- [ ] T054 [US2] Implement addToWishlist Server Action in app/[locale]/ai-assistant/actions.ts (auth check, gear item validation, update gear_items.status='wishlist', return success response)
- [ ] T055 [P] [US2] Implement compareGear Server Action in app/[locale]/ai-assistant/actions.ts (validate gear item IDs, return comparison URL with query params)
- [ ] T056 [P] [US2] Implement sendCommunityMessage Server Action in app/[locale]/ai-assistant/actions.ts (validate recipient, create/get conversation, insert message, return conversation ID)
- [ ] T057 [P] [US2] Implement navigateToScreen Server Action in app/[locale]/ai-assistant/actions.ts (validate destination, build navigation URL, return path)
- [ ] T058 [US2] Integrate Vercel AI SDK tools in sendAIMessage (addToWishlist tool, compareGear tool, sendMessage tool, navigate tool - map to Server Actions)
- [ ] T059 [US2] Update response-parser.ts to extract Action objects from AI tool calls (parse tool results, create Action JSONB records)
- [ ] T060 [US2] Add action rendering in MessageBubble (parse message.actions JSONB, render ActionButtons with status indicators)
- [ ] T061 [US2] Implement action status tracking in useChatActions (pending → completed/failed states, optimistic UI updates, rollback on errors)
- [ ] T062 [US2] Add context-aware greeting in buildSystemPrompt when currentLoadoutId exists (inject "You're viewing [loadout name]" into system prompt)
- [ ] T063 [US2] Implement gear alternative recommendations in AI prompt (inject user's current gear item, request alternatives with comparative metrics)
- [ ] T064 [US2] Add inline confirmation messages in MessageBubble when actions complete (e.g., "✓ Done! [item] is now on your wishlist")
- [ ] T065 [US2] Add inline error messages in MessageBubble when actions fail (show error reason, "Try again" button)
- [ ] T066 [US2] Implement navigation for Compare action (router.push with compareUrl from Server Action response)
- [ ] T067 [US2] Add observability: track ai.tool.calls.total, ai.tool.duration metrics in sendAIMessage (OpenTelemetry counter + histogram by tool name)
- [ ] T068 [US2] Add i18n translations for action buttons and confirmations (messages/en.json, messages/de.json)
- [ ] T069 [US2] Implement destructive action confirmation in useChatActions (detect remove/delete/clear verbs, show Dialog confirmation with "Are you sure?" message before execution)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can get info, alternatives, and execute actions with inline confirmations

---

## Phase 6: User Story 3 - Inventory Analysis and Base Weight (Priority: P2)

**Goal**: Analytical insights - AI calculates total weight, provides category breakdowns, suggests budget-filtered alternatives

**Independent Test**: With multiple gear items in inventory, ask "What's my base weight?", verify AI calculates total with category breakdowns, ask for alternatives "under €200", verify AI filters recommendations by budget.

### Implementation for User Story 3

- [ ] T070 [P] [US3] Create lib/ai-assistant/inventory-analyzer.ts with calculateBaseWeight, getCategoryBreakdowns functions (sum weights by category from gear_items)
- [ ] T071 [US3] Update buildSystemPrompt to inject inventory analysis data (total count, base weight, heaviest category)
- [ ] T072 [US3] Add budget filtering logic in AI prompt (inject price constraint into alternative search query)
- [ ] T073 [US3] Implement unit conversion in response-parser.ts (kg ↔ lbs based on user locale, display formatted weights)
- [ ] T074 [US3] Add category breakdown rendering in MessageBubble (table or list format for sleep system, shelter, backpack, kitchen, etc.)
- [ ] T075 [US3] Update AI system prompt to proactively suggest alternatives when heaviest category identified
- [ ] T076 [US3] Add i18n translations for inventory analysis terms (messages/en.json, messages/de.json - category names, units, base weight)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work - users can get specifications, alternatives, actions, and inventory analysis

---

## Phase 7: User Story 4 - Community Discovery and Marketplace (Priority: P2)

**Goal**: Transform community browsing - AI searches community offers based on criteria, displays results with seller info and quick actions

**Independent Test**: Ask "Is anyone selling an ultralight tent under 1kg?", verify AI searches community_posts/offers, displays results with seller username, item details, price, quick actions (View Profile, Send Message, Add to Wishlist).

### Implementation for User Story 4

- [ ] T077 [P] [US4] Create lib/ai-assistant/community-search.ts with searchCommunityOffers function (query community_posts, filter by weight/price/category, return CommunityOffer objects)
- [ ] T078 [US4] Create components/ai-assistant/CommunityOfferCard.tsx with community offer display (seller avatar, username, item name, price, location, distance if available)
- [ ] T079 [US4] Update buildSystemPrompt to enable community search queries (inject instruction "You can search community offers using searchCommunityOffers tool")
- [ ] T080 [US4] Implement searchCommunityOffers tool in sendAIMessage (Vercel AI SDK tool definition, execute community search, return CommunityOffer array)
- [ ] T081 [US4] Add CommunityOfferCard rendering in MessageBubble (parse inline_cards with type='community_offer', render CommunityOfferCard)
- [ ] T082 [US4] Add "View Profile" action button for community offers (navigateToScreen with user profile URL)
- [ ] T083 [US4] Update sendCommunityMessage Server Action to support pre-filled context (item name, offer reference in message body)
- [ ] T084 [US4] Add fallback message when no community offers found (AI responds "I didn't find any offers matching those criteria. Try broadening your search.")
- [ ] T085 [US4] Add i18n translations for community offer cards (messages/en.json, messages/de.json - seller, location, distance units)

**Checkpoint**: All primary user stories (1-4) functional - users can look up specs, compare, analyze, and discover community offers

---

## Phase 8: User Story 5 - Context-Aware Priority Recommendations (Priority: P3)

**Goal**: Advanced recommendations - AI analyzes wishlist, upcoming trips, inventory gaps, and provides purchase priority suggestions

**Independent Test**: Create wishlist with 10+ items, add upcoming trip to profile, open AI chat from wishlist screen, ask "Which should I buy first?", verify AI prioritizes items based on trip requirements and mentions community offers if available.

### Implementation for User Story 5

- [ ] T086 [P] [US5] Create lib/ai-assistant/priority-analyzer.ts with analyzeWishlistPriority function (fetch upcoming trips from profile, identify inventory gaps, score wishlist items)
- [ ] T087 [US5] Update useContextDetection to detect wishlist screen (add screen='wishlist' to context)
- [ ] T088 [US5] Update buildSystemPrompt with wishlist-specific context (wishlist count, upcoming trips, inventory gap analysis)
- [ ] T089 [US5] Add trip planning data integration in priority-analyzer.ts (query user profile for upcoming trips, extract seasonal requirements, activity types)
- [ ] T090 [US5] Implement inventory gap detection in priority-analyzer.ts (identify missing categories like rain jacket, sleeping bag for trip conditions)
- [ ] T091 [US5] Add community offer integration to priority recommendations (check if wishlist item has active community offer, include in AI response)
- [ ] T092 [US5] Update AI system prompt to recommend based on trip deadlines (prioritize items needed sooner)
- [ ] T093 [US5] Add fallback message when insufficient profile data exists (AI explains "I need more context - add trip plans to your profile")
- [ ] T094 [US5] Add i18n translations for priority recommendations (messages/en.json, messages/de.json - trip types, seasons, gap warnings)

**Checkpoint**: Advanced features complete - AI can now provide intelligent purchase prioritization based on user goals

---

## Phase 9: User Story 7 - Multilingual Interaction (Priority: P2)

**Goal**: International accessibility - AI responds in user's app language regardless of input language, preserves brand names, adapts units

**Independent Test**: Set app language to German, ask question in English, verify AI responds in German with accurate translations, brand names untranslated, units in metric (kg, °C).

### Implementation for User Story 7

- [ ] T095 [US7] Update buildSystemPrompt to enforce language consistency (inject "Respond ONLY in [locale language]. Do not switch languages mid-response.")
- [ ] T096 [US7] Add language detection in buildSystemPrompt (extract locale from context, map to language name: en→English, de→German)
- [ ] T097 [US7] Update response-parser.ts to validate brand name preservation (ensure AI doesn't translate product/brand names)
- [ ] T098 [US7] Implement unit conversion based on locale in response-parser.ts (kg/lbs, °C/°F, €/$ with locale-specific formatting)
- [ ] T099 [US7] Add locale-specific number formatting in MessageBubble (use Intl.NumberFormat for weights, prices, temperatures)
- [ ] T100 [US7] Test AI responses across all supported locales (en, de - verify translation quality, brand name preservation)
- [ ] T101 [US7] Update all i18n translation files with complete coverage (messages/en.json, messages/de.json - ensure no missing keys)

**Checkpoint**: Multilingual support complete - users in any supported locale get consistent, properly translated AI responses

---

## Phase 10: User Story 8 - Conversation Persistence and History (Priority: P3)

**Goal**: Conversation continuity - Users can view previous conversations, start new conversations, and see context updates as they navigate

**Independent Test**: Have conversation, close/reopen app, verify history loads. Start new conversation, verify context clears. Navigate from inventory to wishlist during active conversation, verify AI displays context change notification.

### Implementation for User Story 8

- [ ] T102 [P] [US8] Add "Start new conversation" button to AIAssistantModal header (creates new conversation record in Supabase)
- [ ] T103 [US8] Implement conversation creation in useConversationHistory (POST to Supabase conversations table, set as active conversation, clear active context to start fresh)
- [ ] T104 [US8] Add conversation list view to AIAssistantModal (optional: sidebar with recent conversations, select to switch active conversation)
- [ ] T105 [US8] Implement message pagination in useConversationHistory (load older messages on scroll up, lazy loading for performance)
- [ ] T106 [US8] Add context change detection in useContextDetection (watch for pathname changes, compare previous context)
- [ ] T107 [US8] Implement context update broadcast in useConversationSync (send Broadcast event on context change, receive in other tabs)
- [ ] T108 [US8] Add context change notification rendering in MessageBubble (system message: "You're now on your wishlist – can I help you with that?")
- [ ] T109 [US8] Update conversation updated_at timestamp on new messages (trigger in sendAIMessage Server Action)
- [ ] T110 [US8] Add historical message language preservation (display old messages in original language even if app language changed)
- [ ] T111 [US8] Add i18n translations for conversation management (messages/en.json, messages/de.json - "Start new conversation", context change notifications)

**Checkpoint**: All user stories complete - full conversation management with history, context awareness, and multi-session sync

---

## Phase 11: Multi-Session Synchronization (Cross-Cutting - all stories benefit)

**Purpose**: Real-time sync across tabs/devices - essential for SC-015 (95% sync within 2 seconds)

- [ ] T112 [P] Implement Postgres Changes subscription in useConversationSync (listen for INSERT on messages table filtered by conversation_id)
- [ ] T113 [P] Implement typing indicator broadcast in ChatInput (throttle to 300ms, send Broadcast event with isTyping, tabId)
- [ ] T114 [P] Implement typing indicator display in ChatInterface (receive Broadcast event, show/hide typing indicator, auto-clear after 3s)
- [ ] T115 [P] Implement context update broadcast in useContextDetection (send Broadcast event on screen navigation with new context, tabId)
- [ ] T116 [P] Implement rate limit broadcast in sendAIMessage (send Broadcast event when rate limit exceeded, all tabs receive notification)
- [ ] T117 [P] Add rate limit listener in useRateLimiting (receive Broadcast event, update local state, disable input, show countdown)
- [ ] T118 Implement reconnection with exponential backoff in useConversationSync (handle CHANNEL_ERROR, retry with 1s, 2s, 4s, 8s, 16s delays)
- [ ] T119 [P] Add online/offline event listeners in useConversationSync (reconnect on window 'online' event, show disconnected state on 'offline')
- [ ] T120 [P] Add connection status indicator to AIAssistantModal (display connected/connecting/disconnected state in header)
- [ ] T121 Add observability: track sync.message.latency, sync.broadcast.latency metrics (OpenTelemetry histogram, measure from commit_timestamp to client receive)

**Checkpoint**: Multi-session sync operational - all tabs/devices show identical state, messages sync in real-time

---

## Phase 12: Observability & Monitoring (Cross-Cutting - critical for production)

**Purpose**: Comprehensive observability per FR-041 to FR-048 - metrics, tracing, logging, alerts

- [ ] T122 [P] Implement AI response latency tracking in sendAIMessage (record histogram from user message submit to AI response complete, P50/P95/P99)
- [ ] T123 [P] Implement rate limiting event tracking (counter for rate_limit.hits, gauge for users affected)
- [ ] T124 [P] Implement sync event tracking (counter for sync.events.total, histogram for sync.event.duration by event type)
- [ ] T125 [P] Implement engagement funnel tracking (counters for engagement.modal.opens, engagement.messages.sent, engagement.actions.executed)
- [ ] T126 [P] Add distributed tracing to sendAIMessage (create span, propagate trace ID through AI SDK, database calls, sync operations)
- [ ] T127 [P] Add structured logging to all Server Actions (JSON format with timestamp, severity, user_id, conversation_id, trace_id, event_type)
- [ ] T128 [P] Add error logging with full context (log errors with stack trace, user_id, conversation_id, active screen, AI query, recovery action)
- [ ] T129 [P] Configure real-time alerts in observability.ts (AI failure rate >10%, sync failure rate >5%, P95 latency >5s, rate limit >20% users)
- [ ] T130 [P] Add AI error counter tracking (ai.errors.total by error type - timeout, rate_limit, service_unavailable)
- [ ] T131 [P] Add token usage tracking in sendAIMessage (record ai.tokens.used, ai.cost per message for budget monitoring)
- [ ] T132 [P] Implement comparison task timing metrics in observability.ts (track time-to-wishlist-addition for AI path vs manual path, measure 50% faster requirement per SC-011)

**Checkpoint**: Full observability operational - metrics dashboards, distributed tracing, structured logging, real-time alerts

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, validation

- [ ] T133 [P] Add accessibility improvements to chat UI (ARIA labels, keyboard navigation, screen reader support)
- [ ] T134 [P] Optimize message rendering performance (virtualization for long conversation histories, lazy loading for inline cards)
- [ ] T135 [P] Add empty state messaging (guide users when inventory is empty, no conversations yet, etc.)
- [ ] T136 [P] Add loading states for all async operations (skeleton loaders for message streaming, action execution)
- [ ] T137 [P] Implement error boundary for AIAssistantModal (catch React errors, display user-friendly fallback UI)
- [ ] T138 [P] Add rate limit countdown timer UI in ChatInput (display "X minutes until reset" when rate limited)
- [ ] T139 [P] Optimize AI prompt length (trim conversation history to last 10 messages, reduce token usage)
- [ ] T140 [P] Add message character limit validation in ChatInput (max 2000 chars, show counter, disable send if exceeded)
- [ ] T141 [P] Implement message retry mechanism (retry button for failed messages, exponential backoff)
- [ ] T142 [P] Add conversation export functionality (download conversation as JSON or text file)
- [ ] T143 [P] Optimize database queries with proper indexes (verify indexes in migration are applied: conversations_user_id_updated_at_idx, messages_conversation_id_created_at_idx)
- [ ] T144 [P] Add RLS policy testing (verify users can only access own conversations/messages)
- [ ] T145 [P] Test 90-day retention purge (verify pg_cron job runs, old conversations deleted - simulate by manually updating updated_at)
- [ ] T146 [P] Validate quickstart.md setup instructions (run through local dev setup, verify all steps work)
- [ ] T147 Code cleanup and refactoring across all files (remove console.logs, ensure consistent code style, run linter)
- [ ] T148 [P] Update CLAUDE.md with AI Assistant patterns and key learnings (add Vercel AI SDK usage, Supabase Realtime patterns to project documentation)
- [ ] T149 Security audit: validate input sanitization, RLS policies, rate limiting cannot be bypassed client-side
- [ ] T150 Performance testing: verify P95 latency <3s with realistic AI backend, sync latency <2s
- [ ] T151 [P] Browser compatibility testing (Chrome, Safari, Firefox - verify Realtime WebSocket connections work)
- [ ] T152 Mobile responsiveness testing (verify chat modal works on mobile viewports, touch interactions)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T009) - BLOCKS all user stories
- **User Story 6 (Phase 3)**: Depends on Foundational (T010-T022) - Can start after foundation complete
- **User Story 1 (Phase 4)**: Depends on Foundational (T010-T022) - Can start after foundation complete
- **User Story 2 (Phase 5)**: Depends on User Story 1 (T031-T051) - Builds on chat infrastructure
- **User Story 3 (Phase 6)**: Depends on Foundational (T010-T022) - Can run in parallel with US1/US2 if desired
- **User Story 4 (Phase 7)**: Depends on Foundational (T010-T022) - Can run in parallel with other user stories
- **User Story 5 (Phase 8)**: Depends on User Story 3, User Story 4 (inventory analysis + community search)
- **User Story 7 (Phase 9)**: Depends on User Story 1 (T031-T051) - Enhances existing chat functionality
- **User Story 8 (Phase 10)**: Depends on User Story 1 (T031-T051) - Enhances existing conversation management
- **Multi-Session Sync (Phase 11)**: Depends on Foundational (T020-T022) - Can run in parallel with user stories
- **Observability (Phase 12)**: Depends on Foundational (T015) - Can run in parallel with user stories
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 6 (P1)**: Independent - subscription check + upgrade modal (can start after Foundational)
- **User Story 1 (P1)**: Independent - core chat + AI query (can start after Foundational)
- **User Story 2 (P1)**: Depends on US1 - adds actions to existing chat
- **User Story 3 (P2)**: Independent - inventory analysis (can start after Foundational, integrates with US1 chat UI)
- **User Story 4 (P2)**: Independent - community search (can start after Foundational, integrates with US1 chat UI)
- **User Story 5 (P3)**: Depends on US3 (inventory analysis) + US4 (community search)
- **User Story 7 (P2)**: Depends on US1 - multilingual enhancement
- **User Story 8 (P3)**: Depends on US1 - conversation management enhancement

### Within Each User Story

- Models/types before hooks
- Hooks before components
- Server Actions before client-side integration
- Core chat before enhancements
- Observability alongside implementation (not afterthought)

### Parallel Opportunities

**Phase 1 (Setup)**: T001, T002, T003, T004, T005, T007, T008, T009 can all run in parallel (different files)

**Phase 2 (Foundational)**: T011, T012, T013, T014, T015, T017, T018, T019, T021, T022 can run in parallel (different files, no dependencies)

**Phase 3 (US6)**: T023, T024 can run in parallel (different components)

**Phase 4 (US1)**: T031-T036 (all components) can run in parallel, T045-T046 (observability) can run in parallel

**Phase 5 (US2)**: T052, T054, T055, T056, T057 can run in parallel (different files)

**Phase 6 (US3)**: T069 can run independently

**Phase 7 (US4)**: T076, T077 can run in parallel

**Phase 8 (US5)**: T085 can run independently

**Phase 9 (US7)**: T094-T100 can mostly run in parallel (translation files, parser updates)

**Phase 10 (US8)**: T101, T102, T103, T104 can run in parallel (different features)

**Phase 11 (Multi-Session)**: T111, T112, T113, T114, T115, T116, T118, T119 can all run in parallel (different Broadcast/Postgres Changes handlers)

**Phase 12 (Observability)**: T121-T130 can all run in parallel (different metrics, independent tracking)

**Phase 13 (Polish)**: T131-T144, T146, T147, T149, T150 can all run in parallel (different concerns, independent improvements)

---

## Parallel Example: User Story 1 (Core Chat)

```bash
# Launch all UI components in parallel:
Task: "Create AIAssistantModal.tsx with Dialog wrapper" (T031)
Task: "Create ChatInterface.tsx with main chat UI layout" (T032)
Task: "Create MessageList.tsx with conversation history display" (T033)
Task: "Create MessageBubble.tsx with individual message rendering" (T034)
Task: "Create InlineGearCard.tsx with gear preview card" (T035)
Task: "Create ChatInput.tsx with message input field" (T036)

# After components done, launch hooks in parallel:
Task: "Create useAIChat.ts with conversation management" (T037)
Task: "Create useConversationHistory.ts with message persistence" (T038)
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all lib utilities in parallel (no dependencies):
Task: "Create prompt-builder.ts with buildSystemPrompt" (T011)
Task: "Create response-parser.ts with parseAIResponse" (T012)
Task: "Create cache-strategy.ts with getCachedResponse" (T013)
Task: "Create sync-protocol.ts with Realtime event handlers" (T014)
Task: "Create observability.ts with OpenTelemetry utilities" (T015)

# Launch all hooks in parallel:
Task: "Create useRateLimiting.ts with rate limit state" (T021)
Task: "Create useContextDetection.ts with screen context" (T022)
```

---

## Implementation Strategy

### MVP First (User Story 6 + User Story 1 Only)

**Goal**: Demonstrate core value with minimal scope

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T022) - CRITICAL BLOCKING PHASE
3. Complete Phase 3: User Story 6 (T023-T030) - Upgrade modal for monetization
4. Complete Phase 4: User Story 1 (T031-T051) - Core chat with AI query
5. **STOP and VALIDATE**: Test independently - standard users see upgrade modal, Trailblazer users can ask questions and get AI responses with inline cards
6. Deploy/demo if ready

**MVP Scope**: 81 tasks total (T001-T051 + T111-T120 for sync, T121-T130 for observability)

### Incremental Delivery

**Iteration 1 (MVP)**: Setup + Foundational + US6 + US1 → Test → Deploy
- **Value**: Users can access AI assistant, ask basic questions, get specifications with inline cards
- **Monetization**: Upgrade modal drives Trailblazer conversions

**Iteration 2**: Add User Story 2 (Gear Comparison and Alternatives) → Test → Deploy
- **Value**: Users can get alternatives, execute actions (add to wishlist, compare)
- **Tasks**: T052-T068 (17 tasks)

**Iteration 3**: Add User Story 3 (Inventory Analysis) + User Story 4 (Community Discovery) → Test → Deploy
- **Value**: Users get weight analysis, community offer discovery
- **Tasks**: T069-T084 (16 tasks)

**Iteration 4**: Add User Story 5 (Priority Recommendations) + User Story 7 (Multilingual) → Test → Deploy
- **Value**: Advanced recommendations, international accessibility
- **Tasks**: T085-T100 (16 tasks)

**Iteration 5**: Add User Story 8 (Conversation History) + Multi-Session Sync + Observability → Test → Deploy
- **Value**: Full conversation management, real-time sync, production monitoring
- **Tasks**: T101-T130 (30 tasks)

**Iteration 6**: Polish & Cross-Cutting Concerns → Final validation
- **Value**: Accessibility, performance, security hardening
- **Tasks**: T131-T150 (20 tasks)

### Parallel Team Strategy

With 3+ developers after Foundational phase completes:

**Developer A**: User Story 6 + User Story 1 (T023-T051) - Core chat MVP
**Developer B**: User Story 2 + User Story 3 (T052-T075) - Actions + Analysis
**Developer C**: Multi-Session Sync + Observability (T111-T130) - Infrastructure

All three streams can proceed in parallel, then integrate for testing.

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Critical Path**: Setup → Foundational (BLOCKING) → US6 + US1 (MVP) → US2 → remaining stories
- **Performance Goals**: Verify P95 AI latency <3s (SC-012), sync latency <2s (SC-015) during testing
- **Rate Limiting**: Test with 31 messages to verify enforcement works (SC-015)
- **90-Day Retention**: Verify pg_cron job runs correctly (simulate by updating timestamps)
- **Graceful Degradation**: Test AI backend failures, verify cached responses serve common queries (FR-039)
- **Multi-Language**: Test with en and de locales, verify brand names preserved, units correct (US7)

**Total Tasks**: 152 tasks across 13 phases
- Phase 1 (Setup): 9 tasks
- Phase 2 (Foundational): 13 tasks
- Phase 3 (US6 - Upgrade Modal): 8 tasks
- Phase 4 (US1 - Quick Fact Lookup): 21 tasks
- Phase 5 (US2 - Gear Comparison): 18 tasks (added T069 for destructive action confirmation)
- Phase 6 (US3 - Inventory Analysis): 7 tasks
- Phase 7 (US4 - Community Discovery): 9 tasks
- Phase 8 (US5 - Priority Recommendations): 9 tasks
- Phase 9 (US7 - Multilingual): 7 tasks
- Phase 10 (US8 - Conversation History): 10 tasks
- Phase 11 (Multi-Session Sync): 10 tasks
- Phase 12 (Observability): 11 tasks (added T132 for comparison timing metrics)
- Phase 13 (Polish): 20 tasks

**Suggested MVP Scope**: T001-T051 + T112-T121 + T122-T132 = 83 tasks for full MVP with sync + observability
