/**
 * Date Utilities
 *
 * Shared date helper functions for consistent date/time handling across the application.
 * Used by rate limiters, analytics, and other time-based features.
 */

/**
 * Get the start of today (00:00:00.000) in ISO format
 */
export function getTodayStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of today (23:59:59.999) in ISO format
 */
export function getTodayEnd(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

/**
 * Get the start of the current month in ISO format
 */
export function getMonthStart(): string {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of the current month in ISO format
 */
export function getMonthEnd(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  now.setDate(0); // Last day of current month
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

/**
 * Calculate the reset time for the current hourly window
 * Returns the start of the next hour
 */
export function getNextHourStart(): Date {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setMinutes(0, 0, 0);
  resetTime.setHours(resetTime.getHours() + 1);
  return resetTime;
}

/**
 * Format minutes until a future date in a human-readable way
 *
 * @param targetDate - The future date to calculate time until
 * @returns Human-readable string like "5 minutes" or "in less than a minute"
 */
export function formatMinutesUntil(targetDate: Date): string {
  const minutesUntil = Math.ceil((targetDate.getTime() - Date.now()) / (60 * 1000));

  if (minutesUntil <= 1) {
    return 'in less than a minute';
  }

  return `${minutesUntil} minutes`;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}
