/**
 * Mastra SSE Streaming Wrapper
 * Feature: 001-mastra-agentic-voice
 * Task: T015 - Create SSE streaming wrapper for Vercel AI SDK compatibility
 *
 * Converts Mastra AsyncGenerator output to SSE format compatible with
 * Vercel AI SDK useChat hook. Maintains backwards compatibility with
 * existing frontend streaming implementation.
 *
 * SSE Event Types:
 * - text: Text content chunk
 * - tool_call: Tool invocation metadata
 * - tool_result: Tool execution result
 * - workflow_progress: Multi-step workflow status updates
 * - done: Stream complete with final metadata
 * - error: Error occurred during streaming
 */

import { randomUUID } from 'crypto';
import type { MastraChatEvent } from '@/types/mastra';

// =====================================================
// Types
// =====================================================

/**
 * SSE event types for streaming responses
 */
export type SSEEventType =
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'workflow_progress'
  | 'done'
  | 'error';

/**
 * Tool call metadata for SSE transmission
 */
export interface SSEToolCallData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Tool result data for SSE transmission
 */
export interface SSEToolResultData {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

/**
 * Workflow progress data for SSE transmission
 */
export interface SSEWorkflowProgressData {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
}

/**
 * Done event data with final metadata
 */
export interface SSEDoneData {
  messageId: string;
  finishReason?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

/**
 * Error event data
 */
export interface SSEErrorData {
  message: string;
  code?: string;
}

/**
 * Options for the Mastra stream wrapper
 */
export interface WrapMastraStreamOptions {
  /** Custom message ID (defaults to UUID) */
  messageId?: string;
  /** Callback when tool is called */
  onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
  /** Callback when tool returns result */
  onToolResult?: (toolCallId: string, result: unknown) => void;
  /** Callback for workflow progress updates */
  onWorkflowProgress?: (step: string, message: string) => void;
  /** Callback on stream error */
  onError?: (error: Error) => void;
  /** Callback on stream complete */
  onComplete?: (messageId: string) => void;
}

// =====================================================
// SSE Encoding Utilities
// =====================================================

/**
 * Encode an SSE event for transmission
 * Format: "event: <type>\ndata: <json>\n\n"
 *
 * Per SSE spec, multi-line data must have each line prefixed with "data: "
 *
 * @param eventType - Type of SSE event
 * @param data - Event payload (will be JSON stringified if object)
 * @returns Encoded SSE string
 */
export function encodeSSEEvent(eventType: SSEEventType, data: unknown): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);

  // Split multi-line data and prefix each line with "data: " per SSE spec
  const lines = dataString.split('\n');
  const dataLines = lines.map(line => `data: ${line}`).join('\n');

  return `event: ${eventType}\n${dataLines}\n\n`;
}

/**
 * Encode a text chunk for SSE transmission
 *
 * @param content - Text content to encode
 * @returns Encoded SSE text event
 */
export function encodeTextEvent(content: string): string {
  return encodeSSEEvent('text', content);
}

/**
 * Encode a tool call event for SSE transmission
 *
 * @param toolCallId - Unique ID for the tool call
 * @param toolName - Name of the tool being called
 * @param args - Arguments passed to the tool
 * @returns Encoded SSE tool_call event
 */
export function encodeToolCallEvent(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): string {
  const data: SSEToolCallData = { toolCallId, toolName, args };
  return encodeSSEEvent('tool_call', data);
}

/**
 * Encode a tool result event for SSE transmission
 *
 * @param toolCallId - ID of the tool call this result belongs to
 * @param toolName - Name of the tool
 * @param result - Result from tool execution
 * @returns Encoded SSE tool_result event
 */
export function encodeToolResultEvent(
  toolCallId: string,
  toolName: string,
  result: unknown
): string {
  const data: SSEToolResultData = { toolCallId, toolName, result };
  return encodeSSEEvent('tool_result', data);
}

/**
 * Encode a workflow progress event for SSE transmission
 *
 * @param step - Current workflow step name
 * @param status - Step status
 * @param message - Human-readable progress message
 * @returns Encoded SSE workflow_progress event
 */
export function encodeWorkflowProgressEvent(
  step: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  message: string
): string {
  const data: SSEWorkflowProgressData = { step, status, message };
  return encodeSSEEvent('workflow_progress', data);
}

/**
 * Encode the done event signaling stream completion
 *
 * @param messageId - ID of the completed message
 * @param finishReason - Optional reason for completion
 * @param tokensUsed - Optional token count
 * @param latencyMs - Optional latency in milliseconds
 * @returns Encoded SSE done event
 */
export function encodeDoneEvent(
  messageId: string,
  finishReason?: string,
  tokensUsed?: number,
  latencyMs?: number
): string {
  const data: SSEDoneData = { messageId, finishReason, tokensUsed, latencyMs };
  return encodeSSEEvent('done', data);
}

/**
 * Encode an error event for SSE transmission
 *
 * @param message - Error message
 * @param code - Optional error code
 * @returns Encoded SSE error event
 */
export function encodeErrorEvent(message: string, code?: string): string {
  const data: SSEErrorData = { message, code };
  return encodeSSEEvent('error', data);
}

// =====================================================
// Mastra Stream Wrapper
// =====================================================

/**
 * Wrap a Mastra AsyncGenerator stream into SSE format compatible with
 * Vercel AI SDK useChat hook.
 *
 * Converts Mastra's native streaming format (AsyncGenerator<MastraChatEvent>)
 * to Server-Sent Events format that the frontend useChat hook expects.
 *
 * @param mastraStream - AsyncGenerator from Mastra agent streaming
 * @param options - Configuration options
 * @returns ReadableStream with SSE-formatted events
 *
 * @example
 * ```typescript
 * const mastraStream = await agent.stream({ query: 'What is my lightest tent?' });
 * const sseStream = await wrapMastraStreamForVercelAI(mastraStream);
 *
 * return new Response(sseStream, {
 *   headers: {
 *     'Content-Type': 'text/event-stream',
 *     'Cache-Control': 'no-cache',
 *     'Connection': 'keep-alive'
 *   }
 * });
 * ```
 */
export async function wrapMastraStreamForVercelAI(
  mastraStream: AsyncGenerator<MastraChatEvent, void, unknown>,
  options: WrapMastraStreamOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const messageId = options.messageId ?? randomUUID();
  const startTime = Date.now();

  return new ReadableStream({
    async start(controller) {
      try {
        // Iterate over Mastra's async generator
        for await (const event of mastraStream) {
          const encoded = encodeMastraChatEvent(event, messageId, options);
          if (encoded) {
            controller.enqueue(encoder.encode(encoded));
          }
        }

        // Calculate latency and send done event
        const latencyMs = Date.now() - startTime;
        controller.enqueue(
          encoder.encode(encodeDoneEvent(messageId, 'stop', undefined, latencyMs))
        );

        // Notify completion callback
        options.onComplete?.(messageId);

        controller.close();
      } catch (error) {
        // Handle stream errors gracefully
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown streaming error';
        const errorCode =
          error instanceof Error && 'code' in error
            ? String((error as Error & { code?: string }).code)
            : 'STREAM_ERROR';

        // Notify error callback
        options.onError?.(error instanceof Error ? error : new Error(errorMessage));

        // Send error event
        controller.enqueue(encoder.encode(encodeErrorEvent(errorMessage, errorCode)));

        controller.close();
      }
    },

    async cancel() {
      // Cleanup when client disconnects
      console.log('[Mastra Streaming] Client disconnected, stream cancelled');
      // Properly close the generator to release resources
      try {
        await mastraStream.return(undefined);
      } catch {
        // Ignore errors during cleanup - generator may already be closed
      }
    },
  });
}

/**
 * Encode a single MastraChatEvent to SSE format
 *
 * @param event - Mastra chat event to encode
 * @param messageId - Message ID for this stream
 * @param options - Wrapper options with callbacks
 * @returns Encoded SSE string or null if event should be skipped
 */
function encodeMastraChatEvent(
  event: MastraChatEvent,
  messageId: string,
  options: WrapMastraStreamOptions
): string | null {
  switch (event.type) {
    case 'text':
      return encodeTextEvent(event.content);

    case 'tool_call': {
      const toolCallId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      options.onToolCall?.(toolCallId, event.toolName, event.args);
      return encodeToolCallEvent(toolCallId, event.toolName, event.args);
    }

    case 'workflow_progress':
      options.onWorkflowProgress?.(event.step, event.message);
      return encodeWorkflowProgressEvent(event.step, 'running', event.message);

    case 'done':
      // Skip done event here - we emit our own at stream end
      return null;

    case 'error':
      return encodeErrorEvent(event.message, event.code);

    default: {
      // Exhaustive check - this should never happen
      const _exhaustiveCheck: never = event;
      console.warn('[Mastra Streaming] Unknown event type:', _exhaustiveCheck);
      return null;
    }
  }
}

// =====================================================
// Simple Text Stream Wrapper
// =====================================================

/**
 * Wrap a simple text async generator into SSE format.
 * Use this for basic text streaming without tool/workflow support.
 *
 * @param textStream - AsyncGenerator yielding text chunks
 * @param messageId - Optional message ID
 * @returns ReadableStream with SSE-formatted text events
 */
export async function wrapTextStreamForVercelAI(
  textStream: AsyncGenerator<string, void, unknown>,
  messageId: string = randomUUID()
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(encodeTextEvent(chunk)));
        }

        const latencyMs = Date.now() - startTime;
        controller.enqueue(
          encoder.encode(encodeDoneEvent(messageId, 'stop', undefined, latencyMs))
        );

        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(encodeErrorEvent(errorMessage, 'STREAM_ERROR'))
        );
        controller.close();
      }
    },

    cancel() {
      console.log('[Mastra Streaming] Text stream cancelled');
    },
  });
}

// =====================================================
// Response Helpers
// =====================================================

/**
 * Create a streaming Response with proper SSE headers
 *
 * @param stream - ReadableStream from wrapMastraStreamForVercelAI
 * @param additionalHeaders - Optional additional headers to include
 * @returns Response configured for SSE streaming
 */
export function createStreamingResponse(
  stream: ReadableStream<Uint8Array>,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      ...additionalHeaders,
    },
  });
}

/**
 * Create a streaming error response
 *
 * @param message - Error message
 * @param code - Error code
 * @param statusCode - HTTP status code (default: 500)
 * @returns Response with error event
 */
export function createStreamingErrorResponse(
  message: string,
  code: string = 'SERVER_ERROR',
  statusCode: number = 500
): Response {
  const encoder = new TextEncoder();
  const errorEvent = encodeErrorEvent(message, code);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(errorEvent));
      controller.close();
    },
  });

  return new Response(stream, {
    status: statusCode,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
