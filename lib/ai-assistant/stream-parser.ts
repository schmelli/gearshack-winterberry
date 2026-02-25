/**
 * SSE Stream Parser for AI Assistant
 * Feature 050: AI Assistant - Phase 1 Tool Support
 *
 * Parses Server-Sent Events stream from AI streaming endpoint.
 * Extracts text content and tool call metadata for client-side handling.
 */

import type { Action } from '@/types/ai-assistant';

// =====================================================
// Types
// =====================================================

/**
 * SSE Event types emitted by the streaming endpoint
 */
export type SSEEventType = 'text' | 'tool_call' | 'done' | 'error' | 'workflow_progress';

/**
 * Workflow progress data from pipeline stages
 */
export interface WorkflowProgressData {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
}

/**
 * Structured SSE event from the stream
 */
export interface SSEEvent {
  type: SSEEventType;
  data: string | ToolCallData | DoneData | ErrorData | WorkflowProgressData;
}

/**
 * Tool call data structure in SSE events
 */
export interface ToolCallData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Done event data with final metadata
 */
export interface DoneData {
  finishReason: string;
  toolCalls: ToolCallData[];
}

/**
 * Error event data
 */
export interface ErrorData {
  message: string;
  code?: string;
}

/**
 * Parsed stream result containing all extracted data
 */
export interface ParsedStreamResult {
  /** Accumulated text content */
  content: string;
  /** Tool calls extracted from stream */
  toolCalls: ToolCallData[];
  /** Stream metadata */
  metadata: {
    finishReason: string | null;
    hasError: boolean;
    errorMessage: string | null;
  };
}

// =====================================================
// SSE Event Constants
// =====================================================

export const SSE_EVENT_TEXT = 'text';
export const SSE_EVENT_TOOL_CALL = 'tool_call';
export const SSE_EVENT_DONE = 'done';
export const SSE_EVENT_ERROR = 'error';
export const SSE_EVENT_WORKFLOW_PROGRESS = 'workflow_progress';


// =====================================================
// Stream Parsing Utilities
// =====================================================

/**
 * Parse a single SSE event string into structured data
 *
 * Per SSE spec, multi-line data has each line prefixed with "data: "
 *
 * @param eventString - Raw SSE event string (event: type\ndata: ...\n\n)
 * @returns Parsed SSE event or null if invalid
 */
export function parseSSEEvent(eventString: string): SSEEvent | null {
  const lines = eventString.trim().split('\n');
  let eventType: SSEEventType = SSE_EVENT_TEXT;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim() as SSEEventType;
    } else if (line.startsWith('data: ')) {
      dataLines.push(line.slice(6));
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  // Reconstruct multi-line data by joining with newlines
  const dataLine = dataLines.join('\n');

  // Parse data based on event type
  try {
    switch (eventType) {
      case SSE_EVENT_TEXT:
        return { type: eventType, data: dataLine };

      case SSE_EVENT_TOOL_CALL:
        return { type: eventType, data: JSON.parse(dataLine) as ToolCallData };

      case SSE_EVENT_DONE:
        return { type: eventType, data: JSON.parse(dataLine) as DoneData };

      case SSE_EVENT_ERROR:
        return { type: eventType, data: JSON.parse(dataLine) as ErrorData };

      case SSE_EVENT_WORKFLOW_PROGRESS:
        return { type: eventType, data: JSON.parse(dataLine) as WorkflowProgressData };

      default:
        // Unknown event type, treat as text
        return { type: SSE_EVENT_TEXT, data: dataLine };
    }
  } catch {
    // JSON parse failed, treat as plain text
    return { type: SSE_EVENT_TEXT, data: dataLine };
  }
}

/**
 * Create an async generator that yields parsed SSE events from a ReadableStream
 *
 * @param stream - ReadableStream from fetch response
 * @yields Parsed SSE events
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SSEEvent, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          const event = parseSSEEvent(buffer);
          if (event) {
            yield event;
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event separator)
      const events = buffer.split('\n\n');

      // Keep the last incomplete event in buffer
      buffer = events.pop() || '';

      // Yield complete events
      for (const eventString of events) {
        if (eventString.trim()) {
          const event = parseSSEEvent(eventString);
          if (event) {
            yield event;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process an SSE stream and accumulate results
 * Convenience function for simple use cases
 *
 * @param stream - ReadableStream from fetch response
 * @param onTextChunk - Callback for each text chunk (for real-time updates)
 * @param onToolCall - Callback for each tool call (optional)
 * @returns Final parsed result with all content and metadata
 */
export async function processSSEStream(
  stream: ReadableStream<Uint8Array>,
  onTextChunk?: (text: string) => void,
  onToolCall?: (toolCall: ToolCallData) => void
): Promise<ParsedStreamResult> {
  const result: ParsedStreamResult = {
    content: '',
    toolCalls: [],
    metadata: {
      finishReason: null,
      hasError: false,
      errorMessage: null,
    },
  };

  for await (const event of parseSSEStream(stream)) {
    switch (event.type) {
      case SSE_EVENT_TEXT:
        const text = event.data as string;
        result.content += text;
        onTextChunk?.(text);
        break;

      case SSE_EVENT_TOOL_CALL:
        const toolCall = event.data as ToolCallData;
        result.toolCalls.push(toolCall);
        onToolCall?.(toolCall);
        break;

      case SSE_EVENT_DONE:
        const doneData = event.data as DoneData;
        result.metadata.finishReason = doneData.finishReason;
        // Merge any tool calls from done event that weren't streamed
        for (const tc of doneData.toolCalls) {
          if (!result.toolCalls.find((t) => t.toolCallId === tc.toolCallId)) {
            result.toolCalls.push(tc);
            onToolCall?.(tc);
          }
        }
        break;

      case SSE_EVENT_ERROR:
        const errorData = event.data as ErrorData;
        result.metadata.hasError = true;
        result.metadata.errorMessage = errorData.message;
        break;

      case SSE_EVENT_WORKFLOW_PROGRESS:
        // Progress events are informational - no accumulation needed
        break;
    }
  }

  return result;
}

// =====================================================
// Tool Call to Action Conversion
// =====================================================

/**
 * Convert a ToolCallData to an Action type for UI rendering
 *
 * @param toolCall - Tool call from SSE stream
 * @returns Action object or null if tool not recognized
 */
export function toolCallToAction(toolCall: ToolCallData): Action | null {
  const { args } = toolCall;

  switch (toolCall.toolName) {
    case 'addToWishlist': {
      const gearItemId = typeof args.gearItemId === 'string' ? args.gearItemId : null;
      if (!gearItemId) return null;
      return {
        type: 'add_to_wishlist',
        gearItemId,
        status: 'pending',
        error: null,
      };
    }

    case 'compareGear': {
      const gearItemIds = Array.isArray(args.gearItemIds) &&
        args.gearItemIds.every((id): id is string => typeof id === 'string')
        ? args.gearItemIds
        : null;
      if (!gearItemIds || gearItemIds.length < 2) return null;
      return {
        type: 'compare',
        gearItemIds,
        status: 'pending',
        error: null,
      };
    }

    case 'sendMessage': {
      const recipientUserId = typeof args.recipientUserId === 'string' ? args.recipientUserId : null;
      const messagePreview = typeof args.messagePreview === 'string' ? args.messagePreview : '';
      if (!recipientUserId) return null;
      return {
        type: 'send_message',
        recipientUserId,
        messagePreview,
        status: 'pending',
        error: null,
      };
    }

    case 'navigate': {
      const destination = typeof args.destination === 'string' ? args.destination : null;
      if (!destination) return null;
      return {
        type: 'navigate',
        destination,
        status: 'pending',
        error: null,
      };
    }

    default:
      return null;
  }
}

/**
 * Convert multiple tool calls to actions
 *
 * @param toolCalls - Array of tool calls
 * @returns Array of actions (excluding unrecognized tools)
 */
export function toolCallsToActions(toolCalls: ToolCallData[]): Action[] {
  return toolCalls.map(toolCallToAction).filter((a): a is Action => a !== null);
}
