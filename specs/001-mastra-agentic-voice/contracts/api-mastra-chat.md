# API Contract: Mastra Chat Endpoint

**Endpoint**: `POST /api/mastra/chat`
**Version**: 1.0.0
**Created**: 2025-12-20

---

## Overview

Streaming chat interface with the Mastra agent supporting memory persistence, workflow orchestration, and MCP tool invocations.

---

## Request

### HTTP Method
`POST`

### URL
```
/api/mastra/chat
```

### Headers

| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `Content-Type` | Yes | `application/json` | Request body format |
| `Authorization` | Yes | `Bearer <token>` | Supabase Auth JWT |

### Authentication

**Required**: Yes

Uses existing Supabase authentication. The JWT token must be valid and contain a `user_id` claim.

**Unauthorized Response**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```
Status: `401 Unauthorized`

---

### Request Body Schema

```typescript
interface ChatRequest {
  message: string;              // User's input message (1-10000 chars)
  conversationId?: string;      // Optional UUID for conversation continuity
  options?: {
    stream?: boolean;           // Enable streaming (default: true)
    includeMemory?: boolean;    // Include conversation history (default: true)
    maxTokens?: number;         // Max LLM tokens (default: 2000)
  };
}
```

### Example Request

```json
{
  "message": "What's my lightest tent?",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "options": {
    "stream": true,
    "includeMemory": true,
    "maxTokens": 2000
  }
}
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `message` | Required, 1-10000 chars | "Message must be between 1 and 10000 characters" |
| `conversationId` | Optional, valid UUID | "Invalid conversation ID format" |
| `options.maxTokens` | Optional, 100-4000 | "Max tokens must be between 100 and 4000" |

---

## Response

### Content Type

**Streaming Mode** (default):
```
Content-Type: text/event-stream
```

**Non-Streaming Mode**:
```
Content-Type: application/json
```

---

### Streaming Response Format

Server-Sent Events (SSE) stream compatible with Vercel AI SDK `useChat` hook.

#### Event Types

**1. Text Chunk**
```
data: {"type":"text","content":"Your lightest tent is "}

data: {"type":"text","content":"the Nemo Hornet Elite "}

data: {"type":"text","content":"at 850g."}
```

**2. Tool Call**
```
data: {"type":"tool_call","tool":"searchGear","args":{"category":"tent","sortBy":"weight"}}
```

**3. Tool Result**
```
data: {"type":"tool_result","tool":"searchGear","result":{"items":[...]}}
```

**4. Workflow Progress**
```
data: {"type":"workflow_progress","step":"weather_api","status":"running","message":"Fetching Sweden weather data..."}
```

**5. Memory Update**
```
data: {"type":"memory_update","action":"stored","fact":"User prefers ultralight gear"}
```

**6. Stream End**
```
data: [DONE]
```

#### Complete Example

```
data: {"type":"text","content":"Let me check your inventory..."}

data: {"type":"tool_call","tool":"searchGear","args":{"category":"tent","sortBy":"weight"}}

data: {"type":"tool_result","tool":"searchGear","result":{"items":[{"name":"Nemo Hornet Elite","weight":850}]}}

data: {"type":"text","content":"Your lightest tent is the Nemo Hornet Elite at 850g."}

data: {"type":"memory_update","action":"stored","fact":"User asked about lightest tent - Nemo Hornet Elite (850g)"}

data: [DONE]
```

---

### Non-Streaming Response Format

```typescript
interface ChatResponse {
  conversationId: string;       // UUID for conversation continuity
  messageId: string;            // UUID for this AI response
  content: string;              // Full AI response text
  toolCalls?: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  memoryUpdates?: Array<{
    action: 'stored' | 'updated' | 'deleted';
    fact: string;
  }>;
  metadata: {
    tokensUsed: number;
    latencyMs: number;
    workflowExecuted?: string;
  };
}
```

### Example Non-Streaming Response

```json
{
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "660e8400-e29b-41d4-a716-446655440001",
  "content": "Your lightest tent is the Nemo Hornet Elite at 850g.",
  "toolCalls": [
    {
      "tool": "searchGear",
      "args": { "category": "tent", "sortBy": "weight" },
      "result": { "items": [{ "name": "Nemo Hornet Elite", "weight": 850 }] }
    }
  ],
  "memoryUpdates": [
    {
      "action": "stored",
      "fact": "User asked about lightest tent - Nemo Hornet Elite (850g)"
    }
  ],
  "metadata": {
    "tokensUsed": 245,
    "latencyMs": 1234,
    "workflowExecuted": null
  }
}
```

---

## Rate Limiting

### Tiers

| Operation Type | Limit | Window | Detection |
|----------------|-------|--------|-----------|
| Simple Query | Unlimited | N/A | No workflow execution, no MCP calls |
| Workflow | 20 requests/hour | 3600s | Agent executes multi-step workflow |
| Voice (from `/api/mastra/voice/*`) | 40 requests/hour | 3600s | Counted separately |

### Rate Limit Exceeded Response

**Status**: `429 Too Many Requests`

**Headers**:
```
Retry-After: 3456
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735646400
```

**Body**:
```json
{
  "error": "RateLimitExceeded",
  "message": "Workflow requests limited to 20 per hour. Try again in 58 minutes.",
  "operationType": "workflow",
  "retryAfter": 3456,
  "resetAt": "2025-12-20T15:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request

**Invalid message format**:
```json
{
  "error": "ValidationError",
  "message": "Message must be between 1 and 10000 characters",
  "field": "message"
}
```

### 401 Unauthorized

**Missing or invalid auth token**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```

### 500 Internal Server Error

**Mastra agent failure**:
```json
{
  "error": "AgentError",
  "message": "Failed to generate response. Please try again.",
  "details": "LLM provider timeout after 30s"
}
```

**Memory store unavailable** (graceful degradation):
```json
{
  "error": "MemoryUnavailable",
  "message": "Operating in stateless mode due to memory service unavailability",
  "degradedFeatures": ["conversation_history", "preference_recall"]
}
```

### 503 Service Unavailable

**MCP server unreachable**:
```json
{
  "error": "ServiceDegraded",
  "message": "GearGraph unavailable. Falling back to catalog search.",
  "degradedFeatures": ["graph_traversal", "similarity_search"]
}
```

---

## Performance Targets

| Metric | Target | P99 |
|--------|--------|-----|
| **Simple Query Latency** | < 2s | < 5s |
| **Workflow Execution** | < 10s | < 20s |
| **First Token Latency** (streaming) | < 800ms | < 2s |
| **Time to Complete** (streaming) | < 5s | < 15s |

---

## Observability

### Structured Logging

**Log Entry Example** (JSON format):
```json
{
  "timestamp": "2025-12-20T14:30:45.123Z",
  "level": "info",
  "service": "mastra-chat",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "660e8400-e29b-41d4-a716-446655440001",
  "event": "chat_request_completed",
  "metadata": {
    "latencyMs": 1234,
    "tokensUsed": 245,
    "toolsCalled": ["searchGear"],
    "workflowExecuted": null,
    "memoryUpdates": 1
  }
}
```

### Metrics Exported

**Prometheus Format** (via `/api/mastra/metrics`):
```
mastra_chat_requests_total{operation_type="simple_query"} 1234
mastra_chat_requests_total{operation_type="workflow"} 56
mastra_chat_latency_ms{quantile="0.5"} 1200
mastra_chat_latency_ms{quantile="0.95"} 4500
mastra_chat_latency_ms{quantile="0.99"} 8900
mastra_chat_errors_total{error_type="rate_limit"} 12
mastra_chat_errors_total{error_type="agent_failure"} 3
```

---

## Frontend Integration

### Vercel AI SDK `useChat` Hook

```typescript
import { useChat } from 'ai/react';

export function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/mastra/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('AI response complete:', message);
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} disabled={isLoading} />
      <button type="submit" disabled={isLoading}>Send</button>
    </form>
  );
}
```

---

## Security Considerations

1. **Authentication**: All requests must include valid Supabase JWT
2. **Rate Limiting**: Enforced at API route level before agent invocation
3. **Input Sanitization**: All user messages sanitized to prevent injection attacks
4. **Memory Isolation**: RLS policies ensure users only access their own conversation history
5. **GDPR Compliance**: Right to Erasure supported via `/api/mastra/memory/delete`

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial contract definition |
