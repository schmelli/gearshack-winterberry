# Research Deliverable 07: SSE Streaming Compatibility

**Research Question**: Can Mastra streaming responses maintain Server-Sent Events (SSE) format for Vercel AI SDK `useChat` hook compatibility?

**Status**: ✅ Resolved
**Decision**: **Custom SSE wrapper required** - Mastra async generator incompatible with useChat format
**Date**: 2025-12-20

---

## Executive Summary

Mastra streaming returns **async generators** (`AsyncGenerator<string>`), not SSE-formatted streams. Vercel AI SDK `useChat` hook requires **specific SSE event format** (types: `0` = text, `2` = tool_call, `e` = error, `d` = done). **Custom wrapper required** in `lib/mastra/streaming.ts` to convert Mastra streams to useChat-compatible format. Add **0.5 days to Phase 2.2**.

---

## Mastra Streaming Behavior

### Native Mastra Stream Output

```typescript
// lib/mastra/agent.ts
import { Agent } from '@mastra/core';

const agent = new Agent({ /* config */ });

// Invoke with streaming
const stream = await agent.stream({ query: 'What is my lightest tent?' });

/**
 * stream type: AsyncGenerator<string>
 * Yields: "Your", " lightest", " tent", " is", " the", " Nemo", " Hornet", " Elite", "."
 *
 * NO SSE formatting - just raw text chunks
 */

for await (const chunk of stream) {
  console.log(chunk); // "Your", " lightest", etc.
}
```

**Problem**: Frontend `useChat` hook expects SSE format like:
```
data: {"type":"0","id":"msg-123","content":"Your"}\n\n
data: {"type":"0","id":"msg-123","content":" lightest"}\n\n
...
data: {"type":"d","id":"msg-123"}\n\n
```

---

## Vercel AI SDK useChat Requirements

### Expected SSE Event Format

The `useChat` hook from Vercel AI SDK expects specific event types:

| Event Type | Hex Code | Purpose | Example Payload |
|------------|----------|---------|-----------------|
| **text** | `0` | Text content chunk | `{"type":"0","id":"msg-123","content":"Hello"}` |
| **data** | `1` | Data message (unused) | - |
| **tool_call** | `2` | Tool invocation metadata | `{"type":"2","toolCallId":"call-1","toolName":"searchCatalog","args":{...}}` |
| **tool_result** | `3` | Tool result | `{"type":"3","toolCallId":"call-1","result":{...}}` |
| **error** | `e` | Error occurred | `{"type":"e","error":"Something went wrong"}` |
| **done** | `d` | Stream complete | `{"type":"d","id":"msg-123"}` |

### useChat Hook Implementation

```typescript
// Frontend: hooks/useAIChat.ts
import { useChat } from 'ai/react';

export function useAIChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/mastra/chat', // Must return SSE stream
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Message complete:', message);
    }
  });

  return { messages, input, handleInputChange, handleSubmit, isLoading };
}
```

**Expected API Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"0","id":"msg-123","content":"Your"}\n\n
data: {"type":"0","id":"msg-123","content":" lightest"}\n\n
data: {"type":"0","id":"msg-123","content":" tent"}\n\n
data: {"type":"2","toolCallId":"call-1","toolName":"queryInventory","args":{"userId":"user-123"}}\n\n
data: {"type":"3","toolCallId":"call-1","result":{"items":[...]}}\n\n
data: {"type":"0","id":"msg-123","content":" is"}\n\n
data: {"type":"0","id":"msg-123","content":" the"}\n\n
data: {"type":"0","id":"msg-123","content":" Nemo"}\n\n
data: {"type":"0","id":"msg-123","content":" Hornet"}\n\n
data: {"type":"0","id":"msg-123","content":" Elite"}\n\n
data: {"type":"0","id":"msg-123","content":"."}\n\n
data: {"type":"d","id":"msg-123"}\n\n
```

---

## Custom SSE Wrapper Implementation

### File Location
`lib/mastra/streaming.ts`

### Complete Wrapper

```typescript
// lib/mastra/streaming.ts
import { randomUUID } from 'crypto';

/**
 * Wrap Mastra async generator stream into SSE format compatible with Vercel AI SDK useChat hook
 */
export async function wrapMastraStreamForVercelAI(
  mastraStream: AsyncGenerator<string>,
  messageId: string = randomUUID(),
  options?: {
    onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolResult?: (toolCallId: string, result: unknown) => void;
  }
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // Iterate over Mastra's async generator
        for await (const chunk of mastraStream) {
          // Send text chunk in Vercel AI SDK format (type "0")
          const textEvent = {
            type: '0', // Text content
            id: messageId,
            content: chunk
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(textEvent)}\n\n`)
          );
        }

        // Send done event (type "d") to signal stream completion
        const doneEvent = {
          type: 'd',
          id: messageId
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`)
        );

        controller.close();

      } catch (error) {
        // Send error event (type "e")
        const errorEvent = {
          type: 'e',
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
        );

        controller.close();
      }
    },

    cancel() {
      // Cleanup if client disconnects
      console.log('Stream cancelled by client');
    }
  });
}
```

### With Tool Call Support

```typescript
// lib/mastra/streaming.ts (enhanced with tool calls)
export interface ToolCallMetadata {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
}

export async function wrapMastraStreamWithTools(
  mastraStream: AsyncGenerator<string | ToolCallMetadata>,
  messageId: string = randomUUID()
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of mastraStream) {
          // Check if chunk is tool call metadata or text
          if (typeof chunk === 'string') {
            // Text chunk
            const textEvent = {
              type: '0',
              id: messageId,
              content: chunk
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(textEvent)}\n\n`));

          } else if ('toolCallId' in chunk && !chunk.result) {
            // Tool call event (type "2")
            const toolCallEvent = {
              type: '2',
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: chunk.args
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolCallEvent)}\n\n`));

          } else if ('toolCallId' in chunk && chunk.result) {
            // Tool result event (type "3")
            const toolResultEvent = {
              type: '3',
              toolCallId: chunk.toolCallId,
              result: chunk.result
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolResultEvent)}\n\n`));
          }
        }

        // Done event
        const doneEvent = { type: 'd', id: messageId };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`));
        controller.close();

      } catch (error) {
        const errorEvent = { type: 'e', error: error.message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    }
  });
}
```

---

## API Route Integration

### Streaming Chat Endpoint

```typescript
// app/api/mastra/chat/route.ts
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createMastraAgent } from '@/lib/mastra/agent';
import { wrapMastraStreamForVercelAI } from '@/lib/mastra/streaming';
import { getServerSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const { messages } = await req.json();

    // Get latest user message
    const latestMessage = messages[messages.length - 1];

    // Create Mastra agent
    const agent = await createMastraAgent(session.user.id);

    // Invoke agent with streaming
    const mastraStream = await agent.stream({
      query: latestMessage.content,
      userId: session.user.id,
      conversationId: req.headers.get('x-conversation-id') || 'default'
    });

    // Wrap Mastra stream in SSE format for useChat
    const sseStream = await wrapMastraStreamForVercelAI(
      mastraStream,
      `msg-${Date.now()}`
    );

    // Return SSE stream
    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(
      JSON.stringify({ error: 'Chat failed', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
```

---

## Tool Call Interception

### Intercept Mastra Tool Calls

To emit `type: "2"` tool call events, intercept tool invocations in Mastra agent:

```typescript
// lib/mastra/agent-with-tools.ts
import { Agent, createTool } from '@mastra/core';

export async function* streamAgentWithToolMetadata(
  agent: Agent,
  input: unknown
): AsyncGenerator<string | ToolCallMetadata> {
  // Track tool calls during agent execution
  const toolCalls: ToolCallMetadata[] = [];

  // Wrap tools to intercept invocations
  const wrappedTools = agent.tools.map(tool => createTool({
    ...tool,
    execute: async (params: unknown) => {
      const toolCallId = `call-${Date.now()}`;

      // Emit tool call event
      yield {
        toolCallId,
        toolName: tool.id,
        args: params
      };

      // Execute original tool
      const result = await tool.execute(params);

      // Emit tool result event
      yield {
        toolCallId,
        toolName: tool.id,
        args: params,
        result
      };

      return result;
    }
  }));

  // Create agent with wrapped tools
  const instrumentedAgent = new Agent({
    ...agent,
    tools: wrappedTools
  });

  // Stream response text
  const textStream = await instrumentedAgent.stream(input);

  for await (const chunk of textStream) {
    yield chunk; // Text chunks
  }
}
```

---

## Frontend Integration Testing

### Test SSE Stream with useChat

```typescript
// __tests__/frontend/useChat.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from 'ai/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock SSE stream
const server = setupServer(
  http.post('/api/mastra/chat', async ({ request }) => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Simulate Mastra response
        const chunks = ['Your', ' lightest', ' tent', ' is', ' the', ' Nemo', ' Hornet', ' Elite', '.'];

        for (const chunk of chunks) {
          const event = { type: '0', id: 'msg-test', content: chunk };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
        }

        const doneEvent = { type: 'd', id: 'msg-test' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`));
        controller.close();
      }
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream'
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('useChat receives SSE stream from Mastra API', async () => {
  const { result } = renderHook(() => useChat({
    api: '/api/mastra/chat'
  }));

  // Send message
  act(() => {
    result.current.setInput('What is my lightest tent?');
    result.current.handleSubmit();
  });

  // Wait for streaming response
  await waitFor(() => {
    expect(result.current.messages).toHaveLength(2); // User message + assistant response
  });

  const assistantMessage = result.current.messages[1];
  expect(assistantMessage.content).toBe('Your lightest tent is the Nemo Hornet Elite.');
  expect(assistantMessage.role).toBe('assistant');
});
```

---

## Error Handling in SSE Stream

### Network Errors

```typescript
// lib/mastra/streaming.ts (with error handling)
export async function wrapMastraStreamForVercelAI(
  mastraStream: AsyncGenerator<string>,
  messageId: string = randomUUID()
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (error) {
          console.error('Failed to enqueue SSE event:', error);
        }
      };

      try {
        for await (const chunk of mastraStream) {
          sendEvent({ type: '0', id: messageId, content: chunk });
        }

        sendEvent({ type: 'd', id: messageId });
        controller.close();

      } catch (error) {
        // Send error event
        sendEvent({
          type: 'e',
          error: error instanceof Error ? error.message : 'Stream error occurred'
        });

        // Close stream
        controller.close();
      }
    },

    cancel() {
      console.log('Client disconnected, cleaning up stream');
    }
  });
}
```

### Frontend Error Display

```typescript
// hooks/useAIChat.ts (with error handling)
import { useChat } from 'ai/react';
import { toast } from 'sonner';

export function useAIChat() {
  const chat = useChat({
    api: '/api/mastra/chat',
    onError: (error) => {
      toast.error('Chat failed', {
        description: error.message || 'Please try again'
      });
    },
    onFinish: (message) => {
      console.log('Response complete:', message);
    }
  });

  return chat;
}
```

---

## Performance Considerations

### Stream Buffering

```typescript
// Disable Vercel edge buffering for SSE
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In API route response headers:
{
  'X-Accel-Buffering': 'no', // Disable nginx buffering
  'Cache-Control': 'no-cache, no-transform'
}
```

### Memory Management

```typescript
// Prevent memory leaks with large streams
async function* limitedChunkStream(
  stream: AsyncGenerator<string>,
  maxChunks: number = 10000
): AsyncGenerator<string> {
  let chunkCount = 0;

  for await (const chunk of stream) {
    if (chunkCount++ >= maxChunks) {
      throw new Error('Stream exceeded maximum chunk limit');
    }
    yield chunk;
  }
}
```

---

## Testing Checklist

### Unit Tests

- [ ] SSE wrapper converts text chunks correctly
- [ ] SSE wrapper emits done event on completion
- [ ] SSE wrapper emits error event on exception
- [ ] Tool call events (type "2") emitted before results
- [ ] Tool result events (type "3") emitted after tool execution

### Integration Tests

- [ ] API route returns valid SSE stream
- [ ] Frontend useChat hook receives messages correctly
- [ ] Streaming updates UI in real-time
- [ ] Error events display toast notifications
- [ ] Client disconnect triggers cleanup

---

## Migration Path

### Phase 2.2: SSE Streaming Wrapper (0.5 days)

1. Create `lib/mastra/streaming.ts` with SSE wrapper
2. Update `/api/mastra/chat/route.ts` to use wrapper
3. Add tool call interception for type "2" events
4. Test with existing frontend `useChat` hook
5. Verify backwards compatibility (no frontend changes needed)

---

## Conclusion

**Deliverable**: Complete SSE streaming compatibility layer for Vercel AI SDK `useChat` hook.

**Key Components**:
1. **SSE Wrapper**: Converts Mastra `AsyncGenerator<string>` → SSE-formatted `ReadableStream`
2. **Event Types**: Supports text (`0`), tool_call (`2`), tool_result (`3`), error (`e`), done (`d`)
3. **Tool Interception**: Emits tool metadata events before/after tool execution
4. **Error Handling**: Graceful error events + client disconnect cleanup

**Timeline Impact**: Add **0.5 days to Phase 2.2** for wrapper implementation + testing.

**Next Steps**:
1. Implement SSE wrapper in `lib/mastra/streaming.ts`
2. Update API route to use wrapper
3. Test with existing frontend `useChat` hook
4. Add tool call interception for rich UI updates
5. Verify streaming performance (no buffering issues)
