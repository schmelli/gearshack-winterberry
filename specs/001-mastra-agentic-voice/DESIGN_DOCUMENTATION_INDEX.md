# Design Documentation Index

**Feature**: 001-mastra-agentic-voice
**Phase**: Design & Architecture
**Created**: 2025-12-20

---

## Overview

This directory contains comprehensive design documentation for the Mastra Agentic Voice AI integration. All files follow the Gearshack constitution principles (TypeScript strict mode, Feature-Sliced Light architecture, absolute imports).

---

## Quick Start

**New to this feature?** Start here:

1. **Understand the Feature**: Read [`spec.md`](./spec.md)
2. **Review Architecture**: Read [`plan.md`](./plan.md)
3. **Set Up Locally**: Follow [`quickstart.md`](./quickstart.md)
4. **Study Data Models**: Review [`data-model.md`](./data-model.md)
5. **Explore APIs**: Browse [`contracts/`](./contracts/) directory

**Estimated Reading Time**: 2 hours (full documentation)

---

## Core Documents

### 1. Feature Specification

**File**: [`spec.md`](./spec.md)
**Lines**: 197
**Purpose**: Complete feature requirements and user stories

**Contents**:
- 5 prioritized user stories (P1-P3)
- Acceptance scenarios for each story
- Edge case handling
- 27 functional requirements (FR-001 to FR-027)
- 12 success criteria with measurable outcomes
- GDPR compliance requirements

**Key Sections**:
- User Story 1 (P1): Persistent Memory Across Sessions
- User Story 2 (P1): Complex Trip Planning Workflow
- User Story 3 (P2): GearGraph Intelligence via MCP
- User Story 4 (P2): Voice Interaction with Low Latency
- User Story 5 (P3): Personalized Expertise Recall

---

### 2. Implementation Plan

**File**: [`plan.md`](./plan.md)
**Lines**: 1,000+ (comprehensive)
**Purpose**: Detailed phase-by-phase implementation roadmap

**Contents**:
- 4 implementation phases (Design, Core, Workflows, Voice)
- 8 research questions with deliverables
- Architecture diagrams (Mermaid)
- Task breakdown by phase
- Risk mitigation strategies
- Testing approach

**Timeline**: 12-14 days total

---

### 3. Data Model Documentation

**File**: [`data-model.md`](./data-model.md)
**Lines**: 764
**Purpose**: Complete database schema and type definitions

**Contents**:
- **4 Database Tables**:
  - `conversation_memory` (persistent chat history)
  - `workflow_executions` (multi-step workflow tracking)
  - `rate_limit_tracking` (tiered rate limits)
  - `gdpr_deletion_records` (Right to Erasure audit trail)
- **11 TypeScript Interfaces**:
  - `ConversationMemory`, `WorkflowExecution`, `RateLimitTracking`, `GdprDeletionRecord`
  - `MastraAgent`, `MCPTool`, `WorkflowDefinition`, `WorkflowStep`
  - `VoiceInteractionSession`, `MemoryCorrectionEvent`
- **7 Zod Validators** for runtime validation
- **3 State Machines**:
  - Workflow execution states (pending → running → completed/failed/timeout)
  - GDPR deletion states (pending → processing → completed/failed)
  - Rate limit window reset logic
- Conflict resolution strategy (last-write-wins)
- GDPR compliance mechanisms

**Key Insights**:
- All tables use Row-Level Security (RLS) for multi-tenancy
- Server-side timestamps for conflict resolution
- 90-day retention with automatic cleanup
- GDPR deletion SLA: 24 hours

---

### 4. API Contracts

**Directory**: [`contracts/`](./contracts/)
**Files**: 5 (one per endpoint)
**Purpose**: OpenAPI-style specifications for all API routes

#### 4.1 Chat Endpoint

**File**: [`contracts/api-mastra-chat.md`](./contracts/api-mastra-chat.md)
**Lines**: 401
**Endpoint**: `POST /api/mastra/chat`

**Features**:
- Server-Sent Events (SSE) streaming
- Compatible with Vercel AI SDK `useChat` hook
- Memory persistence across sessions
- Workflow orchestration
- MCP tool invocations
- Tiered rate limiting (unlimited simple queries, 20/hour workflows)

**Response Format**:
```typescript
data: {"type":"text","content":"..."}
data: {"type":"tool_call","tool":"searchGear","args":{...}}
data: {"type":"workflow_progress","step":"weather_api","status":"running"}
data: [DONE]
```

---

#### 4.2 Memory Deletion Endpoint

**File**: [`contracts/api-mastra-memory-delete.md`](./contracts/api-mastra-memory-delete.md)
**Lines**: 375
**Endpoint**: `DELETE /api/mastra/memory`

**Features**:
- GDPR Article 17 Right to Erasure
- Asynchronous deletion (completes within 24 hours)
- Audit trail in `gdpr_deletion_records`
- Anonymizes userId in logs while preserving metrics

**Deletion Scope**:
- All `conversation_memory` records
- All `workflow_executions` records
- All `rate_limit_tracking` records
- Anonymized structured logs

---

#### 4.3 Voice Transcription Endpoint

**File**: [`contracts/api-mastra-voice-transcribe.md`](./contracts/api-mastra-voice-transcribe.md)
**Lines**: 436
**Endpoint**: `POST /api/mastra/voice/transcribe`

**Features**:
- Whisper transcription (5 audio formats supported)
- Confidence threshold (0.70 minimum)
- Rate limit: 40/hour (combined with TTS)
- Max file size: 25 MB

**Performance Targets**:
- Latency: < 2s (P50), < 5s (P99)
- Accuracy: > 95% (clear speech), > 80% (noisy)

---

#### 4.4 Voice Synthesis Endpoint

**File**: [`contracts/api-mastra-voice-synthesize.md`](./contracts/api-mastra-voice-synthesize.md)
**Lines**: 486
**Endpoint**: `POST /api/mastra/voice/synthesize`

**Features**:
- OpenAI TTS (6 voice options: alloy, echo, fable, onyx, nova, shimmer)
- 2 quality models (tts-1 for real-time, tts-1-hd for high quality)
- 4 audio formats (mp3, opus, aac, flac)
- Rate limit: 40/hour (combined with transcription)

**Performance Targets**:
- tts-1 latency: < 1.5s (P50), < 3s (P99)
- tts-1-hd latency: < 3s (P50), < 6s (P99)

---

#### 4.5 Metrics Endpoint

**File**: [`contracts/api-mastra-metrics.md`](./contracts/api-mastra-metrics.md)
**Lines**: 508
**Endpoint**: `GET /api/mastra/metrics`

**Features**:
- Prometheus text exposition format
- 30+ metrics exported
- Internal authentication (API key)
- Grafana dashboard recommendations

**Metric Categories**:
1. Chat endpoint metrics (latency, errors, request counts)
2. Workflow execution metrics (duration, status, step timings)
3. Memory operation metrics (query latency, write counts, deletions)
4. Voice operation metrics (transcription confidence, synthesis latency)
5. MCP tool invocation metrics (tool call counts, latencies)
6. Rate limiting metrics (hits, active windows)
7. System health metrics (uptime, active conversations)

---

### 5. Quickstart Guide

**File**: [`quickstart.md`](./quickstart.md)
**Lines**: 688
**Purpose**: Developer setup guide (< 30 minutes)

**Contents**:
- Prerequisites checklist
- Installation steps (npm packages, env vars)
- Database migration (SQL schemas)
- 4 verification tests:
  1. Mastra agent initialization
  2. Memory persistence test
  3. MCP connection test
  4. Streaming SSE test
- Troubleshooting guide
- Next steps

**Key Features**:
- Copy-paste ready commands
- Expected output examples
- Common error solutions
- Test scripts for verification

---

## Research Documents

### Research Overview

**File**: [`research.md`](./research.md)
**Lines**: 800+
**Purpose**: Master index for all 8 research questions

**Research Questions**:
1. Runtime Architecture (embedded vs. separate deployment)
2. Supabase Memory Adapter (custom implementation required)
3. MCP Connection Architecture (stdio vs. HTTP transport)
4. Workflow Implementation Patterns (parallel vs. sequential)
5. Voice Pipeline Design (Whisper + OpenAI TTS)
6. Observability & Metrics (Prometheus + structured logging)
7. SSE Streaming Compatibility (Vercel AI SDK integration)
8. Conflict Resolution Strategy (last-write-wins)

**Each Research Deliverable Includes**:
- Executive summary
- Decision rationale
- Implementation specifications
- Code examples
- Testing approach
- Timeline impact

---

### Individual Research Files

| File | Topic | Lines | Key Decision |
|------|-------|-------|--------------|
| [`research-01-runtime.md`](./research-01-runtime.md) | Runtime Architecture | 400+ | **Embedded in Next.js** (no separate deployment) |
| [`research-02-memory-adapter.md`](./research-02-memory-adapter.md) | Supabase Adapter | 628 | **Custom adapter required** (2-day implementation) |
| [`research-03-mcp-architecture.md`](./research-03-mcp-architecture.md) | MCP Connection | 500+ | **Stdio transport** for MVP (HTTP for production) |
| [`research-04-workflow-guide.md`](./research-04-workflow-guide.md) | Workflow Patterns | 500+ | **Parallel data gathering + sequential reasoning** |
| [`research-05-voice-pipeline.md`](./research-05-voice-pipeline.md) | Voice Pipeline | 600+ | **Whisper + OpenAI TTS** (3s end-to-end target) |
| [`research-06-observability.md`](./research-06-observability.md) | Observability | 600+ | **Pino (logs) + prom-client (metrics)** |
| [`research-07-sse-streaming.md`](./research-07-sse-streaming.md) | SSE Streaming | 500+ | **Vercel AI SDK compatible** (minimal changes) |
| [`research-08-conflict-resolution.md`](./research-08-conflict-resolution.md) | Conflict Resolution | 600+ | **Last-write-wins with server timestamps** |

---

## Architecture Diagrams

### MCP Connection Architecture

**File**: [`MCP_CONNECTION_ARCHITECTURE.md`](./MCP_CONNECTION_ARCHITECTURE.md)
**Lines**: 900+
**Purpose**: Visual architecture diagrams for MCP integration

**Diagrams**:
1. Stdio Transport Flow
2. HTTP Transport Flow
3. Dynamic Tool Discovery Sequence
4. Error Handling & Fallback Logic
5. Local vs. Remote MCP Deployment

---

### Voice Pipeline Architecture

**File**: [`VOICE_PIPELINE_ARCHITECTURE.md`](./VOICE_PIPELINE_ARCHITECTURE.md)
**Lines**: 1,000+
**Purpose**: Complete voice interaction flow diagrams

**Diagrams**:
1. End-to-End Voice Interaction Flow
2. Transcription Pipeline (audio capture → Whisper → text)
3. Synthesis Pipeline (text → OpenAI TTS → audio playback)
4. Latency Breakdown (5s total: 1s capture + 1.5s transcribe + 1s process + 1.5s synthesize)
5. Error Handling (low confidence, API timeouts, rate limits)

---

## Implementation Checklists

**Directory**: [`checklists/`](./checklists/)
**Purpose**: Task-by-task implementation tracking

**Files**:
- Phase 1: Design & Architecture (completed)
- Phase 2: Core Implementation (pending)
- Phase 3: Workflows & Advanced Features (pending)
- Phase 4: Voice Integration (pending)

---

## Document Statistics

| Document | Lines | Words | Purpose |
|----------|-------|-------|---------|
| `spec.md` | 197 | 3,500+ | Feature requirements |
| `plan.md` | 1,000+ | 18,000+ | Implementation roadmap |
| `data-model.md` | 764 | 10,000+ | Database schema & types |
| `contracts/*.md` | 2,206 | 35,000+ | API specifications (5 files) |
| `quickstart.md` | 688 | 9,000+ | Developer setup guide |
| `research.md` | 800+ | 15,000+ | Research index |
| `research-*.md` | 4,500+ | 75,000+ | Research deliverables (8 files) |
| **TOTAL** | **10,155+** | **166,000+** | Complete design documentation |

---

## Navigation Guide

### For Product Managers

**Start Here**:
1. [`spec.md`](./spec.md) - Understand user stories and requirements
2. [`plan.md`](./plan.md) - Review timeline and phases
3. [`contracts/`](./contracts/) - Understand API surface

**Key Questions Answered**:
- What are we building? → `spec.md`
- When will it be done? → `plan.md` (12-14 days)
- How will users interact with it? → `contracts/api-mastra-chat.md`
- How do we handle GDPR? → `contracts/api-mastra-memory-delete.md`

---

### For Developers

**Start Here**:
1. [`quickstart.md`](./quickstart.md) - Set up local environment
2. [`data-model.md`](./data-model.md) - Study database schema
3. [`contracts/`](./contracts/) - Review API contracts
4. [`research-02-memory-adapter.md`](./research-02-memory-adapter.md) - Implement Supabase adapter

**Key Questions Answered**:
- How do I set up locally? → `quickstart.md`
- What's the database schema? → `data-model.md`
- How do I implement memory? → `research-02-memory-adapter.md`
- How do I test streaming? → `contracts/api-mastra-chat.md` + `quickstart.md` Test 4

---

### For Designers

**Start Here**:
1. [`spec.md`](./spec.md) - User stories and scenarios
2. [`contracts/api-mastra-voice-*.md`](./contracts/) - Voice interaction flows
3. [`VOICE_PIPELINE_ARCHITECTURE.md`](./VOICE_PIPELINE_ARCHITECTURE.md) - Voice UX diagrams

**Key Questions Answered**:
- What are the user flows? → `spec.md` User Stories
- How long do voice interactions take? → `contracts/api-mastra-voice-transcribe.md` (3s target)
- What feedback do users need? → `contracts/api-mastra-chat.md` (streaming progress)

---

### For QA Engineers

**Start Here**:
1. [`spec.md`](./spec.md) - Acceptance scenarios
2. [`quickstart.md`](./quickstart.md) - Test scripts
3. [`contracts/`](./contracts/) - API error responses

**Key Questions Answered**:
- What are the acceptance criteria? → `spec.md` User Stories (35 scenarios)
- How do I test locally? → `quickstart.md` (4 verification tests)
- What errors should I test? → Each `contracts/*.md` file has error response section

---

## Compliance Checklist

### Gearshack Constitution Adherence

- [x] **TypeScript Strict Mode**: All interfaces use strict typing (no `any`)
- [x] **Feature-Sliced Light**: Business logic in hooks, stateless UI components
- [x] **Absolute Imports**: All code examples use `@/` path alias
- [x] **Zod Validation**: Runtime validators defined in `data-model.md`
- [x] **Supabase Database**: PostgreSQL with RLS policies
- [x] **shadcn/ui Components**: UI examples use existing components (Button, Dialog, Card)
- [x] **Tailwind CSS**: No separate CSS files recommended
- [x] **Next.js 16+ App Router**: All API routes use App Router pattern

---

## Version Control

**Current Version**: 1.0.0
**Last Updated**: 2025-12-20
**Status**: Design Phase Complete

**Change Log**:
- 2025-12-20: Initial design documentation created
  - Added `data-model.md` (764 lines)
  - Added 5 API contracts (2,206 lines total)
  - Added `quickstart.md` (688 lines)
  - Total documentation: 10,155+ lines

---

## Next Steps

**After Reviewing This Documentation**:

1. **Approve Design** (Product Manager)
   - Review `spec.md` for requirements alignment
   - Validate `plan.md` timeline (12-14 days)
   - Sign off on API contracts

2. **Begin Implementation** (Development Team)
   - Follow `quickstart.md` to set up local environment
   - Complete Phase 1 tasks from `plan.md`
   - Implement Supabase memory adapter per `research-02-memory-adapter.md`

3. **Prepare Test Environment** (QA Team)
   - Run all 4 verification tests from `quickstart.md`
   - Create test data for 35 acceptance scenarios from `spec.md`
   - Set up Prometheus + Grafana for observability testing

4. **Design UI Components** (Design Team)
   - Create mockups for voice recording interface
   - Design workflow progress indicators
   - Prototype memory correction UI

---

## Support

**Questions?**
- Architecture: See `plan.md` or `research.md`
- Database: See `data-model.md`
- APIs: See `contracts/`
- Setup: See `quickstart.md`

**Feedback**:
- Missing information? File issue with document reference
- Unclear sections? Request clarification with line numbers
- Additional diagrams needed? Specify diagram type and content

---

**Document Index Last Updated**: 2025-12-20 00:06 UTC
