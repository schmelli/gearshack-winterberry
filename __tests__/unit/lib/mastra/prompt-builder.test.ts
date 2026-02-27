/**
 * Unit Tests for buildMastraSystemPrompt and buildToolSection
 *
 * After native WM migration: prompt-builder no longer injects working memory.
 * Mastra's WorkingMemory processor handles that automatically.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildMastraSystemPrompt, buildToolSection } from '@/lib/mastra/prompt-builder';
import type { PromptContext } from '@/lib/mastra/prompt-builder';

// Mock logWarn so buildToolSection's warning path doesn't pollute test output.
// Must be declared before the module-under-test is imported so Vitest hoisting
// correctly replaces the real implementation.
const mockLogWarn = vi.fn();
vi.mock('@/lib/mastra/logging', () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
  logInfo: vi.fn(),
  logError: vi.fn(),
  createTimer: vi.fn(() => () => 0),
}));

const baseContext: PromptContext = {
  userContext: {
    screen: 'inventory',
    locale: 'en',
    inventoryCount: 5,
    userId: 'user-123',
    subscriptionTier: 'standard',
  },
};

describe('buildMastraSystemPrompt', () => {
  it('builds a prompt without workingMemoryProfile field', () => {
    // After migration: PromptContext has no workingMemoryProfile field
    const prompt = buildMastraSystemPrompt(baseContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('does not include legacy working memory API references', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    // These strings were in the old buildWorkingMemoryInstructions() — should be gone
    expect(prompt).not.toContain('persistUserProfile');
    expect(prompt).not.toContain('user_working_memory');
  });

  it('includes working memory profile update instructions', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    // The prompt should teach the agent to actively update working memory
    expect(prompt).toContain('Working Memory');
    expect(prompt).toContain('goals.upcomingTrips[]');
    expect(prompt).toContain('preferences.weightPhilosophy');
    expect(prompt).toContain('facts[]');
    expect(prompt).toContain('brands.favorites[]');
  });

  it('includes German working memory instructions for de locale', () => {
    const deContext: PromptContext = {
      ...baseContext,
      userContext: { ...baseContext.userContext, locale: 'de' },
    };
    const prompt = buildMastraSystemPrompt(deContext);
    expect(prompt).toContain('Nutzerprofil-Aktualisierungen');
    expect(prompt).toContain('goals.upcomingTrips[]');
    expect(prompt).toContain('preferences.weightPhilosophy');
  });

  it('still includes core identity section', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    expect(prompt).toContain('Gearshack');
  });

  it('works for German locale', () => {
    const deContext: PromptContext = {
      ...baseContext,
      userContext: { ...baseContext.userContext, locale: 'de' },
    };
    const prompt = buildMastraSystemPrompt(deContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });
});

// =============================================================================
// Tests: buildToolSection
// =============================================================================

describe('buildToolSection', () => {
  it('returns an empty string when toolNames is empty', () => {
    const result = buildToolSection('en', []);
    expect(result).toBe('');
  });

  it('returns an empty string when all toolNames have no description entry', () => {
    // 'nonExistentTool' has no entry in TOOL_DESCRIPTIONS_EN/DE
    const result = buildToolSection('en', ['nonExistentTool']);
    expect(result).toBe('');
  });

  it('omits tools with no description and logs a warning', () => {
    mockLogWarn.mockClear();

    buildToolSection('en', ['analyzeLoadout', 'unknownToolXyz']);

    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.stringContaining('buildToolSection'),
      expect.objectContaining({
        metadata: expect.objectContaining({ missingTools: ['unknownToolXyz'] }),
      })
    );
  });

  it('uses English header "Available Tools (N):" for locale "en"', () => {
    const result = buildToolSection('en', ['analyzeLoadout', 'searchWeb']);
    expect(result).toMatch(/^\*\*Available Tools \(2\):\*\*/);
  });

  it('uses German header "Verfügbare Tools (N):" for locale "de"', () => {
    const result = buildToolSection('de', ['analyzeLoadout', 'searchWeb']);
    expect(result).toMatch(/^\*\*Verfügbare Tools \(2\):\*\*/);
  });

  it('includes the correct tool count in the header', () => {
    // 3 known tools → header says (3)
    const result = buildToolSection('en', ['analyzeLoadout', 'searchWeb', 'queryUserData']);
    expect(result).toContain('(3)');
  });

  it('does not count missing tools in the header (only present ones)', () => {
    // 1 known + 1 unknown → header says (1), not (2)
    const result = buildToolSection('en', ['analyzeLoadout', 'unknownToolXyz']);
    expect(result).toContain('(1)');
    expect(result).not.toContain('(2)');
  });

  it('includes the English description for a known tool', () => {
    const result = buildToolSection('en', ['analyzeLoadout']);
    expect(result).toContain('analyzeLoadout');
    expect(result).toContain('weight breakdown');
  });

  it('includes the German description for a known tool', () => {
    const result = buildToolSection('de', ['analyzeLoadout']);
    expect(result).toContain('analyzeLoadout');
    expect(result).toContain('Gewichtsaufschlüsselung');
  });

  it('includes descriptions for all known tools in the list', () => {
    const tools = ['searchWeb', 'queryUserData', 'inventoryInsights'];
    const result = buildToolSection('en', tools);
    expect(result).toContain('searchWeb');
    expect(result).toContain('queryUserData');
    expect(result).toContain('inventoryInsights');
  });
});
