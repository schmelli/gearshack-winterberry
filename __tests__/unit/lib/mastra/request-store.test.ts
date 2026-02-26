/**
 * Unit Tests — AsyncLocalStorage Request Store & Tool Utils Fallback Paths
 *
 * Tests the AsyncLocalStorage bridge (request-store.ts) and the fallback
 * resolution chain in tool utils (utils.ts) that works around @mastra/core
 * v1.0.4's broken RequestContext propagation.
 *
 * Coverage:
 * - runWithRequestStore / getRequestStore lifecycle
 * - extractUserId: Mastra ctx → ALS → env var → null
 * - extractCurrentLoadoutId: Mastra ctx → ALS → null
 * - extractSubscriptionTier: Mastra ctx → ALS → 'standard' (including logic bug fix)
 * - extractLang: Mastra ctx → ALS → 'en'
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  runWithRequestStore,
  getRequestStore,
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
