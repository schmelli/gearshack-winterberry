# Feature Specification: Mastra Agentic Voice AI

**Feature Branch**: `001-mastra-agentic-voice`
**Created**: 2025-12-20
**Status**: Draft
**Input**: User description: "Feature Specification: Re-Platforming AI Assistant to Mastra (Agentic & Voice) - Upgrading current stateless AI Chatbot (Vercel AI SDK) to a stateful, agentic system using the Mastra Framework embedded in Next.js with memory persistence, MCP integration for GearGraph tools, workflow orchestration for complex reasoning, and voice interaction capabilities."

## Clarifications

### Session 2025-12-20

- Q: What level of observability (logging, metrics, tracing) is required for the Mastra agent, workflows, and memory operations? → A: Comprehensive observability - Structured logging (JSON), Prometheus-compatible metrics (P50/P95/P99 latencies, workflow step durations, error rates by type), distributed tracing for multi-step workflows
- Q: What rate limiting strategy should be applied to prevent AI cost overruns and abuse? → A: Tiered by operation cost - Simple queries unlimited, workflows 20/hour, voice 40/hour
- Q: How should memory conflicts be resolved when the same user updates facts or preferences simultaneously from multiple devices? → A: Last-write-wins with timestamp ordering - Most recent update (by timestamp) takes precedence, conflicts resolved automatically
- Q: What are the expected concurrent user capacity and scaling requirements for this feature? → A: Small scale MVP - 25 concurrent users, 250 daily active users, single-instance deployment sufficient
- Q: How should data retention and privacy compliance (GDPR) be handled for AI-stored personal data? → A: GDPR-compliant with user data deletion rights - 90-day default retention, users can request immediate deletion of conversation memory, automatic purge after retention period

## User Scenarios & Testing

### User Story 1 - Persistent Memory Across Sessions (Priority: P1)

Jessica uses the AI chat to ask "What's my lightest tent?" The AI responds "Your lightest tent is the Nemo Hornet Elite at 850g." Later that day, Jessica opens the app again and asks "Can you remind me what we discussed about tents earlier?" The AI responds "Earlier today, we talked about your lightest tent - the Nemo Hornet Elite at 850g. Would you like to know more about it?"

**Why this priority**: Persistent memory is the fundamental capability that distinguishes an agentic system from a stateless chatbot. Without this, all other agentic features (workflows, personalization, context-aware recommendations) cannot function properly. This is the minimum viable agentic experience.

**Independent Test**: Can be fully tested by having a conversation with the AI, closing the app completely (or logging out and back in), then reopening the chat and asking the AI to recall previous context. Verifies memory persistence works across sessions. Delivers immediate value by eliminating the need to re-establish context repeatedly.

**Acceptance Scenarios**:

1. **Given** a user has a conversation with the AI in session A, **When** they close the app and reopen it in session B, **Then** the AI recalls specific facts mentioned in session A (e.g., gear preferences, planned trips, stated constraints)
2. **Given** the user asks "What did we discuss yesterday?", **When** the AI searches its memory, **Then** it provides a summary of topics discussed in the previous day's conversations
3. **Given** the user states "I prefer ultralight gear" in one conversation, **When** they ask for gear recommendations in a future conversation without repeating this preference, **Then** the AI applies the ultralight preference automatically
4. **Given** a user has conversations across multiple devices (phone, tablet, desktop), **When** they switch devices, **Then** the AI's memory is consistent across all devices
5. **Given** a user's conversation history exceeds 90 days, **When** they interact with the AI, **Then** older memories beyond 90 days are automatically archived or summarized

---

### User Story 2 - Complex Trip Planning Workflow (Priority: P1)

Marcus asks the AI "Plan a 5-day trip to Sweden in February with less than 10kg pack weight." The AI activates its planning workflow: (1) it determines the location is Sweden with winter conditions, (2) it fetches weather data for Sweden in February in parallel with querying Marcus's current inventory, (3) it identifies gaps by comparing his gear to winter requirements, (4) it queries the GearGraph via MCP to find suitable gear alternatives that close the gaps while staying under weight budget, and (5) it streams a comprehensive plan: "For Sweden in February (-5°C to -15°C), you'll need: [detailed recommendations with reasoning]. Your current setup is 11.2kg. Here's how to get under 10kg: [specific swaps]. Total estimated cost: €450."

**Why this priority**: This workflow demonstrates the core value of an agentic system - handling multi-step reasoning that requires orchestrating multiple data sources and tools. It's the "killer app" that justifies the Mastra migration and cannot be achieved with simple stateless LLM calls.

**Independent Test**: Can be tested by providing a complex trip request with location, season, and weight constraints. Verify the AI executes all workflow steps (weather fetch, inventory query, gap analysis, graph search) and produces a coherent, actionable plan. Delivers value by automating a time-intensive research process that currently requires hours of manual work.

**Acceptance Scenarios**:

1. **Given** a user requests a trip plan with location, season, and weight constraints, **When** the AI processes the request, **Then** it executes the workflow steps in the correct order: intent analysis → parallel data gathering → gap analysis → recommendation synthesis
2. **Given** the AI is gathering trip planning data, **When** it needs weather and inventory simultaneously, **Then** both API calls execute in parallel (not sequentially) to minimize latency
3. **Given** the AI identifies gear gaps for the trip, **When** it queries the GearGraph, **Then** it uses MCP tools to find alternatives that match environmental requirements and weight constraints
4. **Given** the AI generates the final trip plan, **When** streaming the response to the user, **Then** each section streams incrementally (environment summary → gap analysis → recommendations → cost estimate) so users see progress in real-time
5. **Given** weather data or inventory queries fail, **When** the workflow encounters an error, **Then** the AI explains what went wrong, provides partial results based on available data, and suggests manual steps for missing information

---

### User Story 3 - GearGraph Intelligence via MCP (Priority: P2)

Priya asks the AI "What's a lighter alternative to my MSR PocketRocket stove?" The AI queries the GearGraph via MCP to traverse the equipment graph, finding stoves lighter than the PocketRocket (73g). It responds "Here are lighter alternatives from the GearGraph: (1) BRS-3000T at 25g - 66% lighter but less wind-resistant, (2) Soto Amicus at 81g - wait, that's heavier. Let me recalculate..." The AI corrects itself and provides accurate comparisons, demonstrating its ability to reason about graph data.

**Why this priority**: MCP integration unlocks the GearGraph's intelligence - a unique competitive advantage. While not strictly required for basic AI functionality, it enables sophisticated gear discovery and comparison that sets GearShack apart from generic outdoor gear advice.

**Independent Test**: Can be tested by asking for gear comparisons or alternatives, verifying the AI correctly queries the GearGraph via MCP, and confirming responses include graph-derived insights (e.g., "based on 2,400 user reviews" or "this tent is in the top 10% for weight-to-packed-volume ratio"). Delivers value by surfacing expert-level gear knowledge instantly.

**Acceptance Scenarios**:

1. **Given** a user asks for alternatives to a specific gear item, **When** the AI queries the GearGraph via MCP, **Then** it retrieves items in the same category with comparative metrics (weight, price, user ratings)
2. **Given** the GearGraph provides multiple alternatives, **When** the AI presents them to the user, **Then** each alternative includes graph-derived reasoning (e.g., "Most popular in your region" or "Highest durability rating for this weight class")
3. **Given** the user asks "What is a lighter alternative to X?", **When** the AI queries the graph, **Then** it only returns items that are actually lighter than X (validates query results before presenting)
4. **Given** the AI needs to traverse complex graph relationships (e.g., "Find tents used by users who also own my sleeping bag"), **When** MCP tools are invoked, **Then** the agent dynamically discovers and uses the appropriate graph traversal tools without manual TypeScript definitions
5. **Given** the GearGraph MCP server is unavailable or slow, **When** a query times out, **Then** the AI falls back to catalog search and informs the user that advanced graph insights are temporarily unavailable

---

### User Story 4 - Voice Interaction with Low Latency (Priority: P2)

Elena is on a hiking trail and wants to quickly check her gear without stopping to type. She taps the microphone icon in the AI chat, says "What's the total weight of my tent, sleeping bag, and sleeping pad?", and receives a voice response within 3 seconds: "Your tent is 1.4kg, sleeping bag is 0.9kg, and sleeping pad is 0.4kg. Total sleep system weight is 2.7kg."

**Why this priority**: Voice interaction is a transformative UX improvement for outdoor users (hands-free, faster than typing, works with gloves). However, it depends on the core agentic capabilities (memory, workflows, MCP) being functional first, making it secondary to P1 features.

**Independent Test**: Can be tested by recording a spoken question, verifying transcription accuracy, confirming the AI processes it correctly, and validating the TTS response plays back within 3 seconds of the original speech input. Delivers value by enabling hands-free gear queries during activities.

**Acceptance Scenarios**:

1. **Given** a user taps the microphone icon and speaks a question, **When** the audio is captured, **Then** it is transcribed to text accurately (95%+ accuracy for clear speech in English/German)
2. **Given** the transcription completes, **When** the AI processes the text query, **Then** it executes the same logic as typed queries (memory, tools, workflows) and generates a text response
3. **Given** the AI generates a text response, **When** TTS synthesis completes, **Then** the audio plays automatically without requiring a user tap
4. **Given** the entire voice interaction pipeline (capture → transcribe → process → synthesize → playback), **When** measured end-to-end, **Then** 90% of queries complete within 3 seconds, 99% within 5 seconds
5. **Given** ambient noise interferes with recording quality, **When** transcription confidence is below 70%, **Then** the AI asks the user to repeat or offers a typed fallback
6. **Given** the user is in a noisy environment or prefers reading, **When** voice playback starts, **Then** a visible "pause" button and live text transcript appear simultaneously

---

### User Story 5 - Personalized Expertise Recall (Priority: P3)

Tom has been using the AI for 3 months. He asks "What gear should I upgrade next?" The AI recalls from memory: (1) Tom prefers budget-conscious choices (mentioned in 5 previous conversations), (2) he's planning a multi-day alpine trip in March (stated 2 weeks ago), (3) he recently complained about his sleeping bag being too cold (4 days ago). The AI responds "Based on what I know about your preferences and upcoming alpine trip, I'd prioritize upgrading your sleeping bag first. You mentioned it was too cold last week, and March alpine conditions require at least a 15°F (-9°C) rating. Your current bag is only rated to 30°F (-1°C). Here are budget-friendly options under €200..."

**Why this priority**: This represents the apex of agentic personalization - synthesizing long-term memory patterns to provide expert-level, context-aware recommendations. While impressive, it requires stable P1/P2 features and substantial memory data to be useful, making it a future enhancement rather than initial release necessity.

**Independent Test**: Can be tested by simulating a 3-month conversation history with stated preferences, constraints, and plans, then asking for open-ended advice and verifying the AI synthesizes historical context appropriately. Delivers value by transforming the AI from a tool into a personalized gear advisor.

**Acceptance Scenarios**:

1. **Given** a user has stated preferences across multiple conversations (e.g., "I prefer lightweight gear", "My budget is tight"), **When** they ask for recommendations without restating preferences, **Then** the AI applies those remembered preferences automatically
2. **Given** the user mentioned a planned trip in a previous conversation, **When** they ask "What should I upgrade next?" weeks later, **Then** the AI prioritizes upgrades relevant to the planned trip
3. **Given** the user complained about a specific gear item's performance, **When** the AI recommends upgrades, **Then** it prioritizes replacing the problematic item and explains the connection to the previous complaint
4. **Given** conflicting preferences exist in memory (e.g., "I want ultralight" vs. "I need durability"), **When** the AI makes recommendations, **Then** it acknowledges the trade-off and asks clarifying questions to resolve the conflict
5. **Given** user preferences have evolved over time (e.g., budget constraints relaxed, shifted from summer to winter trips), **When** the AI detects pattern shifts, **Then** it proactively asks "I noticed you've been asking about winter gear lately - are you planning more cold-weather trips now?"

---

### Edge Cases

- What happens when the Mastra agent's memory store (Supabase) is unavailable or experiences connection timeouts? (Graceful degradation to stateless mode with warning)
- What happens when the GearGraph MCP server is unreachable during a query? (Fall back to catalog search, inform user graph features are temporarily unavailable)
- What happens when voice transcription produces gibberish due to extreme background noise? (Confidence threshold check triggers "I didn't catch that, please try again" response)
- What happens when a user's conversation history grows extremely large (10,000+ messages)? (Automatic summarization of old conversations, archival beyond 90 days)
- What happens when a workflow step (e.g., weather API) takes longer than 10 seconds? (Streaming progress updates, timeout with partial results)
- What happens when the user switches languages mid-conversation? (AI detects language switch, updates context, responds in new language while preserving memory)
- What happens when multiple workflow steps fail simultaneously (weather API down + inventory query fails)? (Clear error message explaining what failed, offer alternative approaches)
- What happens when the AI remembers incorrect information (user corrected a fact but memory wasn't updated)? (Memory correction mechanism: "Actually, that's wrong. My tent is 1.2kg, not 1.4kg" updates stored fact)
- What happens when a user exceeds rate limits for expensive operations (workflows, voice)? (Clear error message indicating which limit was exceeded, when it resets, and suggestion to use simple queries in the meantime)
- What happens when a user updates the same memory fact simultaneously from multiple devices? (Last-write-wins conflict resolution using server timestamps - most recent update takes precedence automatically)
- What happens when a user requests deletion of all their conversation memory data (GDPR Right to Erasure)? (All conversation memory, preferences, and facts are deleted within 24 hours; user receives confirmation; AI reverts to stateless mode for that user until new conversations create fresh memory)

## Requirements

### Functional Requirements

- **FR-001**: System MUST integrate Mastra Framework as an embedded service within the existing Next.js application (no separate deployment)
- **FR-002**: System MUST expose a Next.js API route (e.g., `/api/mastra/chat`) that initializes the Mastra agent and supports streaming responses compatible with Vercel AI SDK's `useChat` hook
- **FR-003**: System MUST authenticate all Mastra agent requests using the existing Supabase authentication context via MastraAuthSupabase integration
- **FR-004**: System MUST connect the Mastra agent to the existing Supabase PostgreSQL database for persistent conversation memory storage
- **FR-005**: System MUST store conversation memory with 90-day retention, automatically archiving or summarizing older conversations, and comply with GDPR data retention requirements including automatic purge after retention period
- **FR-006**: System MUST enable the Mastra agent to recall user preferences, stated constraints, and conversation history across sessions and devices
- **FR-007**: System MUST integrate the Mastra agent with the existing GearGraph MCP Server for dynamic tool discovery and graph-based queries
- **FR-008**: System MUST port the existing AI persona instructions (friendly, expert, critical tone) from the Vercel AI SDK implementation to Mastra agent configuration
- **FR-009**: System MUST implement at least one multi-step workflow for complex trip planning that orchestrates parallel data gathering (weather API + user inventory) and sequential reasoning (gap analysis → graph query → recommendation synthesis)
- **FR-010**: System MUST stream workflow progress updates to the UI so users see incremental results during long-running operations
- **FR-011**: System MUST provide voice input capability by capturing audio, transcribing it using Whisper or Vercel AI SDK transcription, and passing the text to the Mastra agent
- **FR-012**: System MUST provide voice output capability by synthesizing AI text responses into audio using TTS (ElevenLabs or OpenAI) and playing it automatically
- **FR-013**: System MUST achieve 90% of voice interactions completing within 3 seconds end-to-end (capture → transcribe → process → synthesize → playback)
- **FR-014**: System MUST fall back gracefully when agentic features are unavailable (e.g., stateless mode if memory store is down, catalog search if GearGraph MCP is unreachable)
- **FR-015**: System MUST support memory correction when users explicitly state a fact is incorrect (e.g., "Actually, my tent weighs 1.2kg, not 1.4kg")
- **FR-016**: System MUST preserve existing AI assistant features (tool calling, inline cards, actions) while migrating to Mastra architecture
- **FR-017**: System MUST identify and display the userId from the Supabase session to enable user-specific database queries within Mastra workflows
- **FR-018**: System MUST handle transcription confidence thresholds for voice input, prompting users to repeat when confidence is below 70%
- **FR-019**: System MUST implement structured logging (JSON format) for all Mastra agent operations, workflow executions, memory operations, and MCP tool invocations
- **FR-020**: System MUST expose Prometheus-compatible metrics including latency percentiles (P50/P95/P99) for agent responses, workflow step durations, memory query times, and error rates categorized by type (network, validation, timeout, etc.)
- **FR-021**: System MUST implement distributed tracing for multi-step workflows to track execution flow across parallel data gathering, sequential reasoning steps, and external service calls
- **FR-022**: System MUST log all memory write operations (new facts, preference updates, corrections) with timestamps and userId for audit trail purposes
- **FR-023**: System MUST implement tiered rate limiting by operation cost: simple queries (memory recall, gear lookups) unlimited, complex workflow executions limited to 20 per hour per user, voice interactions limited to 40 per hour per user
- **FR-024**: System MUST enforce rate limits at the API route level before agent invocation, returning clear error messages indicating which limit was exceeded and when it resets
- **FR-025**: System MUST resolve memory conflicts from concurrent cross-device updates using last-write-wins with timestamp ordering, where the most recent write (by server timestamp) takes precedence
- **FR-026**: System MUST provide users with the ability to request immediate deletion of all their conversation memory data (GDPR Article 17 Right to Erasure), completing the deletion within 24 hours of the request
- **FR-027**: System MUST automatically purge all conversation memory data older than 90 days, including orphaned references in logs (sanitizing userId from structured logs while preserving anonymous metrics)

### Key Entities

- **Mastra Agent**: The core agentic system that orchestrates memory, workflows, MCP tools, and LLM calls to provide stateful, context-aware responses
- **Conversation Memory**: Persistent storage of conversation history, user preferences, stated constraints, and facts, retained for 90 days with automatic archival. Uses last-write-wins conflict resolution with server timestamps to handle concurrent updates from multiple devices.
- **Workflow Definition**: Multi-step reasoning processes (e.g., trip planner) that define the sequence and parallelization of tool calls, API requests, and LLM reasoning
- **MCP Tool**: Dynamically discovered functions exposed by the GearGraph MCP Server (e.g., graph traversals, similarity searches, rating aggregations) that the agent can invoke
- **Voice Interaction Session**: A single voice request-response cycle including audio capture, transcription, agent processing, TTS synthesis, and playback
- **Memory Correction Event**: A user-initiated update to stored facts when the AI recalls incorrect information, triggering memory store updates

## Success Criteria

### Measurable Outcomes

- **SC-001**: The AI successfully recalls a specific fact stated in a previous session when asked to do so, with 95% accuracy across 100 test conversations (validates memory persistence)
- **SC-002**: Complex trip planning queries (with location, season, and weight constraints) produce complete plans including environment summary, gap analysis, and recommendations in under 10 seconds for 90% of requests
- **SC-003**: GearGraph MCP queries return relevant alternatives with graph-derived reasoning (e.g., popularity metrics, comparative ratings) in 100% of gear comparison requests when the MCP server is available
- **SC-004**: Voice interaction latency (end-to-end from speech input to audio playback) is under 3 seconds for 90% of queries and under 5 seconds for 99% of queries
- **SC-005**: The system gracefully degrades to stateless mode when the Mastra memory store is unavailable, with users receiving a clear warning message and functional (but non-personalized) responses
- **SC-006**: The AI correctly applies user preferences remembered from previous conversations (e.g., "ultralight preference", "budget under €200") without users needing to restate them, in 90% of recommendation requests
- **SC-007**: Workflow progress updates stream to the UI during trip planning queries, with at least 3 visible progress stages (data gathering → analysis → recommendations) before the final response
- **SC-008**: Memory correction events (user states "that's wrong, here's the correct fact") successfully update stored memory within 1 second and reflect in subsequent responses
- **SC-009**: The migration to Mastra architecture does not degrade existing AI assistant features - tool calling success rate, inline card display rate, and action execution rate remain at or above pre-migration levels
- **SC-010**: Conversation history synchronization across devices occurs within 2 seconds of a message being sent on one device, ensuring consistent memory state
- **SC-011**: Observability instrumentation provides complete visibility into system behavior - 100% of workflow executions produce distributed traces, all agent operations emit structured logs, and metrics dashboards display P50/P95/P99 latencies for all critical operations
- **SC-012**: The system maintains target performance metrics (SC-002: 10s workflows, SC-004: 3s voice) under expected MVP load of 25 concurrent users and 250 daily active users without degradation

## Assumptions

- The GearGraph MCP Server is operational and accessible from the Next.js application environment (local or remote endpoint)
- The existing Supabase PostgreSQL database has sufficient capacity and performance to handle Mastra memory storage without schema changes requiring extensive migrations
- Voice input/output services (Whisper, ElevenLabs, or OpenAI TTS) are available via API and support the required languages (English, German at minimum)
- The existing Vercel AI SDK `useChat` hook on the frontend will remain compatible with Mastra's streaming response format (or minimal frontend changes are acceptable)
- Users are on Trailblazer subscription tier, consistent with existing AI assistant access controls
- Network latency for external API calls (weather data, GearGraph MCP, TTS services) is under 2 seconds on average
- The Mastra Framework supports Supabase as a memory backend via `@mastra/memory` adapters (or custom adapter implementation is feasible)
- The existing AI persona logic (system prompts, tone, language handling) can be migrated to Mastra agent instructions without significant rewrites
- Conversation memory can be partitioned by userId to ensure privacy and isolation between users' agent instances
- The Next.js application is deployed in an environment that supports long-running streaming connections (e.g., Vercel Serverless Functions with streaming response support)
- The MVP deployment targets small-scale usage: 25 concurrent users maximum, 250 daily active users, with single-instance deployment architecture sufficient for this capacity
- The application must comply with GDPR requirements for EU users, including the Right to Erasure (Article 17) and data minimization principles
