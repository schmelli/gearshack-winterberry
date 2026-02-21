/**
 * Unit Tests for streamMastraResponse()
 *
 * Critical fix: threadId = conversationId is now passed to agent.stream()
 * so Mastra's PostgresStore can inject conversation history automatically.
 * Tests verify the correct parameters are forwarded and that only the
 * current user message is included in the messages array.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamMastraResponse } from '@/lib/mastra/mastra-agent';

// =============================================================================
// Mock Heavy Dependencies (avoid DB / gateway connections at test time)
// =============================================================================

vi.mock('@mastra/core/agent', () => ({
  Agent: vi.fn(),
}));

vi.mock('@mastra/memory', () => ({
  Memory: vi.fn(),
}));

vi.mock('@mastra/pg', () => ({
  PostgresStore: vi.fn(),
  PgVector: vi.fn(),
}));

vi.mock('@ai-sdk/gateway', () => ({
  createGateway: vi.fn(() => {
    const gateway = vi.fn(() => 'mocked-model');
    // @ts-expect-error – mock duck-typed gateway
    gateway.textEmbeddingModel = vi.fn(() => 'mocked-embedding-model');
    return gateway;
  }),
}));

// Mock all tools so module resolution does not fail
vi.mock('@/lib/mastra/tools/analyze-loadout', () => ({
  analyzeLoadoutTool: {},
}));
vi.mock('@/lib/mastra/tools/inventory-insights', () => ({
  inventoryInsightsTool: {},
}));
vi.mock('@/lib/mastra/tools/search-gear-knowledge', () => ({
  searchGearKnowledgeTool: {},
}));
vi.mock('@/lib/mastra/tools/query-user-data-sql', () => ({
  queryUserDataSqlTool: {},
}));
vi.mock('@/lib/mastra/tools/query-geargraph-v2', () => ({
  queryGearGraphTool: {},
}));
vi.mock('@/lib/mastra/tools/search-web', () => ({
  searchWebTool: {},
}));
vi.mock('@/lib/mastra/tools/update-working-memory', () => ({
  updateWorkingMemoryTool: {},
}));
vi.mock('@/lib/mastra/schemas/working-memory', () => ({
  GearshackUserProfileSchema: {},
}));

// =============================================================================
// Helper: create a mock stream with controllable textStream
// =============================================================================

function createMockStream() {
  const mockTextStream = (async function* () {
    yield 'Hello';
    yield ' World';
  })();

  return {
    textStream: mockTextStream,
    toolCalls: Promise.resolve([]),
    text: Promise.resolve('Hello World'),
    finishReason: Promise.resolve('stop'),
  };
}

// =============================================================================
// Helper: create a mock Agent whose stream() method we can spy on
// =============================================================================

function createMockAgent() {
  return {
    stream: vi.fn().mockResolvedValue(createMockStream()),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('streamMastraResponse', () => {
  let mockAgent: ReturnType<typeof createMockAgent>;

  beforeEach(() => {
    mockAgent = createMockAgent();
  });

  // ---------------------------------------------------------------------------
  // 1. threadId = conversationId is forwarded to agent.stream()
  // ---------------------------------------------------------------------------

  describe('threadId parameter', () => {
    it('passes conversationId as threadId to agent.stream()', async () => {
      const conversationId = 'conv-abc-123';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'What gear do I need?',
        'user-xyz',
        conversationId
      );

      expect(mockAgent.stream).toHaveBeenCalledOnce();
      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.threadId).toBe(conversationId);
    });

    it('uses the exact conversationId value without modification', async () => {
      const conversationId = 'thread-550e8400-e29b-41d4-a716-446655440000';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Show me my loadout',
        'user-001',
        conversationId
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.threadId).toBe(conversationId);
    });

    it('passes different conversationIds in separate calls correctly', async () => {
      const firstId = 'conv-first';
      const secondId = 'conv-second';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'First message',
        'user-001',
        firstId
      );

      mockAgent.stream.mockResolvedValueOnce(createMockStream());

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Second message',
        'user-001',
        secondId
      );

      expect(mockAgent.stream).toHaveBeenCalledTimes(2);
      expect(mockAgent.stream.mock.calls[0][1].threadId).toBe(firstId);
      expect(mockAgent.stream.mock.calls[1][1].threadId).toBe(secondId);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. resourceId = userId is forwarded to agent.stream()
  // ---------------------------------------------------------------------------

  describe('resourceId parameter', () => {
    it('passes userId as resourceId to agent.stream()', async () => {
      const userId = 'user-987';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Analyze my inventory',
        userId,
        'conv-001'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.resourceId).toBe(userId);
    });

    it('uses the exact userId value without modification', async () => {
      const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        userId,
        'conv-002'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.resourceId).toBe(userId);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. messages array contains only the current user message (no history)
  // ---------------------------------------------------------------------------

  describe('messages array', () => {
    it('sends only the current user message in the messages array', async () => {
      const userMessage = 'What is the best tent for winter camping?';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        userMessage,
        'user-001',
        'conv-001'
      );

      const [messages] = mockAgent.stream.mock.calls[0];
      expect(messages).toHaveLength(1);
    });

    it('sets the role to "user" for the message', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Show me lightweight sleeping bags',
        'user-002',
        'conv-003'
      );

      const [messages] = mockAgent.stream.mock.calls[0];
      expect(messages[0].role).toBe('user');
    });

    it('sets the content to the provided message string', async () => {
      const userMessage = 'Tell me about my hiking loadout';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        userMessage,
        'user-003',
        'conv-004'
      );

      const [messages] = mockAgent.stream.mock.calls[0];
      expect(messages[0].content).toBe(userMessage);
    });

    it('does not include any history messages (only the single current message)', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Any message',
        'user-004',
        'conv-005'
      );

      const [messages] = mockAgent.stream.mock.calls[0];
      // Mastra handles history via threadId; the messages array must have exactly one entry
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: 'user', content: 'Any message' });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. currentLoadoutId is set in requestContext when provided
  // ---------------------------------------------------------------------------

  describe('currentLoadoutId in requestContext', () => {
    it('sets currentLoadoutId in requestContext when provided', async () => {
      const loadoutId = 'loadout-summer-2024';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Analyze this loadout',
        'user-001',
        'conv-001',
        loadoutId
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.get('currentLoadoutId')).toBe(loadoutId);
    });

    it('always sets userId in requestContext', async () => {
      const userId = 'user-555';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        userId,
        'conv-001',
        'some-loadout'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.get('userId')).toBe(userId);
    });

    it('passes requestContext as a Map instance', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Test',
        'user-001',
        'conv-001',
        'loadout-abc'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.requestContext).toBeInstanceOf(Map);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. currentLoadoutId is NOT set in requestContext when not provided
  // ---------------------------------------------------------------------------

  describe('currentLoadoutId omitted from requestContext when not provided', () => {
    it('does not set currentLoadoutId when argument is undefined', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'General question',
        'user-001',
        'conv-001'
        // currentLoadoutId intentionally omitted
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.has('currentLoadoutId')).toBe(false);
    });

    it('does not set currentLoadoutId when explicitly passed undefined', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Another question',
        'user-002',
        'conv-002',
        undefined
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.has('currentLoadoutId')).toBe(false);
    });

    it('still sets userId in requestContext even when currentLoadoutId is omitted', async () => {
      const userId = 'user-no-loadout';

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Just a chat',
        userId,
        'conv-003'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.get('userId')).toBe(userId);
      expect(requestContext.has('currentLoadoutId')).toBe(false);
    });

    it('requestContext has exactly one entry when currentLoadoutId is omitted', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'No loadout context',
        'user-001',
        'conv-001'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.size).toBe(1);
    });

    it('requestContext has exactly two entries when currentLoadoutId is provided', async () => {
      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'With loadout context',
        'user-001',
        'conv-001',
        'loadout-xyz'
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      const requestContext: Map<string, unknown> = options.requestContext;
      expect(requestContext.size).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Return value shape
  // ---------------------------------------------------------------------------

  describe('return value', () => {
    it('returns textStream from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001'
      );

      expect(result.textStream).toBeDefined();
    });

    it('returns toolCalls from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001'
      );

      expect(result.toolCalls).toBeDefined();
    });

    it('returns fullText from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001'
      );

      const text = await result.fullText;
      expect(text).toBe('Hello World');
    });

    it('returns finishReason from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001'
      );

      const reason = await result.finishReason;
      expect(reason).toBe('stop');
    });

    it('falls back to empty resolved promise when toolCalls is absent', async () => {
      const streamWithoutToolCalls = {
        textStream: (async function* () { yield 'Hi'; })(),
        text: Promise.resolve('Hi'),
        finishReason: Promise.resolve('stop'),
        // toolCalls deliberately omitted
      };
      mockAgent.stream.mockResolvedValueOnce(streamWithoutToolCalls);

      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hi',
        'user-001',
        'conv-001'
      );

      const toolCalls = await result.toolCalls;
      expect(toolCalls).toEqual([]);
    });

    it('falls back to empty string when text is absent', async () => {
      const streamWithoutText = {
        textStream: (async function* () { yield ''; })(),
        toolCalls: Promise.resolve([]),
        finishReason: Promise.resolve('stop'),
        // text deliberately omitted
      };
      mockAgent.stream.mockResolvedValueOnce(streamWithoutText);

      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hi',
        'user-001',
        'conv-001'
      );

      const text = await result.fullText;
      expect(text).toBe('');
    });
  });
});
