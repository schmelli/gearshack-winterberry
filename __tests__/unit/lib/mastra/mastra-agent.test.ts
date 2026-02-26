/**
 * Unit Tests for streamMastraResponse() and createGearshackRequestContext()
 *
 * Critical changes in Dynamic Agent Pattern refactor:
 *  - streamMastraResponse() now accepts a pre-built RequestContext as its 5th param
 *    (previously accepted an optional currentLoadoutId string and built context internally)
 *  - createGearshackRequestContext() factory builds the RequestContext for each request
 *
 * Tests verify:
 *  1. threadId = conversationId is forwarded to agent.stream()
 *  2. resourceId = userId is forwarded to agent.stream()
 *  3. messages array contains only the current user message
 *  4. RequestContext is forwarded unchanged to agent.stream()
 *  5. createGearshackRequestContext() populates context correctly
 *  6. Return value shape
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamMastraResponse, createGearshackRequestContext } from '@/lib/mastra/mastra-agent';

// =============================================================================
// Mock Heavy Dependencies (avoid DB / gateway connections at test time)
// =============================================================================

// RequestContext is a thin Map wrapper in Mastra; using the native Map is
// sufficient for unit testing context propagation.
vi.mock('@mastra/core/request-context', () => ({
  RequestContext: Map,
}));

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

vi.mock('@/lib/mastra/prompt-builder', () => ({
  buildMastraSystemPrompt: vi.fn(() => 'Mocked system prompt'),
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
vi.mock('@/lib/mastra/tools/add-to-loadout', () => ({
  addToLoadoutTool: {},
}));
vi.mock('@/lib/mastra/tools/mcp-graph', () => ({
  searchGearTool: {},
  findAlternativesTool: {},
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
vi.mock('@/lib/mastra/tools/review-recommendation', () => ({
  reviewExpensiveRecommendationTool: {},
}));
vi.mock('@/lib/mastra/gateway', () => ({
  getSharedGateway: vi.fn(() => vi.fn(() => 'mocked-model')),
  getSharedGatewayOrNull: vi.fn(() => vi.fn(() => 'mocked-model')),
}));
// NOTE: update-working-memory mock REMOVED — persistUserProfile tool was removed from agent
// Mastra provides its own updateWorkingMemory tool natively
vi.mock('@/lib/mastra/schemas/working-memory', () => ({
  GearshackUserProfileSchema: {},
}));

// =============================================================================
// Helper: create a minimal Map-based context for test call sites
//
// Since @mastra/core/request-context is mocked as Map, RequestContext instances
// are plain Maps. This helper mirrors the shape built by createGearshackRequestContext.
// =============================================================================

function makeContext(overrides: Record<string, unknown> = {}): Map<string, unknown> {
  const ctx = new Map<string, unknown>();
  ctx.set('userId', overrides.userId ?? 'user-test');
  ctx.set('subscriptionTier', overrides.subscriptionTier ?? 'standard');
  ctx.set('lang', overrides.lang ?? 'en');
  ctx.set('promptContext', overrides.promptContext ?? {});
  if (overrides.enrichedPromptSuffix !== undefined) {
    ctx.set('enrichedPromptSuffix', overrides.enrichedPromptSuffix);
  }
  if (overrides.currentLoadoutId !== undefined) {
    ctx.set('currentLoadoutId', overrides.currentLoadoutId);
  }
  return ctx;
}

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
      const ctx = makeContext({ userId: 'user-xyz' });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'What gear do I need?',
        'user-xyz',
        conversationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
      );

      expect(mockAgent.stream).toHaveBeenCalledOnce();
      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.threadId).toBe(conversationId);
    });

    it('uses the exact conversationId value without modification', async () => {
      const conversationId = 'thread-550e8400-e29b-41d4-a716-446655440000';
      const ctx = makeContext({ userId: 'user-001' });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Show me my loadout',
        'user-001',
        conversationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
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
        firstId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
      );

      mockAgent.stream.mockResolvedValueOnce(createMockStream());

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Second message',
        'user-001',
        secondId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
      const ctx = makeContext({ userId });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Analyze my inventory',
        userId,
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.resourceId).toBe(userId);
    });

    it('uses the exact userId value without modification', async () => {
      const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
      const ctx = makeContext({ userId });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        userId,
        'conv-002',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
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
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-003',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-004',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-005',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
      );

      const [messages] = mockAgent.stream.mock.calls[0];
      // Mastra handles history via threadId; the messages array must have exactly one entry
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: 'user', content: 'Any message' });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. RequestContext is forwarded unchanged to agent.stream()
  //
  // The Dynamic Agent Pattern requires the caller to build a RequestContext via
  // createGearshackRequestContext() and pass it to streamMastraResponse(). The
  // function is responsible only for forwarding it — not for building it.
  // ---------------------------------------------------------------------------

  describe('requestContext forwarding', () => {
    it('passes the requestContext to agent.stream() by reference', async () => {
      const ctx = makeContext({ userId: 'user-001', currentLoadoutId: 'loadout-summer-2024' });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Analyze this loadout',
        'user-001',
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.requestContext).toBe(ctx);
    });

    it('does not mutate the requestContext before passing it', async () => {
      const ctx = makeContext({ userId: 'user-001', currentLoadoutId: 'loadout-summer-2024' });
      const sizeBefore = ctx.size;

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Analyze this loadout',
        'user-001',
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
      );

      expect(ctx.size).toBe(sizeBefore);
    });

    it('still uses the userId argument as resourceId regardless of context contents', async () => {
      const userId = 'user-555';
      const ctx = makeContext({ userId });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        userId,
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any
      );

      const [, options] = mockAgent.stream.mock.calls[0];
      expect(options.resourceId).toBe(userId);
      expect(options.requestContext).toBe(ctx);
    });

    it('different contexts in separate calls are each forwarded correctly', async () => {
      const ctx1 = makeContext({ userId: 'user-a', currentLoadoutId: 'loadout-1' });
      const ctx2 = makeContext({ userId: 'user-b' });

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'First',
        'user-a',
        'conv-a',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx1 as any
      );

      mockAgent.stream.mockResolvedValueOnce(createMockStream());

      await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Second',
        'user-b',
        'conv-b',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx2 as any
      );

      expect(mockAgent.stream.mock.calls[0][1].requestContext).toBe(ctx1);
      expect(mockAgent.stream.mock.calls[1][1].requestContext).toBe(ctx2);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Return value shape
  // ---------------------------------------------------------------------------

  describe('return value', () => {
    it('returns textStream from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
      );

      expect(result.textStream).toBeDefined();
    });

    it('returns toolCalls from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
      );

      expect(result.toolCalls).toBeDefined();
    });

    it('returns fullText from the agent stream', async () => {
      const result = await streamMastraResponse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAgent as any,
        'Hello',
        'user-001',
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
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
        'conv-001',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext() as any
      );

      const text = await result.fullText;
      expect(text).toBe('');
    });
  });
});

// =============================================================================
// createGearshackRequestContext factory tests
//
// Verifies that the factory correctly populates the RequestContext, and that
// optional fields (enrichedPromptSuffix, currentLoadoutId) are only set when
// non-undefined values are provided — critical for billing-gated feature safety.
// =============================================================================

describe('createGearshackRequestContext', () => {
  const baseParams = {
    userId: 'user-123',
    subscriptionTier: 'standard' as const,
    lang: 'en',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promptContext: {} as any,
  };

  it('populates required fields correctly', () => {
    const ctx = createGearshackRequestContext(baseParams);
    expect(ctx.get('userId')).toBe('user-123');
    expect(ctx.get('subscriptionTier')).toBe('standard');
    expect(ctx.get('lang')).toBe('en');
  });

  it('supports trailblazer subscription tier', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, subscriptionTier: 'trailblazer' });
    expect(ctx.get('subscriptionTier')).toBe('trailblazer');
  });

  it('stores the provided lang value', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, lang: 'de' });
    expect(ctx.get('lang')).toBe('de');
  });

  // Optional field: currentLoadoutId

  it('does NOT set currentLoadoutId when omitted', () => {
    const ctx = createGearshackRequestContext(baseParams);
    expect(ctx.has('currentLoadoutId')).toBe(false);
  });

  it('does NOT set currentLoadoutId when explicitly passed undefined', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, currentLoadoutId: undefined });
    expect(ctx.has('currentLoadoutId')).toBe(false);
  });

  it('sets currentLoadoutId when a value is provided', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, currentLoadoutId: 'loadout-summer-2024' });
    expect(ctx.get('currentLoadoutId')).toBe('loadout-summer-2024');
    expect(ctx.has('currentLoadoutId')).toBe(true);
  });

  // Optional field: enrichedPromptSuffix

  it('does NOT set enrichedPromptSuffix when omitted', () => {
    const ctx = createGearshackRequestContext(baseParams);
    expect(ctx.has('enrichedPromptSuffix')).toBe(false);
  });

  it('does NOT set enrichedPromptSuffix when explicitly passed undefined', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, enrichedPromptSuffix: undefined });
    expect(ctx.has('enrichedPromptSuffix')).toBe(false);
  });

  it('sets enrichedPromptSuffix when a value is provided', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, enrichedPromptSuffix: 'extra data' });
    expect(ctx.get('enrichedPromptSuffix')).toBe('extra data');
  });

  // Size assertions — precise counts for billing-gated field safety

  it('has exactly 4 entries when only required fields are provided', () => {
    const ctx = createGearshackRequestContext(baseParams);
    expect(ctx.size).toBe(4);
  });

  it('has exactly 5 entries when currentLoadoutId is provided', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, currentLoadoutId: 'loadout-xyz' });
    expect(ctx.size).toBe(5);
  });

  it('has exactly 5 entries when enrichedPromptSuffix is provided', () => {
    const ctx = createGearshackRequestContext({ ...baseParams, enrichedPromptSuffix: 'extra' });
    expect(ctx.size).toBe(5);
  });

  it('has exactly 6 entries when both optional fields are provided', () => {
    const ctx = createGearshackRequestContext({
      ...baseParams,
      enrichedPromptSuffix: 'extra',
      currentLoadoutId: 'loadout-abc',
    });
    expect(ctx.size).toBe(6);
  });
});
