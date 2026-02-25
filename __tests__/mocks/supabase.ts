/**
 * Supabase Client Mocks
 *
 * Provides mock implementations for Supabase client operations
 * used throughout the test suite.
 */

import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'user-123-uuid',
  email: 'test@gearshack.com',
  user_metadata: {
    full_name: 'Test Hiker',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  created_at: '2024-01-01T00:00:00Z',
};

// Mock session
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600000,
  user: mockUser,
};

// Query builder mock factory
export function createQueryBuilderMock(data: unknown = [], error: Error | null = null) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    then: vi.fn((resolve) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 })),
  };
  return mock;
}

// Auth mock
export const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://auth.example.com' }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: vi.fn((_callback) => {
    // Return unsubscribe function
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  refreshSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
};

// Storage mock
export const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ data: { path: 'uploads/image.png' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/image.png' } }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
};

// Main Supabase client mock
export function createSupabaseMock(tableData: Record<string, unknown[]> = {}) {
  return {
    auth: mockAuth,
    storage: mockStorage,
    from: vi.fn((table: string) => createQueryBuilderMock(tableData[table] || [])),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
  };
}

// Default export for simple usage
export const mockSupabaseClient = createSupabaseMock();

// Helper to reset all mocks
export function resetSupabaseMocks() {
  mockAuth.getUser.mockClear();
  mockAuth.getSession.mockClear();
  mockAuth.signInWithPassword.mockClear();
  mockAuth.signOut.mockClear();
  mockAuth.onAuthStateChange.mockClear();
}
