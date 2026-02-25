/**
 * Avatar Utility Tests
 *
 * Tests for avatar display functions including fallback chain logic,
 * initials generation, and source detection.
 */

import { describe, it, expect } from 'vitest';
import {
  getDisplayAvatarUrl,
  getUserInitials,
  getAvatarSource,
} from '@/lib/utils/avatar';

// =============================================================================
// Test Constants
// =============================================================================

const CUSTOM_AVATAR_URL = 'https://res.cloudinary.com/test/avatars/user123.jpg';
const PROVIDER_AVATAR_URL = 'https://lh3.googleusercontent.com/a/user123';

// =============================================================================
// Tests
// =============================================================================

describe('Avatar Utilities', () => {
  // ===========================================================================
  // getDisplayAvatarUrl Tests
  // ===========================================================================

  describe('getDisplayAvatarUrl', () => {
    describe('Custom Avatar Priority', () => {
      it('should return custom avatar when both custom and provider exist', () => {
        const result = getDisplayAvatarUrl(CUSTOM_AVATAR_URL, PROVIDER_AVATAR_URL);
        expect(result).toBe(CUSTOM_AVATAR_URL);
      });

      it('should return custom avatar when only custom exists', () => {
        const result = getDisplayAvatarUrl(CUSTOM_AVATAR_URL, null);
        expect(result).toBe(CUSTOM_AVATAR_URL);
      });

      it('should return custom avatar when provider is undefined', () => {
        const result = getDisplayAvatarUrl(CUSTOM_AVATAR_URL, undefined);
        expect(result).toBe(CUSTOM_AVATAR_URL);
      });
    });

    describe('Provider Avatar Fallback', () => {
      it('should return provider avatar when custom is null', () => {
        const result = getDisplayAvatarUrl(null, PROVIDER_AVATAR_URL);
        expect(result).toBe(PROVIDER_AVATAR_URL);
      });

      it('should return provider avatar when custom is undefined', () => {
        const result = getDisplayAvatarUrl(undefined, PROVIDER_AVATAR_URL);
        expect(result).toBe(PROVIDER_AVATAR_URL);
      });

      it('should return provider avatar when custom is empty string', () => {
        const result = getDisplayAvatarUrl('', PROVIDER_AVATAR_URL);
        expect(result).toBe(PROVIDER_AVATAR_URL);
      });

      it('should return provider avatar when custom is whitespace only', () => {
        const result = getDisplayAvatarUrl('   ', PROVIDER_AVATAR_URL);
        expect(result).toBe(PROVIDER_AVATAR_URL);
      });
    });

    describe('No Avatar Available', () => {
      it('should return null when both are null', () => {
        const result = getDisplayAvatarUrl(null, null);
        expect(result).toBeNull();
      });

      it('should return null when both are undefined', () => {
        const result = getDisplayAvatarUrl(undefined, undefined);
        expect(result).toBeNull();
      });

      it('should return null when both are empty strings', () => {
        const result = getDisplayAvatarUrl('', '');
        expect(result).toBeNull();
      });

      it('should return null when both are whitespace', () => {
        const result = getDisplayAvatarUrl('   ', '   ');
        expect(result).toBeNull();
      });

      it('should return null when custom is null and provider is empty', () => {
        const result = getDisplayAvatarUrl(null, '');
        expect(result).toBeNull();
      });
    });
  });

  // ===========================================================================
  // getUserInitials Tests
  // ===========================================================================

  describe('getUserInitials', () => {
    describe('Two Word Names', () => {
      it('should return first and last initials for two word name', () => {
        const result = getUserInitials('John Doe');
        expect(result).toBe('JD');
      });

      it('should handle lowercase names', () => {
        const result = getUserInitials('john doe');
        expect(result).toBe('JD');
      });

      it('should handle mixed case names', () => {
        const result = getUserInitials('jOhN dOe');
        expect(result).toBe('JD');
      });

      it('should handle realistic outdoor names', () => {
        expect(getUserInitials('Trail Runner')).toBe('TR');
        expect(getUserInitials('Mountain Climber')).toBe('MC');
        expect(getUserInitials('Pack Rat')).toBe('PR');
      });
    });

    describe('Multiple Word Names', () => {
      it('should use first and last word for three word names', () => {
        const result = getUserInitials('John Michael Doe');
        expect(result).toBe('JD');
      });

      it('should use first and last word for four word names', () => {
        const result = getUserInitials('John Michael Smith Doe');
        expect(result).toBe('JD');
      });
    });

    describe('Single Word Names', () => {
      it('should return first two characters for single word name', () => {
        const result = getUserInitials('Alice');
        expect(result).toBe('AL');
      });

      it('should handle short single word names', () => {
        expect(getUserInitials('Al')).toBe('AL');
        expect(getUserInitials('Jo')).toBe('JO');
      });

      it('should handle single character names', () => {
        const result = getUserInitials('A');
        expect(result).toBe('A');
      });

      it('should handle trail names', () => {
        expect(getUserInitials('Trailblazer')).toBe('TR');
        expect(getUserInitials('Hiker')).toBe('HI');
      });
    });

    describe('Empty or Invalid Input', () => {
      it('should return ? for null', () => {
        const result = getUserInitials(null);
        expect(result).toBe('?');
      });

      it('should return ? for undefined', () => {
        const result = getUserInitials(undefined);
        expect(result).toBe('?');
      });

      it('should return ? for empty string', () => {
        const result = getUserInitials('');
        expect(result).toBe('?');
      });

      it('should return ? for whitespace only', () => {
        const result = getUserInitials('   ');
        expect(result).toBe('?');
      });
    });

    describe('Whitespace Handling', () => {
      it('should trim leading whitespace', () => {
        const result = getUserInitials('  John Doe');
        expect(result).toBe('JD');
      });

      it('should trim trailing whitespace', () => {
        const result = getUserInitials('John Doe  ');
        expect(result).toBe('JD');
      });

      it('should handle multiple spaces between words', () => {
        const result = getUserInitials('John    Doe');
        expect(result).toBe('JD');
      });

      it('should handle tabs and newlines', () => {
        const result = getUserInitials('John\tDoe');
        expect(result).toBe('JD');
      });
    });

    describe('Special Characters', () => {
      it('should handle names with hyphens', () => {
        const result = getUserInitials('Mary-Jane Watson');
        expect(result).toBe('MW');
      });

      it('should handle names with apostrophes', () => {
        const result = getUserInitials("O'Brien Smith");
        expect(result).toBe('OS');
      });

      it('should handle names with accented characters', () => {
        const result = getUserInitials('José García');
        expect(result).toBe('JG');
      });
    });
  });

  // ===========================================================================
  // getAvatarSource Tests
  // ===========================================================================

  describe('getAvatarSource', () => {
    describe('Custom Avatar Source', () => {
      it('should return custom when custom avatar exists', () => {
        const result = getAvatarSource(CUSTOM_AVATAR_URL, PROVIDER_AVATAR_URL);
        expect(result).toBe('custom');
      });

      it('should return custom when only custom exists', () => {
        const result = getAvatarSource(CUSTOM_AVATAR_URL, null);
        expect(result).toBe('custom');
      });

      it('should return custom even with undefined provider', () => {
        const result = getAvatarSource(CUSTOM_AVATAR_URL, undefined);
        expect(result).toBe('custom');
      });
    });

    describe('Provider Avatar Source', () => {
      it('should return provider when custom is null', () => {
        const result = getAvatarSource(null, PROVIDER_AVATAR_URL);
        expect(result).toBe('provider');
      });

      it('should return provider when custom is empty', () => {
        const result = getAvatarSource('', PROVIDER_AVATAR_URL);
        expect(result).toBe('provider');
      });

      it('should return provider when custom is whitespace', () => {
        const result = getAvatarSource('   ', PROVIDER_AVATAR_URL);
        expect(result).toBe('provider');
      });
    });

    describe('Initials Fallback', () => {
      it('should return initials when both are null', () => {
        const result = getAvatarSource(null, null);
        expect(result).toBe('initials');
      });

      it('should return initials when both are undefined', () => {
        const result = getAvatarSource(undefined, undefined);
        expect(result).toBe('initials');
      });

      it('should return initials when both are empty', () => {
        const result = getAvatarSource('', '');
        expect(result).toBe('initials');
      });

      it('should return initials when both are whitespace', () => {
        const result = getAvatarSource('   ', '   ');
        expect(result).toBe('initials');
      });
    });

    describe('Source Consistency', () => {
      it('should be consistent with getDisplayAvatarUrl for custom', () => {
        const source = getAvatarSource(CUSTOM_AVATAR_URL, PROVIDER_AVATAR_URL);
        const url = getDisplayAvatarUrl(CUSTOM_AVATAR_URL, PROVIDER_AVATAR_URL);
        expect(source).toBe('custom');
        expect(url).toBe(CUSTOM_AVATAR_URL);
      });

      it('should be consistent with getDisplayAvatarUrl for provider', () => {
        const source = getAvatarSource(null, PROVIDER_AVATAR_URL);
        const url = getDisplayAvatarUrl(null, PROVIDER_AVATAR_URL);
        expect(source).toBe('provider');
        expect(url).toBe(PROVIDER_AVATAR_URL);
      });

      it('should be consistent with getDisplayAvatarUrl for initials', () => {
        const source = getAvatarSource(null, null);
        const url = getDisplayAvatarUrl(null, null);
        expect(source).toBe('initials');
        expect(url).toBeNull();
      });
    });
  });
});
