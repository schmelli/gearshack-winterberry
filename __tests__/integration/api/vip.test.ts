/**
 * VIP API Routes Integration Tests
 *
 * Feature: 052-vip-loadouts (Unified Schema)
 *
 * Tests:
 * - POST /api/vip/copy-loadout - Copy VIP loadout to user's account
 *
 * Coverage:
 * - Request validation (Zod schema)
 * - Authentication checks
 * - VIP loadout retrieval
 * - Intelligent item matching
 * - Wishlist creation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as copyVipLoadout } from '@/app/api/vip/copy-loadout/route';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  limit: vi.fn(() => mockSupabaseClient),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock VIP service
vi.mock('@/lib/vip/vip-service', () => ({
  copyVipLoadout: vi.fn(),
}));

// Import the mocked function
import { copyVipLoadout as mockCopyVipLoadout } from '@/lib/vip/vip-service';

// =============================================================================
// Test Data
// =============================================================================

const _mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockVipLoadoutId = '550e8400-e29b-41d4-a716-446655440000';

const mockCopyResult = {
  loadoutId: 'new-loadout-123',
  loadoutName: "Andrew Skurka's PCT Setup - Copy",
  itemsAdded: 15,
  wishlistItemsCreated: 10,
};

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/vip/copy-loadout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/vip/copy-loadout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject missing vipLoadoutId', async () => {
      const request = createRequest({});
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // Zod error message for missing required field
      expect(data.error).toMatch(/required|expected string/i);
    });

    it('should reject invalid UUID format', async () => {
      const request = createRequest({ vipLoadoutId: 'not-a-uuid' });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid UUID');
    });

    it('should reject non-string vipLoadoutId', async () => {
      const request = createRequest({ vipLoadoutId: 12345 });
      const response = await copyVipLoadout(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe('Successful Copy', () => {
    it('should copy VIP loadout and return result', async () => {
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockResolvedValue(mockCopyResult);

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.loadoutId).toBe(mockCopyResult.loadoutId);
      expect(data.loadoutName).toBe(mockCopyResult.loadoutName);
      expect(data.itemsAdded).toBe(mockCopyResult.itemsAdded);
      expect(data.wishlistItemsCreated).toBe(mockCopyResult.wishlistItemsCreated);
    });

    it('should call copyVipLoadout service with correct ID', async () => {
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockResolvedValue(mockCopyResult);

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      await copyVipLoadout(request);

      expect(mockCopyVipLoadout).toHaveBeenCalledWith(mockVipLoadoutId);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { VipAuthenticationError } = await import('@/lib/vip/errors');
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new VipAuthenticationError('Authentication required')
      );

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent VIP loadout', async () => {
      const { VipNotFoundError } = await import('@/lib/vip/errors');
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new VipNotFoundError('VIP loadout not found')
      );

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('VIP loadout not found');
    });

    it('should return 404 for non-VIP loadout', async () => {
      const { VipInvalidLoadoutError } = await import('@/lib/vip/errors');
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new VipInvalidLoadoutError('Not a VIP loadout')
      );

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not a VIP loadout');
    });

    it('should return 500 for unexpected errors', async () => {
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty loadout (zero items)', async () => {
      const emptyResult = {
        ...mockCopyResult,
        itemsAdded: 0,
        wishlistItemsCreated: 0,
      };
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockResolvedValue(emptyResult);

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.itemsAdded).toBe(0);
      expect(data.wishlistItemsCreated).toBe(0);
    });

    it('should handle all items already owned (no wishlist items)', async () => {
      const allOwnedResult = {
        ...mockCopyResult,
        wishlistItemsCreated: 0,
      };
      (mockCopyVipLoadout as ReturnType<typeof vi.fn>).mockResolvedValue(allOwnedResult);

      const request = createRequest({ vipLoadoutId: mockVipLoadoutId });
      const response = await copyVipLoadout(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wishlistItemsCreated).toBe(0);
    });
  });
});
