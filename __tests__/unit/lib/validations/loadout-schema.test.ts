/**
 * Loadout Schema Validation Tests
 *
 * Tests for loadout form validation including legacy and creation forms.
 */

import { describe, it, expect } from 'vitest';
import {
  loadoutFormSchema,
  loadoutCreationFormSchema,
  type LoadoutFormInput,
  type LoadoutCreationFormInput,
} from '@/lib/validations/loadout-schema';

// =============================================================================
// Test Data
// =============================================================================

const validLoadoutForm: LoadoutFormInput = {
  name: 'PCT Thru-Hike 2024',
  tripDate: '2024-04-15',
};

const validCreationForm: LoadoutCreationFormInput = {
  name: 'Weekend Backpacking Trip',
  tripDate: '2024-07-20',
  description: 'Quick overnight in the Sierras',
  seasons: ['summer'],
  activityTypes: ['hiking', 'backpacking'],
};

// =============================================================================
// Legacy Form Schema Tests
// =============================================================================

describe('Loadout Form Schema (Legacy)', () => {
  describe('Name Validation', () => {
    it('should accept valid name', () => {
      const result = loadoutFormSchema.safeParse(validLoadoutForm);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalid = { ...validLoadoutForm, name: '' };
      const result = loadoutFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('should reject name over 100 characters', () => {
      const invalid = { ...validLoadoutForm, name: 'a'.repeat(101) };
      const result = loadoutFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept name at exactly 100 characters', () => {
      const valid = { ...validLoadoutForm, name: 'a'.repeat(100) };
      const result = loadoutFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name', () => {
      const input = { ...validLoadoutForm, name: '  Trimmed Name  ' };
      const result = loadoutFormSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Trimmed Name');
      }
    });
  });

  describe('Trip Date Validation', () => {
    it('should accept valid date string', () => {
      const result = loadoutFormSchema.safeParse(validLoadoutForm);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripDate).toBeInstanceOf(Date);
      }
    });

    it('should accept optional empty date', () => {
      const input = { name: 'Test', tripDate: '' };
      const result = loadoutFormSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripDate).toBeNull();
      }
    });

    it('should accept missing date', () => {
      const input = { name: 'Test' };
      const result = loadoutFormSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripDate).toBeNull();
      }
    });

    it('should reject invalid date format', () => {
      const invalid = { ...validLoadoutForm, tripDate: 'not-a-date' };
      const result = loadoutFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept ISO date format', () => {
      const input = { ...validLoadoutForm, tripDate: '2024-07-15T12:00:00Z' };
      const result = loadoutFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Creation Form Schema Tests
// =============================================================================

describe('Loadout Creation Form Schema', () => {
  describe('Valid Data', () => {
    it('should validate complete form', () => {
      const result = loadoutCreationFormSchema.safeParse(validCreationForm);
      expect(result.success).toBe(true);
    });

    it('should validate minimal form (name only)', () => {
      const minimal = { name: 'Simple Loadout' };
      const result = loadoutCreationFormSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        // Check defaults are applied
        expect(result.data.description).toBe('');
        expect(result.data.seasons).toEqual([]);
        expect(result.data.activityTypes).toEqual([]);
      }
    });
  });

  describe('Name Validation', () => {
    it('should require name', () => {
      const invalid = { ...validCreationForm, name: '' };
      const result = loadoutCreationFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const invalid = { ...validCreationForm, name: 'x'.repeat(101) };
      const result = loadoutCreationFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Description Validation', () => {
    it('should accept valid description', () => {
      const result = loadoutCreationFormSchema.safeParse(validCreationForm);
      expect(result.success).toBe(true);
    });

    it('should accept empty description', () => {
      const valid = { ...validCreationForm, description: '' };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject description over 500 characters', () => {
      const invalid = { ...validCreationForm, description: 'd'.repeat(501) };
      const result = loadoutCreationFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept description at exactly 500 characters', () => {
      const valid = { ...validCreationForm, description: 'd'.repeat(500) };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Seasons Validation', () => {
    it('should accept valid seasons', () => {
      const valid = { ...validCreationForm, seasons: ['spring', 'summer', 'fall', 'winter'] };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty seasons array', () => {
      const valid = { ...validCreationForm, seasons: [] };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept single season', () => {
      const valid = { ...validCreationForm, seasons: ['winter'] };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid season values', () => {
      const invalid = { ...validCreationForm, seasons: ['autumn'] as unknown as string[] };
      const result = loadoutCreationFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should default to empty array when not provided', () => {
      const minimal = { name: 'Test' };
      const result = loadoutCreationFormSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seasons).toEqual([]);
      }
    });
  });

  describe('Activity Types Validation', () => {
    it('should accept valid activity types', () => {
      const valid = { ...validCreationForm, activityTypes: ['hiking', 'camping', 'climbing'] };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept all valid activity types', () => {
      const valid = {
        ...validCreationForm,
        activityTypes: ['hiking', 'camping', 'climbing', 'skiing', 'backpacking'],
      };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty activity types array', () => {
      const valid = { ...validCreationForm, activityTypes: [] };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid activity types', () => {
      const invalid = { ...validCreationForm, activityTypes: ['swimming'] as unknown as string[] };
      const result = loadoutCreationFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should default to empty array when not provided', () => {
      const minimal = { name: 'Test' };
      const result = loadoutCreationFormSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.activityTypes).toEqual([]);
      }
    });
  });

  describe('Trip Date Validation', () => {
    it('should accept valid date string', () => {
      const result = loadoutCreationFormSchema.safeParse(validCreationForm);
      expect(result.success).toBe(true);
    });

    it('should accept missing trip date', () => {
      const valid = { name: 'Test' };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty trip date', () => {
      const valid = { ...validCreationForm, tripDate: '' };
      const result = loadoutCreationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle special characters in loadout name', () => {
    const valid = {
      name: 'John\'s "Ultimate" Trip – Summer 2024™',
      seasons: ['summer'],
      activityTypes: ['backpacking'],
    };
    const result = loadoutCreationFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should handle emojis in description', () => {
    const valid = {
      name: 'Fun Trip',
      description: 'Ready to hit the trails! 🏕️⛰️🥾',
    };
    const result = loadoutCreationFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should handle duplicate seasons in array', () => {
    // Zod doesn't prevent duplicates by default
    const valid = {
      name: 'Test',
      seasons: ['summer', 'summer'],
    };
    const result = loadoutCreationFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should handle duplicate activity types in array', () => {
    const valid = {
      name: 'Test',
      activityTypes: ['hiking', 'hiking'],
    };
    const result = loadoutCreationFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should preserve order of seasons', () => {
    const input = {
      name: 'Test',
      seasons: ['winter', 'summer', 'spring', 'fall'],
    };
    const result = loadoutCreationFormSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seasons).toEqual(['winter', 'summer', 'spring', 'fall']);
    }
  });

  it('should preserve order of activity types', () => {
    const input = {
      name: 'Test',
      activityTypes: ['skiing', 'hiking', 'camping'],
    };
    const result = loadoutCreationFormSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activityTypes).toEqual(['skiing', 'hiking', 'camping']);
    }
  });
});
