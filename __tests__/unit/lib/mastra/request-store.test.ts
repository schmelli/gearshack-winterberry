/**
 * Unit Tests — AsyncLocalStorage Request Store & Tool Utils Fallback Paths
 *
 * Tests the AsyncLocalStorage bridge (request-store.ts) and the fallback
 * resolution chain in tool utils (utils.ts) that works around @mastra/core
 * v1.0.4's broken RequestContext propagation.
 *
 * Coverage:
 * - runWithRequestStore / getRequestStore lifecycle
 * - wrapAsyncIterableWithContext: ALS context propagation during stream iteration
 * - extractUserId: Mastra ctx → ALS → env var → null
 * - extractCurrentLoadoutId: Mastra ctx → ALS → null (including empty string rejection)
 * - extractSubscriptionTier: Mastra ctx → ALS → 'standard' (including logic bug fix)
 * - extractLang: Mastra ctx → ALS → 'en'
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  runWithRequestStore,
  getRequestStore,
  wrapAsyncIterableWithContext,
} from '@/lib/mastra/request-store';
import {
  extractUserId,
  extractCurrentLoadoutId,
  extractSubscriptionTier,
  extractLang,
} from '@/lib/mastra/tools/utils';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a mock Mastra execution context with a requestContext Map.
 * Simulates what @mastra/core passes to tool execute() callbacks.
 */
function createMockExecutionContext(entries: Record<string, unknown> = {}) {
  const map = new Map(Object.entries(entries));
  return { requestContext: map };
}

/** Empty execution context — simulates the @mastra/core v1.0.4 bug */
const EMPTY_CONTEXT = createMockExecutionContext({});

// =============================================================================
// request-store.ts — AsyncLocalStorage lifecycle
// =============================================================================

describe('request-store', () => {
  it('getRequestStore returns undefined outside runWithRequestStore', () => {
    expect(getRequestStore()).toBeUndefined();
  });

  it('getRequestStore returns context inside runWithRequestStore (sync)', () => {
    const ctx = {
      userId: 'user-1',
      subscriptionTier: 'trailblazer' as const,
      lang: 'de',
      currentLoadoutId: 'loadout-42',
    };

    runWithRequestStore(ctx, () => {
      const store = getRequestStore();
      expect(store).toEqual(ctx);
    });
  });

  it('getRequestStore returns context inside async runWithRequestStore', async () => {
    const ctx = {
      userId: 'user-async',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };

    await runWithRequestStore(ctx, async () => {
      // Simulate async work
      await new Promise((r) => setTimeout(r, 1));
      const store = getRequestStore();
      expect(store).toBeDefined();
      expect(store!.userId).toBe('user-async');
      expect(store!.subscriptionTier).toBe('standard');
    });
  });

  it('context is isolated between nested runWithRequestStore calls', () => {
    const outerCtx = {
      userId: 'outer',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };
    const innerCtx = {
      userId: 'inner',
      subscriptionTier: 'trailblazer' as const,
      lang: 'de',
    };

    runWithRequestStore(outerCtx, () => {
      expect(getRequestStore()!.userId).toBe('outer');

      runWithRequestStore(innerCtx, () => {
        expect(getRequestStore()!.userId).toBe('inner');
      });

      // Back to outer context
      expect(getRequestStore()!.userId).toBe('outer');
    });
  });

  it('getRequestStore returns undefined after runWithRequestStore completes', () => {
    runWithRequestStore(
      { userId: 'temp', subscriptionTier: 'standard', lang: 'en' },
      () => {
        // Inside: context available
        expect(getRequestStore()).toBeDefined();
      },
    );
    // Outside: context gone
    expect(getRequestStore()).toBeUndefined();
  });
});

// =============================================================================
// wrapAsyncIterableWithContext — stream context propagation
// =============================================================================

describe('wrapAsyncIterableWithContext', () => {
  /**
   * Helper: create a simple async iterable from an array of values.
   */
  async function* asyncFrom<T>(values: T[]): AsyncIterable<T> {
    for (const v of values) {
      yield v;
    }
  }

  /**
   * Helper: create an async iterable that captures ALS context during each
   * next() call — simulating what tool execute() callbacks do inside Mastra's
   * stream pipeline. This is the correct way to test ALS propagation: the
   * context is available DURING the iterator's internal processing (where
   * tools run), not in the for-await loop body (which is the consumer).
   */
  function createContextCapturingIterable(values: string[]): {
    iterable: AsyncIterable<string>;
    capturedUserIds: (string | undefined)[];
  } {
    const capturedUserIds: (string | undefined)[] = [];

    const iterable: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          next(): Promise<IteratorResult<string>> {
            // This runs INSIDE requestStore.run() when wrapped —
            // simulates a tool's execute() checking getRequestStore()
            const store = getRequestStore();
            capturedUserIds.push(store?.userId);

            if (index < values.length) {
              return Promise.resolve({ done: false, value: values[index++] });
            }
            return Promise.resolve({ done: true, value: undefined as unknown as string });
          },
        };
      },
    };

    return { iterable, capturedUserIds };
  }

  it('propagates ALS context to iterator next() calls (where tools execute)', async () => {
    const ctx = {
      userId: 'stream-user',
      subscriptionTier: 'trailblazer' as const,
      lang: 'de',
    };

    const { iterable, capturedUserIds } = createContextCapturingIterable(['a', 'b', 'c']);
    const wrapped = wrapAsyncIterableWithContext(iterable, ctx);

    const collected: string[] = [];
    for await (const chunk of wrapped) {
      collected.push(chunk);
    }

    // Values pass through correctly
    expect(collected).toEqual(['a', 'b', 'c']);
    // ALS context was available during each next() call (3 data + 1 terminal done:true)
    expect(capturedUserIds).toEqual([
      'stream-user', // next() for 'a'
      'stream-user', // next() for 'b'
      'stream-user', // next() for 'c'
      'stream-user', // next() for done:true
    ]);
  });

  it('does NOT propagate context without wrapper', async () => {
    // Baseline test: without wrapAsyncIterableWithContext, the iterator
    // does NOT have ALS context. This proves the wrapper is necessary.
    const { iterable, capturedUserIds } = createContextCapturingIterable(['x']);

    const collected: string[] = [];
    for await (const chunk of iterable) {
      collected.push(chunk);
    }

    expect(collected).toEqual(['x']);
    // Without wrapper, all captures should be undefined
    expect(capturedUserIds).toEqual([undefined, undefined]);
  });

  it('ALS context is NOT available in the for-await loop body (consumer side)', async () => {
    const ctx = {
      userId: 'scoped-user',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };

    const source = asyncFrom([1]);
    const wrapped = wrapAsyncIterableWithContext(source, ctx);

    // Before iteration
    expect(getRequestStore()).toBeUndefined();

    for await (const _chunk of wrapped) {
      // The loop body runs in the CALLER's async context, not inside run().
      // This is expected — tools don't execute here, they execute inside next().
      expect(getRequestStore()).toBeUndefined();
    }

    // After iteration
    expect(getRequestStore()).toBeUndefined();
  });

  it('passes through all values from the source iterable', async () => {
    const ctx = {
      userId: 'user-1',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };

    const values = [10, 20, 30, 40];
    const source = asyncFrom(values);
    const wrapped = wrapAsyncIterableWithContext(source, ctx);

    const collected: number[] = [];
    for await (const v of wrapped) {
      collected.push(v);
    }

    expect(collected).toEqual(values);
  });

  it('simulates tool execution with ALS context during stream processing', async () => {
    const ctx = {
      userId: 'tool-user-123',
      subscriptionTier: 'trailblazer' as const,
      lang: 'de',
      currentLoadoutId: 'loadout-abc',
    };

    // Simulate Mastra's stream pipeline: tool execute() is called during
    // the iterator's next() method (inside the stream processing), NOT
    // in the consumer's for-await loop body.
    const toolExecutionResults: (string | null)[] = [];

    const streamWithToolCalls: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        let step = 0;
        return {
          async next(): Promise<IteratorResult<string>> {
            step++;
            if (step === 1) return { done: false, value: 'text-chunk-1' };
            if (step === 2) {
              // Simulate tool execute() — this is where getRequestStore() matters
              const store = getRequestStore();
              toolExecutionResults.push(store?.userId ?? null);
              return { done: false, value: 'tool-result' };
            }
            if (step === 3) return { done: false, value: 'text-chunk-2' };
            return { done: true, value: undefined as unknown as string };
          },
        };
      },
    };

    const wrapped = wrapAsyncIterableWithContext(streamWithToolCalls, ctx);

    const collected: string[] = [];
    for await (const chunk of wrapped) {
      collected.push(chunk);
    }

    expect(collected).toEqual(['text-chunk-1', 'tool-result', 'text-chunk-2']);
    // Tool execution during step 2 had access to ALS context
    expect(toolExecutionResults).toEqual(['tool-user-123']);
  });

  it('handles empty async iterables gracefully', async () => {
    const ctx = {
      userId: 'empty-user',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };

    const source = asyncFrom<string>([]);
    const wrapped = wrapAsyncIterableWithContext(source, ctx);

    const collected: string[] = [];
    for await (const v of wrapped) {
      collected.push(v);
    }

    expect(collected).toEqual([]);
  });

  it('propagates errors from the source iterable', async () => {
    const ctx = {
      userId: 'error-user',
      subscriptionTier: 'standard' as const,
      lang: 'en',
    };

    async function* failingStream(): AsyncIterable<string> {
      yield 'ok';
      throw new Error('stream-error');
    }

    const wrapped = wrapAsyncIterableWithContext(failingStream(), ctx);

    const collected: string[] = [];
    await expect(async () => {
      for await (const v of wrapped) {
        collected.push(v);
      }
    }).rejects.toThrow('stream-error');

    expect(collected).toEqual(['ok']);
  });
});

// =============================================================================
// extractUserId — resolution chain
// =============================================================================

describe('extractUserId', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalStudioId = process.env.MASTRA_STUDIO_USER_ID;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalStudioId !== undefined) {
      process.env.MASTRA_STUDIO_USER_ID = originalStudioId;
    } else {
      delete process.env.MASTRA_STUDIO_USER_ID;
    }
  });

  it('returns userId from Mastra execution context when available', () => {
    const ctx = createMockExecutionContext({ userId: 'mastra-user-123' });
    expect(extractUserId(ctx)).toBe('mastra-user-123');
  });

  it('falls back to AsyncLocalStorage when execution context is empty', () => {
    runWithRequestStore(
      { userId: 'als-user-456', subscriptionTier: 'standard', lang: 'en' },
      () => {
        expect(extractUserId(EMPTY_CONTEXT)).toBe('als-user-456');
      },
    );
  });

  it('prefers Mastra context over AsyncLocalStorage', () => {
    const ctx = createMockExecutionContext({ userId: 'mastra-wins' });
    runWithRequestStore(
      { userId: 'als-loses', subscriptionTier: 'standard', lang: 'en' },
      () => {
        expect(extractUserId(ctx)).toBe('mastra-wins');
      },
    );
  });

  it('falls back to MASTRA_STUDIO_USER_ID in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.MASTRA_STUDIO_USER_ID = 'studio-user-789';
    expect(extractUserId(EMPTY_CONTEXT)).toBe('studio-user-789');
  });

  it('does NOT use MASTRA_STUDIO_USER_ID in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MASTRA_STUDIO_USER_ID = 'studio-user-should-not-leak';
    expect(extractUserId(EMPTY_CONTEXT)).toBeNull();
  });

  it('returns null when all sources are empty', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MASTRA_STUDIO_USER_ID;
    expect(extractUserId(EMPTY_CONTEXT)).toBeNull();
  });

  it('rejects non-string userId from Mastra context', () => {
    const ctx = createMockExecutionContext({ userId: 12345 });
    // Non-string should be rejected, fall back to null
    expect(extractUserId(ctx)).toBeNull();
  });
});

// =============================================================================
// extractCurrentLoadoutId — resolution chain
// =============================================================================

describe('extractCurrentLoadoutId', () => {
  it('returns loadoutId from Mastra execution context', () => {
    const ctx = createMockExecutionContext({ currentLoadoutId: 'loadout-abc' });
    expect(extractCurrentLoadoutId(ctx)).toBe('loadout-abc');
  });

  it('falls back to AsyncLocalStorage when execution context is empty', () => {
    runWithRequestStore(
      {
        userId: 'user-1',
        subscriptionTier: 'standard',
        lang: 'en',
        currentLoadoutId: 'als-loadout-def',
      },
      () => {
        expect(extractCurrentLoadoutId(EMPTY_CONTEXT)).toBe('als-loadout-def');
      },
    );
  });

  it('returns null when loadoutId is not set anywhere', () => {
    expect(extractCurrentLoadoutId(EMPTY_CONTEXT)).toBeNull();
  });

  it('returns null for non-string loadoutId in Mastra context', () => {
    const ctx = createMockExecutionContext({ currentLoadoutId: 42 });
    expect(extractCurrentLoadoutId(ctx)).toBeNull();
  });

  it('returns null when ALS has no currentLoadoutId', () => {
    runWithRequestStore(
      { userId: 'user-1', subscriptionTier: 'standard', lang: 'en' },
      () => {
        expect(extractCurrentLoadoutId(EMPTY_CONTEXT)).toBeNull();
      },
    );
  });

  it('rejects empty string loadoutId from Mastra context', () => {
    const ctx = createMockExecutionContext({ currentLoadoutId: '' });
    expect(extractCurrentLoadoutId(ctx)).toBeNull();
  });

  it('rejects empty string loadoutId from ALS', () => {
    runWithRequestStore(
      {
        userId: 'user-1',
        subscriptionTier: 'standard',
        lang: 'en',
        currentLoadoutId: '',
      },
      () => {
        expect(extractCurrentLoadoutId(EMPTY_CONTEXT)).toBeNull();
      },
    );
  });
});

// =============================================================================
// extractSubscriptionTier — resolution chain (includes logic bug fix test)
// =============================================================================

describe('extractSubscriptionTier', () => {
  it('returns trailblazer from Mastra execution context', () => {
    const ctx = createMockExecutionContext({ subscriptionTier: 'trailblazer' });
    expect(extractSubscriptionTier(ctx)).toBe('trailblazer');
  });

  it('returns standard from Mastra execution context (bug fix: previously fell through)', () => {
    // This is the key regression test for the Gemini-identified logic bug:
    // Previously, 'standard' from executionContext was ignored and the function
    // fell through to ALS which could incorrectly return 'trailblazer'.
    const ctx = createMockExecutionContext({ subscriptionTier: 'standard' });
    runWithRequestStore(
      { userId: 'user-1', subscriptionTier: 'trailblazer', lang: 'en' },
      () => {
        // Even though ALS has 'trailblazer', the Mastra context's 'standard' should win
        expect(extractSubscriptionTier(ctx)).toBe('standard');
      },
    );
  });

  it('falls back to AsyncLocalStorage when execution context is empty', () => {
    runWithRequestStore(
      { userId: 'user-1', subscriptionTier: 'trailblazer', lang: 'en' },
      () => {
        expect(extractSubscriptionTier(EMPTY_CONTEXT)).toBe('trailblazer');
      },
    );
  });

  it('defaults to standard when no source has a tier', () => {
    expect(extractSubscriptionTier(EMPTY_CONTEXT)).toBe('standard');
  });

  it('ignores invalid tier values from Mastra context', () => {
    const ctx = createMockExecutionContext({ subscriptionTier: 'premium' });
    expect(extractSubscriptionTier(ctx)).toBe('standard');
  });
});

// =============================================================================
// extractLang — resolution chain
// =============================================================================

describe('extractLang', () => {
  it('returns lang from Mastra execution context', () => {
    const ctx = createMockExecutionContext({ lang: 'de' });
    expect(extractLang(ctx)).toBe('de');
  });

  it('falls back to AsyncLocalStorage when execution context is empty', () => {
    runWithRequestStore(
      { userId: 'user-1', subscriptionTier: 'standard', lang: 'de' },
      () => {
        expect(extractLang(EMPTY_CONTEXT)).toBe('de');
      },
    );
  });

  it('defaults to en when no source has a lang', () => {
    expect(extractLang(EMPTY_CONTEXT)).toBe('en');
  });

  it('rejects non-string lang from Mastra context', () => {
    const ctx = createMockExecutionContext({ lang: 42 });
    expect(extractLang(ctx)).toBe('en');
  });

  it('rejects empty string lang from Mastra context', () => {
    const ctx = createMockExecutionContext({ lang: '' });
    expect(extractLang(ctx)).toBe('en');
  });

  it('prefers Mastra context over AsyncLocalStorage', () => {
    const ctx = createMockExecutionContext({ lang: 'fr' });
    runWithRequestStore(
      { userId: 'user-1', subscriptionTier: 'standard', lang: 'de' },
      () => {
        expect(extractLang(ctx)).toBe('fr');
      },
    );
  });
});
