/**
 * Date Formatting Utilities
 *
 * Feature: settings-update
 * Utility functions for formatting dates according to user preferences.
 */

import type { DateFormat, TimeFormat, WeekStartDay } from '@/types/settings';

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a date according to user preference
 */
export function formatDate(date: Date | string, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a date with relative description (Today, Yesterday, etc.)
 */
export function formatDateRelative(
  date: Date | string,
  format: DateFormat,
  options?: { includeTime?: boolean; timeFormat?: TimeFormat }
): string {
  const { includeTime = false, timeFormat = '24h' } = options ?? {};
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

  let dateStr: string;
  if (diffDays === 0) {
    dateStr = 'Today';
  } else if (diffDays === 1) {
    dateStr = 'Yesterday';
  } else if (diffDays === -1) {
    dateStr = 'Tomorrow';
  } else if (diffDays > 0 && diffDays < 7) {
    dateStr = d.toLocaleDateString('en', { weekday: 'long' });
  } else {
    dateStr = formatDate(d, format);
  }

  if (includeTime) {
    const timeStr = formatTime(d, timeFormat);
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
}

// =============================================================================
// Time Formatting
// =============================================================================

/**
 * Format time according to user preference
 */
export function formatTime(date: Date | string, format: TimeFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid time';
  }

  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  } else {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  }
}

/**
 * Format datetime (date + time)
 */
export function formatDateTime(
  date: Date | string,
  dateFormat: DateFormat,
  timeFormat: TimeFormat
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d, dateFormat)} ${formatTime(d, timeFormat)}`;
}

// =============================================================================
// Week Helpers
// =============================================================================

/**
 * Get the start of the week for a given date
 */
export function getWeekStart(date: Date, weekStartsOn: WeekStartDay): Date {
  const d = new Date(date);
  const day = d.getDay();
  const startDay = weekStartsOn === 'sunday' ? 0 : 1;

  let diff = day - startDay;
  if (diff < 0) diff += 7;

  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get day names starting from the configured first day
 */
export function getWeekDayNames(
  weekStartsOn: WeekStartDay,
  format: 'short' | 'long' = 'short'
): string[] {
  const days =
    format === 'short'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (weekStartsOn === 'monday') {
    return [...days.slice(1), days[0]];
  }
  return days;
}

// =============================================================================
// Timezone Helpers
// =============================================================================

/**
 * Get a list of common timezones
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
    { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
    { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
    { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)' },
    { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)' },
    { value: 'Europe/Warsaw', label: 'Warsaw (CET/CEST)' },
    { value: 'Europe/Prague', label: 'Prague (CET/CEST)' },
    { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)' },
    { value: 'Europe/Athens', label: 'Athens (EET/EEST)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
    { value: 'America/Sao_Paulo', label: 'S\u00E3o Paulo (BRT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  ];
}

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Format date in a specific timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  dateFormat: DateFormat,
  timeFormat: TimeFormat
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    };

    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
    const getValue = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    const day = getValue('day');
    const month = getValue('month');
    const year = getValue('year');
    const hour = getValue('hour');
    const minute = getValue('minute');
    const dayPeriod = getValue('dayPeriod');

    let dateStr: string;
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        dateStr = `${day}/${month}/${year}`;
        break;
      case 'MM/DD/YYYY':
        dateStr = `${month}/${day}/${year}`;
        break;
      case 'YYYY-MM-DD':
        dateStr = `${year}-${month}-${day}`;
        break;
      default:
        dateStr = `${day}/${month}/${year}`;
    }

    const timeStr =
      timeFormat === '12h' ? `${hour}:${minute} ${dayPeriod.toUpperCase()}` : `${hour}:${minute}`;

    return `${dateStr} ${timeStr}`;
  } catch {
    return formatDateTime(d, dateFormat, timeFormat);
  }
}

// =============================================================================
// Parsing Helpers
// =============================================================================

/**
 * Parse a date string in the given format
 */
export function parseDate(dateStr: string, format: DateFormat): Date | null {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;

  switch (format) {
    case 'DD/MM/YYYY':
      [day, month, year] = parts.map(Number);
      break;
    case 'MM/DD/YYYY':
      [month, day, year] = parts.map(Number);
      break;
    case 'YYYY-MM-DD':
      [year, month, day] = parts.map(Number);
      break;
    default:
      return null;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Parse a time string
 */
export function parseTime(timeStr: string, format: TimeFormat): { hours: number; minutes: number } | null {
  const cleanStr = timeStr.trim().toUpperCase();

  if (format === '12h') {
    const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  } else {
    const match = cleanStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return { hours, minutes };
  }
}
