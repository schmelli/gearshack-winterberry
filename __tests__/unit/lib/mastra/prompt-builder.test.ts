/**
 * Unit Tests for buildMastraSystemPrompt
 *
 * After native WM migration: prompt-builder no longer injects working memory.
 * Mastra's WorkingMemory processor handles that automatically.
 */
import { describe, it, expect } from 'vitest';
import { buildMastraSystemPrompt } from '@/lib/mastra/prompt-builder';
import type { PromptContext } from '@/lib/mastra/prompt-builder';

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

  it('does not include manual working memory instructions', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    // These strings were in buildWorkingMemoryInstructions() — should be gone
    expect(prompt).not.toContain('persistUserProfile');
    expect(prompt).not.toContain('user_working_memory');
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
