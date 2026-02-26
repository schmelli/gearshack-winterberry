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
    expect(prompt).toContain('goals.upcomingTrips');
    expect(prompt).toContain('preferences.weightPhilosophy');
    expect(prompt).toContain('facts');
    expect(prompt).toContain('brands.favorites');
    // Array fields use unambiguous (array) notation, not trailing []
    // Field names are backtick-quoted in the prompt: `fieldName` (array)
    expect(prompt).toContain('`goals.upcomingTrips` (array)');
    expect(prompt).toContain('`brands.favorites` (array)');
    expect(prompt).toContain('`facts` (array)');
    // Confirm old [] suffix is gone
    expect(prompt).not.toContain('goals.upcomingTrips[]');
    expect(prompt).not.toContain('brands.favorites[]');
  });

  it('includes German working memory instructions for de locale', () => {
    const deContext: PromptContext = {
      ...baseContext,
      userContext: { ...baseContext.userContext, locale: 'de' },
    };
    const prompt = buildMastraSystemPrompt(deContext);
    expect(prompt).toContain('Nutzerprofil-Aktualisierungen');
    expect(prompt).toContain('goals.upcomingTrips');
    expect(prompt).toContain('preferences.weightPhilosophy');
    // German uses proper Unicode umlauts — no ASCII substitutes
    expect(prompt).toContain('Gespräche');
    expect(prompt).toContain('erfährst');
    expect(prompt).toContain('nächsten');
    expect(prompt).toContain('Präferenz');
    expect(prompt).toContain('Einträge');
    expect(prompt).not.toContain('Gespraeche');
    expect(prompt).not.toContain('erfaehrst');
    expect(prompt).not.toContain('naechsten');
    expect(prompt).not.toContain('Praeferenz');
    expect(prompt).not.toContain('Eintraege');
  });

  it('places identity section before Working Memory instructions', () => {
    const prompt = buildMastraSystemPrompt(baseContext);
    const identityIndex = prompt.indexOf('Gearshack');
    const wmIndex = prompt.indexOf('Working Memory');
    expect(identityIndex).toBeGreaterThanOrEqual(0);
    expect(wmIndex).toBeGreaterThan(identityIndex);
  });

  it('omits working memory instructions when workingMemoryEnabled is false', () => {
    const prompt = buildMastraSystemPrompt({
      ...baseContext,
      workingMemoryEnabled: false,
    });
    expect(prompt).not.toContain('Working Memory');
    expect(prompt).not.toContain('goals.upcomingTrips');
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
