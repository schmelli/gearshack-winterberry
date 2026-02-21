/**
 * Unit Tests for updateWorkingMemoryTool (id: persistUserProfile)
 * Feature: 002-mastra-memory-system
 *
 * Tests cover:
 * - Tool ID is `persistUserProfile`
 * - set_identity operation
 * - set_preference operation
 * - add_brand_favorite operation (adds to favorites, removes from avoid)
 * - add_brand_avoid operation (adds to avoid, removes from favorites)
 * - add_fact operation
 * - add_trip operation
 * - Error: no userId in requestContext
 * - Error: DB save failure
 * - Error: DB exception thrown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateWorkingMemoryTool } from '@/lib/mastra/tools/update-working-memory';
import { DEFAULT_USER_PROFILE } from '@/lib/mastra/schemas/working-memory';
import type { GearshackUserProfile } from '@/lib/mastra/schemas/working-memory';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/mastra/memory/working-memory-adapter', () => ({
  getWorkingMemory: vi.fn(),
  saveWorkingMemoryDirect: vi.fn(),
}));

import { getWorkingMemory, saveWorkingMemoryDirect } from '@/lib/mastra/memory/working-memory-adapter';

const mockGetWorkingMemory = vi.mocked(getWorkingMemory);
const mockSaveWorkingMemoryDirect = vi.mocked(saveWorkingMemoryDirect);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a minimal ExecutionContext mock.
 * When userId is provided it is placed in requestContext.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeContext = (userId?: string): any => ({
  requestContext: userId ? new Map([['userId', userId]]) : new Map(),
});

/** Return a fresh copy of the default profile so tests cannot share state. */
const freshProfile = (): GearshackUserProfile => ({
  ...DEFAULT_USER_PROFILE,
  preferences: { ...DEFAULT_USER_PROFILE.preferences },
  activities: {
    ...DEFAULT_USER_PROFILE.activities,
    primary: [...DEFAULT_USER_PROFILE.activities.primary],
  },
  brands: {
    favorites: [...DEFAULT_USER_PROFILE.brands.favorites],
    avoid: [...DEFAULT_USER_PROFILE.brands.avoid],
    curious: [...DEFAULT_USER_PROFILE.brands.curious],
  },
  goals: {
    upcomingTrips: [...DEFAULT_USER_PROFILE.goals.upcomingTrips],
    gearGoals: [...DEFAULT_USER_PROFILE.goals.gearGoals],
    wishlistPriorities: [...DEFAULT_USER_PROFILE.goals.wishlistPriorities],
  },
  facts: [...DEFAULT_USER_PROFILE.facts],
  cachedInsights: [...DEFAULT_USER_PROFILE.cachedInsights],
});

const TEST_USER_ID = 'user-abc-123';

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default: successful save
  mockGetWorkingMemory.mockResolvedValue(freshProfile());
  mockSaveWorkingMemoryDirect.mockResolvedValue(true);
});

// =============================================================================
// Tool metadata
// =============================================================================

describe('updateWorkingMemoryTool metadata', () => {
  it('should have id "persistUserProfile"', () => {
    expect(updateWorkingMemoryTool.id).toBe('persistUserProfile');
  });

  it('should have a non-empty description', () => {
    expect(typeof updateWorkingMemoryTool.description).toBe('string');
    expect(updateWorkingMemoryTool.description.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Error: no userId in requestContext
// =============================================================================

describe('Error: missing userId in requestContext', () => {
  it('should return success: false when requestContext has no userId', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice' },
      makeContext() // no userId
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('set_identity');
    expect(result.message).toContain('userId');
  });

  it('should not call getWorkingMemory when userId is missing', async () => {
    await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice' },
      makeContext()
    );

    expect(mockGetWorkingMemory).not.toHaveBeenCalled();
  });

  it('should return success: false when executionContext itself is undefined', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice' },
      undefined
    );

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Error: DB save fails (saveWorkingMemoryDirect returns false)
// =============================================================================

describe('Error: DB save failure', () => {
  it('should return success: false when saveWorkingMemoryDirect returns false', async () => {
    mockSaveWorkingMemoryDirect.mockResolvedValue(false);

    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Bob' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('set_identity');
    expect(result.message).toBeTruthy();
  });
});

// =============================================================================
// Error: DB throws an exception
// =============================================================================

describe('Error: DB exception', () => {
  it('should return success: false and include error message when getWorkingMemory throws', async () => {
    mockGetWorkingMemory.mockRejectedValue(new Error('Connection refused'));

    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Carol' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Connection refused');
  });

  it('should return success: false when saveWorkingMemoryDirect throws', async () => {
    mockSaveWorkingMemoryDirect.mockRejectedValue(new Error('Write quota exceeded'));

    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Dave' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Write quota exceeded');
  });
});

// =============================================================================
// set_identity operation
// =============================================================================

describe('set_identity operation', () => {
  it('should return success: true when name and location are provided', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice', location: 'Bavaria' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    expect(result.operation).toBe('set_identity');
  });

  it('should persist name and location in the saved profile', async () => {
    await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice', location: 'Bavaria' },
      makeContext(TEST_USER_ID)
    );

    expect(mockSaveWorkingMemoryDirect).toHaveBeenCalledOnce();
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.name).toBe('Alice');
    expect(savedProfile.location).toBe('Bavaria');
  });

  it('should not overwrite existing name when name is omitted', async () => {
    const profile = freshProfile();
    profile.name = 'Existing Name';
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', location: 'Alps' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.name).toBe('Existing Name');
    expect(savedProfile.location).toBe('Alps');
  });

  it('should set preferredLanguage when provided', async () => {
    await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', preferredLanguage: 'de' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.preferredLanguage).toBe('de');
  });

  it('should include name in the confirmation message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_identity', name: 'Alice' },
      makeContext(TEST_USER_ID)
    );

    expect(result.message).toContain('Alice');
  });
});

// =============================================================================
// set_preference operation
// =============================================================================

describe('set_preference operation', () => {
  it('should set weightPhilosophy correctly', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_preference', weightPhilosophy: 'ultralight' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.preferences.weightPhilosophy).toBe('ultralight');
  });

  it('should set budgetRange correctly', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_preference', budgetRange: 'premium' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.preferences.budgetRange).toBe('premium');
  });

  it('should set qualityVsWeight correctly', async () => {
    await updateWorkingMemoryTool.execute(
      { operation: 'set_preference', qualityVsWeight: 'weight-priority' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.preferences.qualityVsWeight).toBe('weight-priority');
  });

  it('should merge preferences without overwriting unrelated fields', async () => {
    const profile = freshProfile();
    profile.preferences.budgetRange = 'mid-range';
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'set_preference', weightPhilosophy: 'lightweight' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    // Existing budgetRange must be preserved
    expect(savedProfile.preferences.budgetRange).toBe('mid-range');
    expect(savedProfile.preferences.weightPhilosophy).toBe('lightweight');
  });

  it('should include weightPhilosophy in confirmation message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'set_preference', weightPhilosophy: 'comfort' },
      makeContext(TEST_USER_ID)
    );

    expect(result.message).toContain('comfort');
  });
});

// =============================================================================
// add_brand_favorite operation
// =============================================================================

describe('add_brand_favorite operation', () => {
  it('should add brand to favorites', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_favorite', brand: 'Patagonia' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.brands.favorites).toContain('Patagonia');
  });

  it('should remove brand from avoid list when added to favorites', async () => {
    const profile = freshProfile();
    profile.brands.avoid = ['Osprey', 'Salomon'];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_favorite', brand: 'Osprey' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.brands.favorites).toContain('Osprey');
    expect(savedProfile.brands.avoid).not.toContain('Osprey');
    // Other avoid brands must remain
    expect(savedProfile.brands.avoid).toContain('Salomon');
  });

  it('should not add duplicate brand to favorites', async () => {
    const profile = freshProfile();
    profile.brands.favorites = ['Patagonia'];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_favorite', brand: 'Patagonia' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    const patagoniaCount = savedProfile.brands.favorites.filter(
      (b: string) => b === 'Patagonia'
    ).length;
    expect(patagoniaCount).toBe(1);
  });

  it('should return success: true and include brand name in message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_favorite', brand: 'Arc\'teryx' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Arc\'teryx');
  });

  it('should return the profile unchanged when brand is not provided', async () => {
    // brand is optional – the tool should short-circuit and return profile unchanged
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_favorite' },
      makeContext(TEST_USER_ID)
    );

    // The save is still called (applyUpdate returns unchanged profile)
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// add_brand_avoid operation
// =============================================================================

describe('add_brand_avoid operation', () => {
  it('should add brand to avoid list', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_avoid', brand: 'Osprey' },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.brands.avoid).toContain('Osprey');
  });

  it('should remove brand from favorites when added to avoid', async () => {
    const profile = freshProfile();
    profile.brands.favorites = ['Osprey', 'Patagonia'];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_avoid', brand: 'Osprey' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.brands.avoid).toContain('Osprey');
    expect(savedProfile.brands.favorites).not.toContain('Osprey');
    // Other favorites must remain
    expect(savedProfile.brands.favorites).toContain('Patagonia');
  });

  it('should not add duplicate brand to avoid list', async () => {
    const profile = freshProfile();
    profile.brands.avoid = ['Osprey'];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_avoid', brand: 'Osprey' },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    const count = savedProfile.brands.avoid.filter((b: string) => b === 'Osprey').length;
    expect(count).toBe(1);
  });

  it('should include brand name in confirmation message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      { operation: 'add_brand_avoid', brand: 'Osprey' },
      makeContext(TEST_USER_ID)
    );

    expect(result.message).toContain('Osprey');
  });
});

// =============================================================================
// add_fact operation
// =============================================================================

describe('add_fact operation', () => {
  it('should add a fact to the facts array', async () => {
    const result = await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Has a bad knee and avoids heavy packs',
        factCategory: 'constraint',
        confidence: 'high',
      },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.facts).toHaveLength(1);
    expect(savedProfile.facts[0].fact).toBe('Has a bad knee and avoids heavy packs');
    expect(savedProfile.facts[0].category).toBe('constraint');
    expect(savedProfile.facts[0].confidence).toBe('high');
  });

  it('should append to existing facts without overwriting them', async () => {
    const profile = freshProfile();
    profile.facts = [
      {
        fact: 'Prefers solo trips',
        category: 'preference',
        confidence: 'high',
        learnedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Allergic to wool',
        factCategory: 'constraint',
        confidence: 'high',
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.facts).toHaveLength(2);
    expect(savedProfile.facts[0].fact).toBe('Prefers solo trips');
    expect(savedProfile.facts[1].fact).toBe('Allergic to wool');
  });

  it('should store a learnedAt ISO timestamp', async () => {
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Uses trekking poles',
        factCategory: 'history',
        confidence: 'medium',
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    const stored = savedProfile.facts[0];
    expect(stored.learnedAt).toBeTruthy();
    // Should be a valid ISO string
    expect(new Date(stored.learnedAt).toISOString()).toBe(stored.learnedAt);
  });

  it('should default confidence to "high" when not provided', async () => {
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Hikes mostly in summer',
        factCategory: 'history',
        // confidence intentionally omitted
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.facts[0].confidence).toBe('high');
  });

  it('should default factCategory to "other" when not provided', async () => {
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Hikes mostly in summer',
        // factCategory intentionally omitted
        confidence: 'low',
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.facts[0].category).toBe('other');
  });

  it('should include the fact text in the confirmation message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      {
        operation: 'add_fact',
        fact: 'Owns a UL shelter already',
        factCategory: 'history',
        confidence: 'high',
      },
      makeContext(TEST_USER_ID)
    );

    expect(result.message).toContain('Owns a UL shelter already');
  });
});

// =============================================================================
// add_trip operation
// =============================================================================

describe('add_trip operation', () => {
  it('should add a trip to goals.upcomingTrips', async () => {
    const result = await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'PCT Section J',
        activity: 'thru-hiking',
        tripDate: 'June 2025',
      },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.goals.upcomingTrips).toHaveLength(1);
    const trip = savedProfile.goals.upcomingTrips[0];
    expect(trip.destination).toBe('PCT Section J');
    expect(trip.activity).toBe('thru-hiking');
    expect(trip.date).toBe('June 2025');
  });

  it('should append trip without overwriting existing trips', async () => {
    const profile = freshProfile();
    profile.goals.upcomingTrips = [
      {
        destination: 'Dolomites',
        activity: 'hiking',
        addedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    mockGetWorkingMemory.mockResolvedValue(profile);

    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'Zugspitze',
        activity: 'mountaineering',
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.goals.upcomingTrips).toHaveLength(2);
    expect(savedProfile.goals.upcomingTrips[0].destination).toBe('Dolomites');
    expect(savedProfile.goals.upcomingTrips[1].destination).toBe('Zugspitze');
  });

  it('should store addedAt as an ISO timestamp', async () => {
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'Appalachian Trail',
        activity: 'backpacking',
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    const { addedAt } = savedProfile.goals.upcomingTrips[0];
    expect(addedAt).toBeTruthy();
    expect(new Date(addedAt).toISOString()).toBe(addedAt);
  });

  it('should not add trip when tripDestination is missing', async () => {
    // activity is present but tripDestination is not – applyUpdate short-circuits
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        activity: 'backpacking',
        // tripDestination intentionally omitted
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.goals.upcomingTrips).toHaveLength(0);
  });

  it('should not add trip when activity is missing', async () => {
    await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'Yosemite',
        // activity intentionally omitted
      },
      makeContext(TEST_USER_ID)
    );

    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.goals.upcomingTrips).toHaveLength(0);
  });

  it('should include destination in confirmation message', async () => {
    const result = await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'Grand Canyon',
        activity: 'trekking',
      },
      makeContext(TEST_USER_ID)
    );

    expect(result.message).toContain('Grand Canyon');
  });

  it('should work without optional tripDate', async () => {
    const result = await updateWorkingMemoryTool.execute(
      {
        operation: 'add_trip',
        tripDestination: 'Mont Blanc',
        activity: 'alpine-hiking',
        // tripDate intentionally omitted
      },
      makeContext(TEST_USER_ID)
    );

    expect(result.success).toBe(true);
    const [, , savedProfile] = mockSaveWorkingMemoryDirect.mock.calls[0];
    expect(savedProfile.goals.upcomingTrips[0].date).toBeUndefined();
  });
});
