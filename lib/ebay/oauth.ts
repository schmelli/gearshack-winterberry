/**
 * eBay OAuth Token Service
 *
 * Feature: 054-ebay-integration
 * Purpose: Manage OAuth Client Credentials tokens for eBay Browse API
 *
 * Uses singleton pattern with automatic token refresh.
 * Tokens are cached for 2 hours (with 5-minute buffer for refresh).
 */

// =============================================================================
// Types
// =============================================================================

interface OAuthToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
  tokenType: string;
}

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
}

// =============================================================================
// Configuration
// =============================================================================

const EBAY_OAUTH_CONFIG = {
  /** Production OAuth endpoint */
  productionUrl: 'https://api.ebay.com/identity/v1/oauth2/token',
  /** Sandbox OAuth endpoint */
  sandboxUrl: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
  /** Required scope for Browse API */
  scope: 'https://api.ebay.com/oauth/api_scope',
  /** Refresh buffer: get new token 5 minutes before expiry */
  refreshBufferMs: 5 * 60 * 1000,
} as const;

// =============================================================================
// Token Cache (Singleton)
// =============================================================================

let cachedToken: OAuthToken | null = null;
let tokenPromise: Promise<OAuthToken> | null = null;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get OAuth endpoint URL based on environment
 */
function getOAuthUrl(): string {
  const isProduction = process.env.EBAY_ENVIRONMENT !== 'sandbox';
  return isProduction
    ? EBAY_OAUTH_CONFIG.productionUrl
    : EBAY_OAUTH_CONFIG.sandboxUrl;
}

/**
 * Create Base64-encoded credentials for Basic Auth
 */
function createBasicAuthHeader(): string {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'eBay credentials not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET environment variables.'
    );
  }

  const credentials = `${clientId}:${clientSecret}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  return `Basic ${base64Credentials}`;
}

/**
 * Check if cached token is still valid (with buffer)
 */
function isTokenValid(token: OAuthToken | null): boolean {
  if (!token) return false;
  const now = Date.now();
  const expiresWithBuffer = token.expiresAt - EBAY_OAUTH_CONFIG.refreshBufferMs;
  return now < expiresWithBuffer;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Fetch a new OAuth token from eBay
 */
async function fetchNewToken(): Promise<OAuthToken> {
  const url = getOAuthUrl();

  if (process.env.NODE_ENV === 'development') {
    console.log('[eBay OAuth] Fetching new token from:', url);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: createBasicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: EBAY_OAUTH_CONFIG.scope,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[eBay OAuth] Token request failed:', response.status, errorText);
    throw new Error(`eBay OAuth failed: ${response.status} - ${errorText}`);
  }

  const data: OAuthTokenResponse = await response.json();

  const token: OAuthToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
  };

  if (process.env.NODE_ENV === 'development') {
    const expiresInMinutes = Math.round(data.expires_in / 60);
    console.log(`[eBay OAuth] Token obtained, expires in ${expiresInMinutes} minutes`);
  }

  return token;
}

/**
 * Get a valid OAuth access token
 *
 * Uses cached token if valid, otherwise fetches a new one.
 * Handles concurrent requests by reusing the same promise.
 *
 * @returns Access token string ready for Authorization header
 * @throws Error if credentials are missing or OAuth request fails
 */
export async function getEbayAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (isTokenValid(cachedToken)) {
    return cachedToken!.accessToken;
  }

  // If a token request is already in progress, wait for it
  if (tokenPromise) {
    const token = await tokenPromise;
    return token.accessToken;
  }

  // Fetch new token
  try {
    tokenPromise = fetchNewToken();
    cachedToken = await tokenPromise;
    return cachedToken.accessToken;
  } finally {
    tokenPromise = null;
  }
}

/**
 * Clear cached token (useful for testing or forced refresh)
 */
export function clearEbayTokenCache(): void {
  cachedToken = null;
  tokenPromise = null;
}

/**
 * Check if eBay credentials are configured
 */
export function isEbayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

/**
 * Get token expiration info (for debugging)
 */
export function getTokenExpirationInfo(): { expiresAt: Date; isValid: boolean } | null {
  if (!cachedToken) return null;
  return {
    expiresAt: new Date(cachedToken.expiresAt),
    isValid: isTokenValid(cachedToken),
  };
}
