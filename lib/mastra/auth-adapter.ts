/**
 * Supabase Authentication Adapter for Mastra Agent
 * Feature: 001-mastra-agentic-voice
 * Task: T013
 *
 * Integrates Supabase authentication with Mastra agent for:
 * - User ID extraction from Supabase sessions for memory isolation
 * - Token validation and authentication state handling
 * - Authorization for protected Mastra API routes
 *
 * This adapter extends MastraAuthProvider to provide Supabase-specific
 * authentication logic while maintaining compatibility with the Mastra framework.
 */

import { MastraAuthProvider, type MastraAuthProviderOptions } from '@mastra/core/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { HonoRequest } from 'hono';
import { logInfo, logWarn, logError } from './logging';

// ==================== Type Definitions ====================

/**
 * Supabase user payload for Mastra authentication
 */
export interface SupabaseAuthUser {
  id: string;
  email: string | null;
  role: string;
  aud: string;
  isAnonymous: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Authentication result with user context
 */
export interface AuthResult {
  authenticated: boolean;
  user: SupabaseAuthUser | null;
  error?: string;
}

/**
 * Memory isolation context derived from authentication
 */
export interface MemoryIsolationContext {
  resourceId: string;
  threadPrefix: string;
}

// ==================== Configuration ====================

/**
 * Default protected paths for Mastra API routes
 * These routes require authentication
 */
const DEFAULT_PROTECTED_PATHS: (RegExp | string)[] = [
  '/api/mastra/chat',
  '/api/mastra/voice',
  '/api/mastra/memory',
  '/api/mastra/workflows',
  new RegExp('^/api/mastra/.*'),
];

/**
 * Default public paths that do not require authentication
 */
const DEFAULT_PUBLIC_PATHS: (RegExp | string)[] = [
  '/api/mastra/health',
  '/api/mastra/metrics',
];

// ==================== Helper Functions ====================

/**
 * Extract bearer token from Authorization header
 *
 * Utility for extracting JWT from standard Bearer token format.
 *
 * @param request - Hono request object
 * @returns Bearer token or null if not present
 */
export function extractBearerToken(request: HonoRequest): string | null {
  const authHeader = request.header('Authorization');

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Convert Supabase User to SupabaseAuthUser
 */
function toSupabaseAuthUser(user: User): SupabaseAuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.role ?? 'authenticated',
    aud: user.aud ?? 'authenticated',
    isAnonymous: user.is_anonymous ?? false,
    metadata: user.user_metadata ?? {},
  };
}

// ==================== Supabase Auth Provider ====================

/**
 * Supabase authentication provider for Mastra
 *
 * Extends MastraAuthProvider to provide Supabase-specific authentication:
 * - Token validation using Supabase Auth
 * - User authorization with role-based access
 * - Memory isolation via user ID extraction
 *
 * @example
 * ```ts
 * import { supabaseAuthProvider } from '@/lib/mastra/auth-adapter';
 *
 * const mastra = new Mastra({
 *   server: {
 *     experimental_auth: supabaseAuthProvider,
 *   },
 * });
 * ```
 */
export class SupabaseAuthProvider extends MastraAuthProvider<SupabaseAuthUser> {
  constructor(options?: MastraAuthProviderOptions<SupabaseAuthUser>) {
    super({
      name: 'supabase',
      protected: DEFAULT_PROTECTED_PATHS,
      public: DEFAULT_PUBLIC_PATHS,
      ...options,
    });
  }

  /**
   * Authenticate a Supabase JWT token
   *
   * Validates the token using Supabase Auth and returns the user payload.
   * Returns null if the token is invalid or expired.
   *
   * @param token - JWT token from Authorization header
   * @param request - Hono request object
   * @returns User payload or null if authentication fails
   */
  async authenticateToken(token: string, request: HonoRequest): Promise<SupabaseAuthUser | null> {
    try {
      // Create server-side Supabase client
      const supabase = await createServerClient();

      // Verify the token by getting the user
      // Note: In server context, we use getUser which verifies the JWT
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        logWarn('Supabase token authentication failed', {
          metadata: {
            error: error.message,
            path: request.path,
          },
        });
        return null;
      }

      if (!user) {
        logWarn('No user found for token', {
          metadata: { path: request.path },
        });
        return null;
      }

      logInfo('User authenticated via Supabase', {
        userId: user.id,
        metadata: { path: request.path },
      });

      return toSupabaseAuthUser(user);
    } catch (error) {
      logError('Error during token authentication', error, {
        metadata: { path: request.path },
      });
      return null;
    }
  }

  /**
   * Authorize a user for a specific path and method
   *
   * Default implementation allows all authenticated users.
   * Override for role-based or subscription-tier access control.
   *
   * @param user - Authenticated user payload
   * @param request - Hono request object
   * @returns True if authorized, false otherwise
   */
  async authorizeUser(user: SupabaseAuthUser, request: HonoRequest): Promise<boolean> {
    // Block anonymous users from Mastra APIs
    if (user.isAnonymous) {
      logWarn('Anonymous user blocked from Mastra API', {
        userId: user.id,
        metadata: { path: request.path },
      });
      return false;
    }

    // Log successful authorization
    logInfo('User authorized for Mastra API', {
      userId: user.id,
      metadata: {
        path: request.path,
        method: request.method,
      },
    });

    return true;
  }
}

// ==================== Memory Isolation Utilities ====================

/**
 * Extract memory isolation context from authenticated user
 *
 * Generates a resource ID and thread prefix for isolating
 * conversation memory per user. This ensures users can only
 * access their own conversation history.
 *
 * @param user - Authenticated Supabase user
 * @returns Memory isolation context
 *
 * @example
 * ```ts
 * const { resourceId, threadPrefix } = getMemoryIsolationContext(user);
 *
 * // Use in Mastra agent execution
 * await agent.generate({
 *   memory: {
 *     resource: resourceId,
 *     thread: `${threadPrefix}-${conversationId}`,
 *   },
 * });
 * ```
 */
export function getMemoryIsolationContext(user: SupabaseAuthUser): MemoryIsolationContext {
  return {
    resourceId: user.id,
    threadPrefix: `user-${user.id}`,
  };
}

/**
 * Generate a unique thread ID for a conversation
 *
 * Combines user ID with conversation ID to create isolated threads.
 *
 * @param userId - Supabase user ID
 * @param conversationId - Unique conversation identifier
 * @returns Isolated thread ID
 */
export function generateThreadId(userId: string, conversationId: string): string {
  return `thread-${userId}-${conversationId}`;
}

// ==================== Authentication Helpers ====================

/**
 * Get current user from Supabase session (server-side)
 *
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * @returns AuthResult with user if authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return {
        authenticated: false,
        user: null,
        error: error.message,
      };
    }

    if (!user) {
      return {
        authenticated: false,
        user: null,
        error: 'No active session',
      };
    }

    return {
      authenticated: true,
      user: toSupabaseAuthUser(user),
    };
  } catch (error) {
    return {
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Get current user from Supabase session (client-side)
 *
 * Use in Client Components for checking auth state.
 *
 * @returns AuthResult with user if authenticated
 */
export async function getAuthenticatedUserClient(): Promise<AuthResult> {
  try {
    const supabase = createBrowserClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return {
        authenticated: false,
        user: null,
        error: error.message,
      };
    }

    if (!user) {
      return {
        authenticated: false,
        user: null,
        error: 'No active session',
      };
    }

    return {
      authenticated: true,
      user: toSupabaseAuthUser(user),
    };
  } catch (error) {
    return {
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Extract user ID for memory operations
 *
 * Convenience function that returns just the user ID or null.
 * Useful for quick auth checks in API routes.
 *
 * @returns User ID or null if not authenticated
 */
export async function getUserIdForMemory(): Promise<string | null> {
  const { authenticated, user } = await getAuthenticatedUser();
  return authenticated && user ? user.id : null;
}

// ==================== Singleton Export ====================

/**
 * Pre-configured Supabase auth provider instance
 *
 * Use this singleton in Mastra configuration:
 *
 * @example
 * ```ts
 * import { supabaseAuthProvider } from '@/lib/mastra/auth-adapter';
 *
 * const mastra = new Mastra({
 *   server: {
 *     experimental_auth: supabaseAuthProvider,
 *   },
 * });
 * ```
 */
export const supabaseAuthProvider = new SupabaseAuthProvider();

// ==================== Named Export Object ====================

/**
 * Consolidated auth adapter exports for convenient import
 */
export const authAdapter = {
  SupabaseAuthProvider,
  supabaseAuthProvider,
  extractBearerToken,
  getMemoryIsolationContext,
  generateThreadId,
  getAuthenticatedUser,
  getAuthenticatedUserClient,
  getUserIdForMemory,
};

// ==================== Default Export ====================

export default authAdapter;
