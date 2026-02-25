/**
 * Avatar Utility Functions
 *
 * Feature: 041-loadout-ux-profile
 * Task: T009
 *
 * Helper functions for avatar display with fallback chain:
 * 1. Custom avatar (from Cloudinary)
 * 2. Provider avatar (from Google/OAuth)
 * 3. User initials
 */

/**
 * Get the display avatar URL following the fallback chain:
 * Custom avatar > Provider avatar > null (triggers initials fallback)
 *
 * @param customAvatarUrl - Custom avatar URL from profiles table
 * @param providerAvatarUrl - Provider avatar URL from auth (Google, etc.)
 * @returns The avatar URL to display, or null if no avatar available
 */
export function getDisplayAvatarUrl(
  customAvatarUrl: string | null | undefined,
  providerAvatarUrl: string | null | undefined
): string | null {
  // Custom avatar takes precedence
  if (customAvatarUrl && customAvatarUrl.trim() !== '') {
    return customAvatarUrl;
  }
  // Fall back to provider avatar
  if (providerAvatarUrl && providerAvatarUrl.trim() !== '') {
    return providerAvatarUrl;
  }
  // No avatar available - caller should use initials
  return null;
}

/**
 * Generate user initials from display name
 *
 * @param displayName - User's display name
 * @returns 1-2 character initials, or '?' if no name provided
 *
 * @example
 * getUserInitials('John Doe') // 'JD'
 * getUserInitials('Alice') // 'AL'
 * getUserInitials('') // '?'
 * getUserInitials(null) // '?'
 */
export function getUserInitials(
  displayName: string | null | undefined
): string {
  if (!displayName || displayName.trim() === '') {
    return '?';
  }

  const parts = displayName.trim().split(/\s+/);

  if (parts.length === 1) {
    // Single word name - take first two characters
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Multiple words - take first character of first and last word
  const firstInitial = parts[0][0] || '';
  const lastInitial = parts[parts.length - 1][0] || '';
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Determine which avatar source is currently being used
 *
 * @param customAvatarUrl - Custom avatar URL
 * @param providerAvatarUrl - Provider avatar URL
 * @returns The source type being displayed
 */
export function getAvatarSource(
  customAvatarUrl: string | null | undefined,
  providerAvatarUrl: string | null | undefined
): 'custom' | 'provider' | 'initials' {
  if (customAvatarUrl && customAvatarUrl.trim() !== '') {
    return 'custom';
  }
  if (providerAvatarUrl && providerAvatarUrl.trim() !== '') {
    return 'provider';
  }
  return 'initials';
}
