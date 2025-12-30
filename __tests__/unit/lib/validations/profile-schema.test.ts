/**
 * Profile Schema Validation Tests
 *
 * Tests for profile, login, registration, and password reset form validation.
 */

import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  loginSchema,
  registrationSchema,
  passwordResetSchema,
} from '@/lib/validations/profile-schema';

// =============================================================================
// Test Data
// =============================================================================

const validProfile = {
  displayName: 'Trail Runner',
  trailName: 'Ultralight',
  bio: 'PCT thru-hiker 2023. Ultralight enthusiast.',
  location: 'Denver, CO',
  avatarUrl: 'https://example.com/avatar.jpg',
  locationName: 'Rocky Mountains',
  latitude: 39.7392,
  longitude: -104.9903,
  instagram: '@trailrunner',
  facebook: 'trailrunner',
  youtube: 'TrailRunnerChannel',
  website: 'trailrunner.com',
};

const validLogin = {
  email: 'hiker@example.com',
  password: 'password123',
};

const validRegistration = {
  email: 'newhiker@example.com',
  password: 'securePassword123',
  confirmPassword: 'securePassword123',
};

// =============================================================================
// Profile Schema Tests
// =============================================================================

describe('Profile Schema', () => {
  describe('Display Name Validation', () => {
    it('should accept valid display name', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should require display name', () => {
      const invalid = { ...validProfile, displayName: '' };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject display name under 2 characters', () => {
      const invalid = { ...validProfile, displayName: 'A' };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('should accept display name at exactly 2 characters', () => {
      const valid = { ...validProfile, displayName: 'AB' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject display name over 50 characters', () => {
      const invalid = { ...validProfile, displayName: 'A'.repeat(51) };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at most 50 characters');
      }
    });

    it('should accept display name at exactly 50 characters', () => {
      const valid = { ...validProfile, displayName: 'A'.repeat(50) };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Trail Name Validation', () => {
    it('should accept valid trail name', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trailName).toBe('Ultralight');
      }
    });

    it('should allow empty trail name', () => {
      const valid = { ...validProfile, trailName: '' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should allow missing trail name', () => {
      const { trailName, ...withoutTrailName } = validProfile;
      const result = profileSchema.safeParse(withoutTrailName);
      expect(result.success).toBe(true);
    });

    it('should reject trail name under 2 characters when provided', () => {
      const invalid = { ...validProfile, trailName: 'A' };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept trail name at exactly 2 characters', () => {
      const valid = { ...validProfile, trailName: 'AB' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject trail name over 30 characters', () => {
      const invalid = { ...validProfile, trailName: 'A'.repeat(31) };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Bio Validation', () => {
    it('should accept valid bio', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow empty bio', () => {
      const valid = { ...validProfile, bio: '' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject bio over 500 characters', () => {
      const invalid = { ...validProfile, bio: 'B'.repeat(501) };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept bio at exactly 500 characters', () => {
      const valid = { ...validProfile, bio: 'B'.repeat(500) };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Location Validation', () => {
    it('should accept valid location', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow empty location', () => {
      const valid = { ...validProfile, location: '' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject location over 100 characters', () => {
      const invalid = { ...validProfile, location: 'L'.repeat(101) };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Avatar URL Validation', () => {
    it('should accept valid URL', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow empty avatar URL', () => {
      const valid = { ...validProfile, avatarUrl: '' };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should allow null avatar URL', () => {
      const valid = { ...validProfile, avatarUrl: null };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const invalid = { ...validProfile, avatarUrl: 'not-a-url' };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Coordinate Validation', () => {
    it('should accept valid coordinates', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(39.7392);
        expect(result.data.longitude).toBe(-104.9903);
      }
    });

    it('should allow null coordinates', () => {
      const valid = { ...validProfile, latitude: null, longitude: null };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject latitude below -90', () => {
      const invalid = { ...validProfile, latitude: -91 };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject latitude above 90', () => {
      const invalid = { ...validProfile, latitude: 91 };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept latitude at bounds', () => {
      const validMin = { ...validProfile, latitude: -90 };
      const validMax = { ...validProfile, latitude: 90 };
      expect(profileSchema.safeParse(validMin).success).toBe(true);
      expect(profileSchema.safeParse(validMax).success).toBe(true);
    });

    it('should reject longitude below -180', () => {
      const invalid = { ...validProfile, longitude: -181 };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject longitude above 180', () => {
      const invalid = { ...validProfile, longitude: 181 };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept longitude at bounds', () => {
      const validMin = { ...validProfile, longitude: -180 };
      const validMax = { ...validProfile, longitude: 180 };
      expect(profileSchema.safeParse(validMin).success).toBe(true);
      expect(profileSchema.safeParse(validMax).success).toBe(true);
    });
  });

  describe('Social Links Validation', () => {
    it('should accept valid social links', () => {
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow empty social links', () => {
      const valid = {
        ...validProfile,
        instagram: '',
        facebook: '',
        youtube: '',
        website: '',
      };
      const result = profileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject social links over 200 characters', () => {
      const invalid = { ...validProfile, instagram: 'I'.repeat(201) };
      const result = profileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Minimal Profile', () => {
    it('should accept profile with only required fields', () => {
      const minimal = { displayName: 'Hiker' };
      const result = profileSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Login Schema Tests
// =============================================================================

describe('Login Schema', () => {
  it('should accept valid login credentials', () => {
    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it('should reject missing email', () => {
    const invalid = { password: 'password123' };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const invalid = { email: 'not-an-email', password: 'password123' };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('valid email');
    }
  });

  it('should reject missing password', () => {
    const invalid = { email: 'test@example.com' };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const invalid = { email: 'test@example.com', password: '' };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('required');
    }
  });

  it('should accept any length password (just checks not empty)', () => {
    const valid = { email: 'test@example.com', password: 'a' };
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Registration Schema Tests
// =============================================================================

describe('Registration Schema', () => {
  it('should accept valid registration', () => {
    const result = registrationSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalid = { ...validRegistration, email: 'not-an-email' };
    const result = registrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject password under 8 characters', () => {
    const invalid = {
      email: 'test@example.com',
      password: '1234567',
      confirmPassword: '1234567',
    };
    const result = registrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8 characters');
    }
  });

  it('should accept password at exactly 8 characters', () => {
    const valid = {
      email: 'test@example.com',
      password: '12345678',
      confirmPassword: '12345678',
    };
    const result = registrationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject mismatched passwords', () => {
    const invalid = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456',
    };
    const result = registrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('do not match');
    }
  });

  it('should accept matching passwords', () => {
    const result = registrationSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('should validate confirmPassword path for mismatch error', () => {
    const invalid = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different',
    };
    const result = registrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword');
    }
  });
});

// =============================================================================
// Password Reset Schema Tests
// =============================================================================

describe('Password Reset Schema', () => {
  it('should accept valid email', () => {
    const result = passwordResetSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = passwordResetSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('valid email');
    }
  });

  it('should reject missing email', () => {
    const result = passwordResetSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const result = passwordResetSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });
});
