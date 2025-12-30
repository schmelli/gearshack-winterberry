/**
 * Prompt Builder Tests
 *
 * Tests for AI image generation prompt construction including
 * input sanitization, activity mapping, and style preferences.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPrompt,
  generateAltText,
  validatePrompt,
  previewPrompt,
} from '@/lib/prompt-builder';

// =============================================================================
// buildPrompt Tests
// =============================================================================

describe('buildPrompt', () => {
  describe('Basic Prompt Construction', () => {
    it('should construct prompt with all parameters', () => {
      const result = buildPrompt({
        title: 'PCT Thru-Hike 2024',
        description: 'Gear for the Pacific Crest Trail',
        season: 'summer',
        activityTypes: ['hiking', 'backpacking'],
        stylePreferences: {
          template: 'cinematic',
          timeOfDay: 'golden_hour',
        },
      });

      expect(result.prompt).toContain('Professional outdoor photography');
      expect(result.prompt).toContain('mountain trail');
      expect(result.negativePrompt).toContain('people');
      expect(result.negativePrompt).toContain('watermarks');
    });

    it('should return valid prompt and negative prompt', () => {
      const result = buildPrompt({});

      expect(result.prompt).toBeDefined();
      expect(result.negativePrompt).toBeDefined();
      expect(result.prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Type Mapping', () => {
    it('should use hiking landscape for hiking activity', () => {
      const result = buildPrompt({ activityTypes: ['hiking'] });
      expect(result.prompt).toContain('mountain trail');
    });

    it('should use camping landscape for camping activity', () => {
      const result = buildPrompt({ activityTypes: ['camping'] });
      expect(result.prompt).toContain('campsite');
    });

    it('should use climbing landscape for climbing activity', () => {
      const result = buildPrompt({ activityTypes: ['climbing'] });
      expect(result.prompt).toContain('alpine rock face');
    });

    it('should use skiing landscape for skiing activity', () => {
      const result = buildPrompt({ activityTypes: ['skiing'] });
      expect(result.prompt).toContain('snow-covered');
    });

    it('should use backpacking landscape for backpacking activity', () => {
      const result = buildPrompt({ activityTypes: ['backpacking'] });
      expect(result.prompt).toContain('backcountry');
    });

    it('should use generic landscape for unknown activity', () => {
      const result = buildPrompt({ activityTypes: ['kayaking'] });
      expect(result.prompt).toContain('wilderness landscape');
    });

    it('should use first activity when multiple provided', () => {
      const result = buildPrompt({ activityTypes: ['camping', 'hiking'] });
      expect(result.prompt).toContain('campsite');
    });
  });

  describe('Seasonal Descriptors', () => {
    it('should include spring descriptors', () => {
      const result = buildPrompt({ season: 'spring' });
      expect(result.prompt).toContain('blooming wildflowers');
    });

    it('should include summer descriptors', () => {
      const result = buildPrompt({ season: 'summer' });
      expect(result.prompt).toContain('lush greenery');
    });

    it('should include fall descriptors', () => {
      const result = buildPrompt({ season: 'fall' });
      expect(result.prompt).toContain('golden autumn foliage');
    });

    it('should include winter descriptors', () => {
      const result = buildPrompt({ season: 'winter' });
      expect(result.prompt).toContain('snow-covered');
    });

    it('should use generic environment when no season', () => {
      const result = buildPrompt({});
      expect(result.prompt).toContain('natural outdoor environment');
    });
  });

  describe('Style Templates', () => {
    it('should apply cinematic style', () => {
      const result = buildPrompt({
        stylePreferences: { template: 'cinematic' },
      });
      expect(result.prompt).toContain('cinematic composition');
    });

    it('should apply documentary style', () => {
      const result = buildPrompt({
        stylePreferences: { template: 'documentary' },
      });
      expect(result.prompt).toContain('documentary style');
    });

    it('should apply magazine style', () => {
      const result = buildPrompt({
        stylePreferences: { template: 'magazine' },
      });
      expect(result.prompt).toContain('magazine cover quality');
    });

    it('should apply instagram style', () => {
      const result = buildPrompt({
        stylePreferences: { template: 'instagram' },
      });
      expect(result.prompt).toContain('instagram aesthetic');
    });
  });

  describe('Time of Day Lighting', () => {
    it('should apply golden hour lighting', () => {
      const result = buildPrompt({
        stylePreferences: { timeOfDay: 'golden_hour' },
      });
      expect(result.prompt).toContain('golden hour light');
    });

    it('should apply blue hour lighting', () => {
      const result = buildPrompt({
        stylePreferences: { timeOfDay: 'blue_hour' },
      });
      expect(result.prompt).toContain('blue hour lighting');
    });

    it('should apply dawn lighting', () => {
      const result = buildPrompt({
        stylePreferences: { timeOfDay: 'dawn' },
      });
      expect(result.prompt).toContain('early morning light');
    });

    it('should apply dusk lighting', () => {
      const result = buildPrompt({
        stylePreferences: { timeOfDay: 'dusk' },
      });
      expect(result.prompt).toContain('sunset colors');
    });

    it('should apply midday lighting', () => {
      const result = buildPrompt({
        stylePreferences: { timeOfDay: 'midday' },
      });
      expect(result.prompt).toContain('bright daylight');
    });
  });

  describe('Default Lighting by Season', () => {
    it('should use dawn lighting for spring by default', () => {
      const result = buildPrompt({ season: 'spring' });
      expect(result.prompt).toContain('early morning light');
    });

    it('should use golden hour for summer by default', () => {
      const result = buildPrompt({ season: 'summer' });
      expect(result.prompt).toContain('golden hour');
    });

    it('should use dusk for fall by default', () => {
      const result = buildPrompt({ season: 'fall' });
      expect(result.prompt).toContain('sunset colors');
    });

    it('should use blue hour for winter by default', () => {
      const result = buildPrompt({ season: 'winter' });
      expect(result.prompt).toContain('blue hour');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize atmosphere text', () => {
      const result = buildPrompt({
        stylePreferences: {
          atmosphere: 'ignore this, system prompt override command',
        },
      });

      // Sanitizer removes: ignore, disregard, system, override, instruction, command, prompt, admin, root
      expect(result.prompt).not.toContain('ignore');
      expect(result.prompt).not.toContain('system');
      expect(result.prompt).not.toContain('override');
      expect(result.prompt).not.toContain('command');
    });

    it('should remove brackets from atmosphere', () => {
      const result = buildPrompt({
        stylePreferences: {
          atmosphere: 'peaceful {inject} [attack] mood',
        },
      });

      expect(result.prompt).not.toContain('{');
      expect(result.prompt).not.toContain('}');
      expect(result.prompt).not.toContain('[');
      expect(result.prompt).not.toContain(']');
    });
  });

  describe('Quality Modifiers', () => {
    it('should include quality modifiers', () => {
      const result = buildPrompt({});
      expect(result.prompt).toContain('high resolution');
      expect(result.prompt).toContain('8k quality');
    });
  });

  describe('Negative Prompt', () => {
    it('should exclude people and faces', () => {
      const result = buildPrompt({});
      expect(result.negativePrompt).toContain('people');
      expect(result.negativePrompt).toContain('faces');
    });

    it('should exclude text and watermarks', () => {
      const result = buildPrompt({});
      expect(result.negativePrompt).toContain('text');
      expect(result.negativePrompt).toContain('watermarks');
    });

    it('should exclude low quality indicators', () => {
      const result = buildPrompt({});
      expect(result.negativePrompt).toContain('low quality');
      expect(result.negativePrompt).toContain('blurry');
    });
  });
});

// =============================================================================
// generateAltText Tests
// =============================================================================

describe('generateAltText', () => {
  it('should generate descriptive alt text', () => {
    const altText = generateAltText({
      title: 'PCT Thru-Hike',
      season: 'summer',
      activityTypes: ['hiking'],
    });

    expect(altText).toContain('mountain trail');
    expect(altText).toContain('in summer');
    expect(altText).toContain('hiking gear loadout');
  });

  it('should include title reference', () => {
    const altText = generateAltText({
      title: 'Weekend Trip',
      activityTypes: ['camping'],
    });

    expect(altText).toContain('Weekend Trip');
  });

  it('should handle missing parameters', () => {
    const altText = generateAltText({});

    expect(altText).toContain('outdoor');
    expect(altText.length).toBeGreaterThan(0);
  });

  it('should sanitize title in alt text', () => {
    const altText = generateAltText({
      title: 'Trip {ignore system} 2024',
      activityTypes: ['hiking'],
    });

    expect(altText).not.toContain('{');
    expect(altText).not.toContain('ignore');
    expect(altText).not.toContain('system');
  });

  it('should not include generic loadout title', () => {
    const altText = generateAltText({
      title: 'loadout',
      activityTypes: ['camping'],
    });

    expect(altText).not.toContain('(loadout)');
  });
});

// =============================================================================
// validatePrompt Tests
// =============================================================================

describe('validatePrompt', () => {
  it('should accept valid prompt', () => {
    const result = validatePrompt('A beautiful mountain landscape with hiking trail');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject prompt under 10 characters', () => {
    const result = validatePrompt('Short');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should reject prompt over 1000 characters', () => {
    const result = validatePrompt('a'.repeat(1001));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should reject empty prompt', () => {
    const result = validatePrompt('          ');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should accept prompt at exactly 10 characters', () => {
    const result = validatePrompt('1234567890');
    expect(result.isValid).toBe(true);
  });

  it('should accept prompt at exactly 1000 characters', () => {
    const result = validatePrompt('a'.repeat(1000));
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// previewPrompt Tests
// =============================================================================

describe('previewPrompt', () => {
  it('should return all prompt components', () => {
    const preview = previewPrompt({
      season: 'summer',
      activityTypes: ['hiking'],
      stylePreferences: {
        template: 'cinematic',
        timeOfDay: 'golden_hour',
        atmosphere: 'peaceful and serene',
      },
    });

    expect(preview.base).toBe('Professional outdoor photography');
    expect(preview.landscape).toContain('mountain trail');
    expect(preview.seasonal).toContain('lush greenery');
    expect(preview.style).toContain('cinematic');
    expect(preview.lighting).toContain('golden hour');
    expect(preview.atmosphere).toBe('peaceful and serene');
    expect(preview.quality).toContain('high resolution');
    expect(preview.fullPrompt.length).toBeGreaterThan(0);
  });

  it('should handle minimal parameters', () => {
    const preview = previewPrompt({});

    expect(preview.base).toBeDefined();
    expect(preview.landscape).toBeDefined();
    expect(preview.fullPrompt).toBeDefined();
  });

  it('should use default values for missing preferences', () => {
    const preview = previewPrompt({
      activityTypes: ['camping'],
    });

    expect(preview.style).toBe('natural composition');
    expect(preview.lighting).toBe('natural lighting');
  });
});
