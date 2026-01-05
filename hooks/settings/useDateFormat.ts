/**
 * Date Format Hook
 *
 * Feature: settings-update
 * Hook for formatting dates based on user preferences.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useUserPreferences } from './useUserPreferences';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateRelative,
  formatInTimezone,
  getWeekStart,
  getWeekDayNames,
} from '@/lib/date-formats';
import type { DateFormat, TimeFormat, WeekStartDay } from '@/types/settings';

interface UseDateFormatReturn {
  // Current preferences
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStartDay;
  timezone: string;

  // Formatters
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelative: (date: Date | string, options?: { includeTime?: boolean }) => string;
  formatInTimezone: (date: Date | string) => string;

  // Week helpers
  getWeekStart: (date: Date) => Date;
  getWeekDayNames: (format?: 'short' | 'long') => string[];
}

/**
 * Hook for date formatting based on user preferences
 */
export function useDateFormat(): UseDateFormatReturn {
  const { preferences } = useUserPreferences();

  const { dateFormat, timeFormat, weekStartsOn, timezone } = preferences;

  const formatDateFn = useCallback(
    (date: Date | string) => {
      return formatDate(date, dateFormat);
    },
    [dateFormat]
  );

  const formatTimeFn = useCallback(
    (date: Date | string) => {
      return formatTime(date, timeFormat);
    },
    [timeFormat]
  );

  const formatDateTimeFn = useCallback(
    (date: Date | string) => {
      return formatDateTime(date, dateFormat, timeFormat);
    },
    [dateFormat, timeFormat]
  );

  const formatRelativeFn = useCallback(
    (date: Date | string, options?: { includeTime?: boolean }) => {
      return formatDateRelative(date, dateFormat, {
        includeTime: options?.includeTime,
        timeFormat,
      });
    },
    [dateFormat, timeFormat]
  );

  const formatInTimezoneFn = useCallback(
    (date: Date | string) => {
      return formatInTimezone(date, timezone, dateFormat, timeFormat);
    },
    [timezone, dateFormat, timeFormat]
  );

  const getWeekStartFn = useCallback(
    (date: Date) => {
      return getWeekStart(date, weekStartsOn);
    },
    [weekStartsOn]
  );

  const getWeekDayNamesFn = useCallback(
    (format: 'short' | 'long' = 'short') => {
      return getWeekDayNames(weekStartsOn, format);
    },
    [weekStartsOn]
  );

  return useMemo(
    () => ({
      dateFormat,
      timeFormat,
      weekStartsOn,
      timezone,
      formatDate: formatDateFn,
      formatTime: formatTimeFn,
      formatDateTime: formatDateTimeFn,
      formatRelative: formatRelativeFn,
      formatInTimezone: formatInTimezoneFn,
      getWeekStart: getWeekStartFn,
      getWeekDayNames: getWeekDayNamesFn,
    }),
    [
      dateFormat,
      timeFormat,
      weekStartsOn,
      timezone,
      formatDateFn,
      formatTimeFn,
      formatDateTimeFn,
      formatRelativeFn,
      formatInTimezoneFn,
      getWeekStartFn,
      getWeekDayNamesFn,
    ]
  );
}
