/**
 * Integration Tests: Share Password Verification API
 * Route: POST/GET /api/shares/[token]/verify-password
 * Feature: Share Management
 *
 * Tests password verification for protected loadout shares including
 * authentication, expiration handling, and session cookie management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

// =============================================================================
// Mock Dependencies
// =============================================================================

const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockSupabaseFrom,
    })
  ),
}));

// Mock cookies
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookieGet,
      set: mockCookieSet,
    })
  ),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const validPassword = 'securePassword123';
const hashedPassword = bcrypt.hashSync(validPassword, 10);

const protectedShare = {
  password_hash: hashedPassword,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

const expiredShare = {
  password_hash: hashedPassword,
  expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
};

const publicShare = {
  password_hash: null,
  expires_at: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function createPostRequest(token: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/shares/${token}/verify-password`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createGetRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/shares/${token}/verify-password`, {
    method: 'GET',
  });
}

function setupShareQuery(share: { password_hash: string | null; expires_at: string | null } | null, error: unknown = null) {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: share, error }),
  };
  mockSupabaseFrom.mockReturnValue(queryBuilder);
  return queryBuilder;
}

// =============================================================================
// POST Tests
// =============================================================================

describe('POST /api/shares/[token]/verify-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Validation Tests
  // -------------------------------------------------------------------------

  it('should return 400 when password is not provided', async () => {
    // Arrange
    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('test-token', {});
    const params = Promise.resolve({ token: 'test-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Password required');
  });

  // -------------------------------------------------------------------------
  // Share Lookup Tests
  // -------------------------------------------------------------------------

  it('should return 404 when share does not exist', async () => {
    // Arrange
    setupShareQuery(null, { code: 'PGRST116', message: 'No rows found' });

    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('nonexistent-token', { password: validPassword });
    const params = Promise.resolve({ token: 'nonexistent-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('Share not found');
  });

  // -------------------------------------------------------------------------
  // Expiration Tests
  // -------------------------------------------------------------------------

  it('should return 410 when share has expired', async () => {
    // Arrange
    setupShareQuery(expiredShare);

    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('expired-token', { password: validPassword });
    const params = Promise.resolve({ token: 'expired-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(410);
    expect(body.error).toBe('Share has expired');
  });

  // -------------------------------------------------------------------------
  // Password Protection Tests
  // -------------------------------------------------------------------------

  it('should return 400 when share is not password protected', async () => {
    // Arrange
    setupShareQuery(publicShare);

    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('public-token', { password: validPassword });
    const params = Promise.resolve({ token: 'public-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Share is not password protected');
  });

  it('should return 401 when password is incorrect', async () => {
    // Arrange
    setupShareQuery(protectedShare);

    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('protected-token', { password: 'wrongPassword' });
    const params = Promise.resolve({ token: 'protected-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('Incorrect password');
  });

  // -------------------------------------------------------------------------
  // Success Path Tests
  // -------------------------------------------------------------------------

  it('should return success and set cookie when password is correct', async () => {
    // Arrange
    setupShareQuery(protectedShare);

    const { POST } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createPostRequest('protected-token', { password: validPassword });
    const params = Promise.resolve({ token: 'protected-token' });

    // Act
    const response = await POST(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verified).toBe(true);
    expect(mockCookieSet).toHaveBeenCalledWith(
      'share_access_protected-token',
      'verified',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/shares/[token]/verify-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Share Lookup Tests
  // -------------------------------------------------------------------------

  it('should return 404 when share does not exist', async () => {
    // Arrange
    setupShareQuery(null, { code: 'PGRST116', message: 'No rows found' });

    const { GET } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createGetRequest('nonexistent-token');
    const params = Promise.resolve({ token: 'nonexistent-token' });

    // Act
    const response = await GET(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('Share not found');
  });

  // -------------------------------------------------------------------------
  // Status Check Tests
  // -------------------------------------------------------------------------

  it('should indicate share has expired', async () => {
    // Arrange
    setupShareQuery(expiredShare);

    const { GET } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createGetRequest('expired-token');
    const params = Promise.resolve({ token: 'expired-token' });

    // Act
    const response = await GET(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.expired).toBe(true);
    expect(body.hasAccess).toBe(false);
  });

  it('should indicate public share has access without password', async () => {
    // Arrange
    setupShareQuery(publicShare);

    const { GET } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createGetRequest('public-token');
    const params = Promise.resolve({ token: 'public-token' });

    // Act
    const response = await GET(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.requiresPassword).toBe(false);
    expect(body.hasAccess).toBe(true);
    expect(body.expired).toBe(false);
  });

  it('should indicate protected share requires password when no cookie', async () => {
    // Arrange
    setupShareQuery(protectedShare);
    mockCookieGet.mockReturnValue(undefined);

    const { GET } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createGetRequest('protected-token');
    const params = Promise.resolve({ token: 'protected-token' });

    // Act
    const response = await GET(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.requiresPassword).toBe(true);
    expect(body.hasAccess).toBe(false);
  });

  it('should indicate access granted when valid cookie exists', async () => {
    // Arrange
    setupShareQuery(protectedShare);
    mockCookieGet.mockReturnValue({ value: 'verified' });

    const { GET } = await import('@/app/api/shares/[token]/verify-password/route');
    const request = createGetRequest('protected-token');
    const params = Promise.resolve({ token: 'protected-token' });

    // Act
    const response = await GET(request, { params });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.requiresPassword).toBe(true);
    expect(body.hasAccess).toBe(true);
  });
});
