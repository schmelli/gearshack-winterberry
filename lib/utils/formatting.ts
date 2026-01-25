/**
 * Formatting Utilities
 *
 * Shared formatting functions for consistent display across the application.
 */

/**
 * Gets initials from a person's name with edge case handling
 *
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD"), or "?" for invalid/empty names
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "AL"
 * getInitials("") // "?"
 * getInitials("123") // "1"
 * getInitials("!@#$") // "?"
 */
export function getInitials(name: string): string {
  // Handle null, undefined, or empty string
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return '?';
  }

  // Split on whitespace and filter out empty parts
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0);

  if (parts.length === 0) {
    return '?';
  }

  // Get first letter of each part (up to 2 parts)
  const initials = parts
    .slice(0, 2)
    .map((part) => {
      // Find first alphanumeric character
      const match = part.match(/[a-zA-Z0-9]/);
      return match ? match[0] : '';
    })
    .filter(char => char.length > 0)
    .join('')
    .toUpperCase();

  // Return initials or fallback to "?" if no valid characters found
  return initials.length > 0 ? initials : '?';
}

/**
 * Formats a timestamp as relative time ago with i18n support
 *
 * @param dateString - ISO timestamp
 * @param t - Optional translation function from useTranslations('Community')
 * @returns Human-readable time ago (e.g., "2h ago", "3d ago")
 *
 * @example
 * formatTimeAgo("2025-12-31T10:00:00Z") // "2h ago" (English fallback)
 * formatTimeAgo("2025-12-31T10:00:00Z", t) // "vor 2h" (German with i18n)
 */
export function formatTimeAgo(
  dateString: string,
  t?: (key: string, values?: { count: number }) => string
): string {
  const now = new Date();
  const date = new Date(dateString);

  // Validate date is valid
  if (isNaN(date.getTime())) {
    return t ? t('time.unknown') : 'unknown';
  }

  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Use i18n if translation function is provided
  if (t) {
    if (years > 0) return t('time.yearsAgo', { count: years });
    if (months > 0) return t('time.monthsAgo', { count: months });
    if (weeks > 0) return t('time.weeksAgo', { count: weeks });
    if (days > 0) return t('time.daysAgo', { count: days });
    if (hours > 0) return t('time.hoursAgo', { count: hours });
    if (minutes > 0) return t('time.minutesAgo', { count: minutes });
    return t('time.justNow');
  }

  // Fallback to English if no translation function
  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
