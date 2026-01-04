/**
 * Settings Types
 *
 * Feature: settings-update
 * Type definitions for user preferences and settings
 */

// =============================================================================
// Unit System Types
// =============================================================================

export type UnitSystem = 'metric' | 'imperial' | 'custom';
export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type TemperatureUnit = 'C' | 'F';
export type DimensionUnit = 'cm' | 'in';

export interface UnitPreferences {
  unitSystem: UnitSystem;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  dimensionUnit: DimensionUnit;
}

// =============================================================================
// Currency Types
// =============================================================================

export type CurrencyCode =
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CHF'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK';

export type CurrencyPosition = 'before' | 'after';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
}

export interface CurrencyPreferences {
  preferredCurrency: CurrencyCode;
  currencyPosition: CurrencyPosition;
  showOriginalPrice: boolean;
  autoConvertPrices: boolean;
}

// =============================================================================
// Date/Time Types
// =============================================================================

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type WeekStartDay = 'sunday' | 'monday';

export interface DateTimePreferences {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStartDay;
  timezone: string;
}

// =============================================================================
// Display Preferences
// =============================================================================

export type DisplayDensity = 'comfortable' | 'compact';

export interface DisplayPreferences {
  displayDensity: DisplayDensity;
  reduceAnimations: boolean;
  showWeightBreakdown: boolean;
}

// =============================================================================
// Notification Preferences
// =============================================================================

export interface PushNotificationSettings {
  price_alerts: boolean;
  friend_activity: boolean;
  messages: boolean;
}

export interface EmailNotificationSettings {
  price_alerts: boolean;
  messages: boolean;
  community_updates: boolean;
  product_updates: boolean;
  marketing: boolean;
}

export interface InAppNotificationSettings {
  price_alerts: boolean;
  friend_activity: boolean;
  messages: boolean;
  community_updates: boolean;
}

export interface QuietHoursSettings {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface NotificationPreferences {
  push: PushNotificationSettings;
  email: EmailNotificationSettings;
  in_app: InAppNotificationSettings;
  quiet_hours: QuietHoursSettings;
  sound: boolean;
  badge_count: boolean;
}

// =============================================================================
// Combined User Preferences
// =============================================================================

export interface UserPreferences {
  // Regional
  preferredLocale: string;
  unitSystem: UnitSystem;
  preferredWeightUnit: WeightUnit;
  preferredDistanceUnit: DistanceUnit;
  preferredTemperatureUnit: TemperatureUnit;
  preferredDimensionUnit: DimensionUnit;

  // Currency
  preferredCurrency: CurrencyCode;
  currencyPosition: CurrencyPosition;
  showOriginalPrice: boolean;
  autoConvertPrices: boolean;

  // Date/Time
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStartDay;
  timezone: string;

  // Display
  displayDensity: DisplayDensity;
  reduceAnimations: boolean;
  showWeightBreakdown: boolean;

  // Notifications
  notificationPreferences: NotificationPreferences;
}

// =============================================================================
// Database Row Types (snake_case)
// =============================================================================

export interface UserPreferencesRow {
  preferred_locale: string;
  unit_system: UnitSystem;
  preferred_weight_unit: WeightUnit;
  preferred_distance_unit: DistanceUnit;
  preferred_temperature_unit: TemperatureUnit;
  preferred_dimension_unit: DimensionUnit;
  preferred_currency: CurrencyCode;
  currency_position: CurrencyPosition;
  show_original_price: boolean;
  auto_convert_prices: boolean;
  date_format: DateFormat;
  time_format: TimeFormat;
  week_starts_on: WeekStartDay;
  timezone: string;
  display_density: DisplayDensity;
  reduce_animations: boolean;
  show_weight_breakdown: boolean;
  notification_preferences: NotificationPreferences;
}

// =============================================================================
// Exchange Rates
// =============================================================================

export interface ExchangeRates {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface ExchangeRatesRow {
  id: string;
  base_currency: CurrencyCode;
  rates: Record<string, number>;
  fetched_at: string;
  expires_at: string;
}

// =============================================================================
// Settings Section Types
// =============================================================================

export type SettingsSection =
  | 'appearance'
  | 'regional'
  | 'notifications'
  | 'privacy'
  | 'account'
  | 'data';

export interface SettingsSectionInfo {
  id: SettingsSection;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  href: string;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  preferredLocale: 'en',
  unitSystem: 'metric',
  preferredWeightUnit: 'g',
  preferredDistanceUnit: 'km',
  preferredTemperatureUnit: 'C',
  preferredDimensionUnit: 'cm',
  preferredCurrency: 'EUR',
  currencyPosition: 'before',
  showOriginalPrice: true,
  autoConvertPrices: true,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  weekStartsOn: 'monday',
  timezone: 'UTC',
  displayDensity: 'comfortable',
  reduceAnimations: false,
  showWeightBreakdown: true,
  notificationPreferences: {
    push: {
      price_alerts: true,
      friend_activity: true,
      messages: true,
    },
    email: {
      price_alerts: true,
      messages: true,
      community_updates: false,
      product_updates: true,
      marketing: false,
    },
    in_app: {
      price_alerts: true,
      friend_activity: true,
      messages: true,
      community_updates: true,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    sound: true,
    badge_count: true,
  },
};

// =============================================================================
// Currency Configuration
// =============================================================================

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', symbol: '\u20AC', name: 'Euro', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound', decimals: 2 },
  { code: 'CHF', symbol: 'Fr.', name: 'Swiss Franc', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen', decimals: 0 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2 },
  { code: 'PLN', symbol: 'z\u0142', name: 'Polish Z\u0142oty', decimals: 2 },
  { code: 'CZK', symbol: 'K\u010D', name: 'Czech Koruna', decimals: 2 },
];

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyInfo> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
) as Record<CurrencyCode, CurrencyInfo>;

// =============================================================================
// Unit System Defaults
// =============================================================================

export const METRIC_DEFAULTS: Omit<UnitPreferences, 'unitSystem'> = {
  weightUnit: 'g',
  distanceUnit: 'km',
  temperatureUnit: 'C',
  dimensionUnit: 'cm',
};

export const IMPERIAL_DEFAULTS: Omit<UnitPreferences, 'unitSystem'> = {
  weightUnit: 'oz',
  distanceUnit: 'mi',
  temperatureUnit: 'F',
  dimensionUnit: 'in',
};
