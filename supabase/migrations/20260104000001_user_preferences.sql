-- Migration: Add user preferences to profiles table
-- Feature: settings-update
-- Date: 2026-01-04
--
-- Adds comprehensive user preference columns for:
-- - Regional settings (locale, units, currency, date/time)
-- - Display preferences (density, animations)
-- - Notification preferences (JSONB for flexibility)

-- =============================================================================
-- Regional Preferences
-- =============================================================================

-- Preferred locale/language
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_locale TEXT DEFAULT 'en';

COMMENT ON COLUMN profiles.preferred_locale IS 'User preferred language code (en, de, etc.)';

-- Unit system preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  unit_system TEXT DEFAULT 'metric';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_unit_system_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_unit_system_check
  CHECK (unit_system IN ('metric', 'imperial', 'custom'));

COMMENT ON COLUMN profiles.unit_system IS 'Unit system: metric, imperial, or custom';

-- Weight unit preference (extends existing if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_weight_unit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_weight_unit TEXT DEFAULT 'g';
  END IF;
END $$;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_weight_unit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_weight_unit_check
  CHECK (preferred_weight_unit IN ('g', 'kg', 'oz', 'lb'));

COMMENT ON COLUMN profiles.preferred_weight_unit IS 'Preferred weight display unit';

-- Distance unit preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_distance_unit TEXT DEFAULT 'km';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_distance_unit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_distance_unit_check
  CHECK (preferred_distance_unit IN ('km', 'mi'));

COMMENT ON COLUMN profiles.preferred_distance_unit IS 'Preferred distance display unit';

-- Temperature unit preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_temperature_unit TEXT DEFAULT 'C';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_temperature_unit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_temperature_unit_check
  CHECK (preferred_temperature_unit IN ('C', 'F'));

COMMENT ON COLUMN profiles.preferred_temperature_unit IS 'Preferred temperature unit (C or F)';

-- Dimension unit preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_dimension_unit TEXT DEFAULT 'cm';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_dimension_unit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_dimension_unit_check
  CHECK (preferred_dimension_unit IN ('cm', 'in'));

COMMENT ON COLUMN profiles.preferred_dimension_unit IS 'Preferred dimension display unit';

-- =============================================================================
-- Currency Preferences
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_currency TEXT DEFAULT 'EUR';

COMMENT ON COLUMN profiles.preferred_currency IS 'ISO 4217 currency code for price display';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  currency_position TEXT DEFAULT 'before';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_currency_position_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_currency_position_check
  CHECK (currency_position IN ('before', 'after'));

COMMENT ON COLUMN profiles.currency_position IS 'Currency symbol position: before or after amount';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  show_original_price BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.show_original_price IS 'Show original price alongside converted price';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  auto_convert_prices BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.auto_convert_prices IS 'Automatically convert prices to preferred currency';

-- =============================================================================
-- Date/Time Preferences
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  date_format TEXT DEFAULT 'DD/MM/YYYY';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_date_format_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_date_format_check
  CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));

COMMENT ON COLUMN profiles.date_format IS 'Preferred date format';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  time_format TEXT DEFAULT '24h';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_time_format_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_time_format_check
  CHECK (time_format IN ('12h', '24h'));

COMMENT ON COLUMN profiles.time_format IS 'Preferred time format: 12h or 24h';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  week_starts_on TEXT DEFAULT 'monday';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_week_starts_on_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_week_starts_on_check
  CHECK (week_starts_on IN ('sunday', 'monday'));

COMMENT ON COLUMN profiles.week_starts_on IS 'First day of the week';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN profiles.timezone IS 'User timezone (IANA format)';

-- =============================================================================
-- Display Preferences
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  display_density TEXT DEFAULT 'comfortable';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_display_density_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_display_density_check
  CHECK (display_density IN ('comfortable', 'compact'));

COMMENT ON COLUMN profiles.display_density IS 'UI display density preference';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  reduce_animations BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.reduce_animations IS 'Reduce motion/animations for accessibility';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  show_weight_breakdown BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.show_weight_breakdown IS 'Show detailed weight breakdown in loadouts';

-- =============================================================================
-- Notification Preferences (JSONB for flexibility)
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  notification_preferences JSONB DEFAULT '{
    "push": {
      "price_alerts": true,
      "friend_activity": true,
      "messages": true
    },
    "email": {
      "price_alerts": true,
      "messages": true,
      "community_updates": false,
      "product_updates": true,
      "marketing": false
    },
    "in_app": {
      "price_alerts": true,
      "friend_activity": true,
      "messages": true,
      "community_updates": true
    },
    "quiet_hours": {
      "enabled": false,
      "start": "22:00",
      "end": "07:00"
    },
    "sound": true,
    "badge_count": true
  }'::jsonb;

COMMENT ON COLUMN profiles.notification_preferences IS 'JSONB object for all notification settings';

-- =============================================================================
-- Exchange Rates Cache Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  rates JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_base ON exchange_rates(base_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_expires ON exchange_rates(expires_at);

-- RLS: Public read access for exchange rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_select_all" ON exchange_rates;
CREATE POLICY "exchange_rates_select_all"
  ON exchange_rates FOR SELECT
  USING (true);

-- Only service role can insert/update exchange rates
DROP POLICY IF EXISTS "exchange_rates_insert_service" ON exchange_rates;
CREATE POLICY "exchange_rates_insert_service"
  ON exchange_rates FOR INSERT
  WITH CHECK (false); -- Will use service role key

DROP POLICY IF EXISTS "exchange_rates_update_service" ON exchange_rates;
CREATE POLICY "exchange_rates_update_service"
  ON exchange_rates FOR UPDATE
  USING (false); -- Will use service role key

COMMENT ON TABLE exchange_rates IS 'Cached currency exchange rates from external API';
