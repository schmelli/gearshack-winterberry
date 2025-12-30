/**
 * Integration Tests: Loadout Image Generation API
 * Route: POST /api/loadout-images/generate
 * Feature: 048-ai-loadout-image-gen
 *
 * Tests AI image generation endpoint including authentication,
 * rate limiting, validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockUser, createQueryBuilderMock, resetSupabaseMocks } from '../../mocks/supabase';

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock Supabase server client
const mockSupabaseAuth = {
  getUser: vi.fn(),
};

const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: mockSupabaseAuth,
      from: mockSupabaseFrom,
    })
  ),
}));

// Mock rate limiting
const mockCheckRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (userId: string) => mockCheckRateLimit(userId),
}));

// Mock AI generation
const mockGenerateAIImage = vi.fn();
vi.mock('@/lib/vercel-ai', () => ({
  generateAIImage: (request: unknown) => mockGenerateAIImage(request),
  AIGenerationError: class AIGenerationError extends Error {
    code: number;
    isRetryable: boolean;
    constructor(message: string, code: number, isRetryable: boolean) {
      super(message);
      this.name = 'AIGenerationError';
      this.code = code;
      this.isRetryable = isRetryable;
    }
  },
}));

// Mock Cloudinary utils
vi.mock('@/lib/cloudinary-utils', () => ({
  extractPublicId: vi.fn(() => 'gearshack/generated/test-image-123'),
}));

// Mock loadout-images service
const mockInsertGeneratedImage = vi.fn();
vi.mock('@/lib/supabase/loadout-images', () => ({
  insertGeneratedImage: (params: unknown) => mockInsertGeneratedImage(params),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const validLoadoutId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const validRequestBody = {
  loadoutId: validLoadoutId,
  prompt: 'A beautiful mountain sunrise with hiking gear laid out on a rock',
  negativePrompt: 'text, watermark, blurry',
  stylePreferences: {
    template: 'cinematic',
    timeOfDay: 'golden_hour',
    atmosphere: 'misty morning',
  },
};

const mockGeneratedImage = {
  id: 'img-001',
  loadoutId: validLoadoutId,
  cloudinaryPublicId: 'gearshack/generated/test-image-123',
  cloudinaryUrl: 'https://res.cloudinary.com/test/gearshack/generated/test-image-123.jpg',
  promptUsed: validRequestBody.prompt,
  stylePreferences: validRequestBody.stylePreferences,
  generationTimestamp: new Date(),
  altText: 'AI-generated outdoor scene',
  isActive: true,
  createdAt: new Date(),
};

// =============================================================================
// Helper Functions
// =============================================================================

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/loadout-images/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/loadout-images/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMocks();

    // Default successful mocks
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': new Date().toISOString(),
      },
    });

    const loadoutQueryBuilder = createQueryBuilderMock({ user_id: mockUser.id });
    mockSupabaseFrom.mockReturnValue(loadoutQueryBuilder);

    mockGenerateAIImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/gearshack/generated/test-image-123.jpg',
      width: 1024,
      height: 576,
      contentType: 'image/png',
    });

    mockInsertGeneratedImage.mockResolvedValue(mockGeneratedImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Authentication Tests
  // -------------------------------------------------------------------------

  it('should return 401 when user is not authenticated', async () => {
    // Arrange
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' },
    });

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 when auth returns error', async () => {
    // Arrange
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  // -------------------------------------------------------------------------
  // Rate Limiting Tests
  // -------------------------------------------------------------------------

  it('should return 429 when rate limit is exceeded', async () => {
    // Arrange
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      error: 'Rate limit exceeded. You can generate in 30 minutes.',
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(429);
    expect(body.error).toContain('Rate limit exceeded');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should include rate limit headers in successful response', async () => {
    // Arrange
    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);

    // Assert
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
  });

  // -------------------------------------------------------------------------
  // Validation Tests
  // -------------------------------------------------------------------------

  it('should return 400 when loadoutId is missing', async () => {
    // Arrange
    const invalidBody = { ...validRequestBody };
    delete (invalidBody as { loadoutId?: string }).loadoutId;

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(invalidBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request data');
    expect(body.details).toBeDefined();
  });

  it('should return 400 when prompt is too short', async () => {
    // Arrange
    const invalidBody = { ...validRequestBody, prompt: 'short' };

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(invalidBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request data');
  });

  it('should return 400 when loadoutId is not a valid UUID', async () => {
    // Arrange
    const invalidBody = { ...validRequestBody, loadoutId: 'not-a-uuid' };

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(invalidBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request data');
  });

  // -------------------------------------------------------------------------
  // Authorization Tests
  // -------------------------------------------------------------------------

  it('should return 404 when loadout does not exist', async () => {
    // Arrange
    const notFoundQueryBuilder = createQueryBuilderMock(null);
    notFoundQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });
    mockSupabaseFrom.mockReturnValue(notFoundQueryBuilder);

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('Loadout not found');
  });

  it('should return 403 when user does not own the loadout', async () => {
    // Arrange
    const otherUserQueryBuilder = createQueryBuilderMock({ user_id: 'other-user-id' });
    mockSupabaseFrom.mockReturnValue(otherUserQueryBuilder);

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  // -------------------------------------------------------------------------
  // Success Path Tests
  // -------------------------------------------------------------------------

  it('should successfully generate an image and return 200', async () => {
    // Arrange
    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageId).toBe(mockGeneratedImage.id);
    // Compare non-date fields (dates are serialized to ISO strings in JSON)
    expect(body.image.id).toBe(mockGeneratedImage.id);
    expect(body.image.loadoutId).toBe(mockGeneratedImage.loadoutId);
    expect(body.image.cloudinaryUrl).toBe(mockGeneratedImage.cloudinaryUrl);
    expect(body.image.promptUsed).toBe(mockGeneratedImage.promptUsed);
    expect(body.image.isActive).toBe(mockGeneratedImage.isActive);
  });

  it('should call AI generation with correct parameters', async () => {
    // Arrange
    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    await POST(request);

    // Assert
    expect(mockGenerateAIImage).toHaveBeenCalledWith({
      prompt: validRequestBody.prompt,
      negativePrompt: validRequestBody.negativePrompt,
      aspectRatio: '16:9',
      qualityMode: 'hd',
    });
  });

  it('should save image with correct metadata', async () => {
    // Arrange
    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    await POST(request);

    // Assert
    expect(mockInsertGeneratedImage).toHaveBeenCalledWith(
      expect.objectContaining({
        loadoutId: validLoadoutId,
        promptUsed: validRequestBody.prompt,
        stylePreferences: validRequestBody.stylePreferences,
        userId: mockUser.id,
      })
    );
  });

  // -------------------------------------------------------------------------
  // Error Handling Tests
  // -------------------------------------------------------------------------

  it('should handle AI generation errors with retryable flag', async () => {
    // Arrange
    const { AIGenerationError } = await import('@/lib/vercel-ai');
    mockGenerateAIImage.mockRejectedValue(
      new AIGenerationError('AI service unavailable', 503, true)
    );

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(503);
    expect(body.error).toBe('AI service unavailable');
    expect(body.retryable).toBe(true);
  });

  it('should handle non-retryable AI generation errors', async () => {
    // Arrange
    const { AIGenerationError } = await import('@/lib/vercel-ai');
    mockGenerateAIImage.mockRejectedValue(
      new AIGenerationError('Content policy violation', 400, false)
    );

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Content policy violation');
    expect(body.retryable).toBe(false);
  });

  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    mockGenerateAIImage.mockRejectedValue(new Error('Unexpected network error'));

    const { POST } = await import('@/app/api/loadout-images/generate/route');
    const request = createMockRequest(validRequestBody);

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('Unexpected network error');
  });
});
