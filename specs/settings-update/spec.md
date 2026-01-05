# Settings Update - Professional Settings Menu

## Feature Overview

Transform the current minimal settings page into a comprehensive, professional settings experience worthy of a premium €9.99/month outdoor gear management application. This feature introduces user preferences for units, currency, language, notifications, and more.

## Business Context

A premium subscription app must provide users with granular control over their experience. The current settings page only offers theme toggle and privacy settings. Users expect to customize:
- How weights and dimensions are displayed (metric vs imperial)
- Their preferred currency with automatic conversion
- App language (moving from header to settings)
- Notification preferences
- Data and privacy controls

## Current State Analysis

### Existing Settings
| Setting | Location | Storage |
|---------|----------|---------|
| Theme (Light/Dark) | `/settings` | localStorage (next-themes) |
| Social Privacy | `/settings/privacy` | Supabase `profiles` table |
| Messaging Privacy | `/settings/privacy` | Supabase `profiles` table |
| Alert Preferences | `/settings/alerts` | API endpoint |
| Language | Header (EN\|DE toggle) | URL-based (next-intl) |

### Current Database Fields (profiles table)
```sql
-- Privacy/messaging
messaging_privacy, online_status_privacy, discoverable, read_receipts_enabled
-- User info
display_name, trail_name, bio, avatar_url, location_name, latitude, longitude
-- Social links
instagram, facebook, youtube, website
-- Account
subscription_tier, account_type, role
```

### Gap Analysis
- No user-level unit preferences (weight, distance, temperature)
- No currency preference (currently per-item only)
- No locale/language preference stored in profile
- No date/time format preference
- Language selector in header, not in settings
- No account management (password change, email, delete account)
- No data export/import options

---

## Proposed Settings Architecture

### Settings Sections

```
/settings
├── /appearance          # Theme, display density, animations
├── /regional            # Language, units, currency, date/time formats
├── /notifications       # Push, email, in-app notification preferences
├── /privacy             # Social, messaging, data sharing (existing)
├── /account             # Email, password, subscription, delete account
└── /data                # Export, import, sync status
```

### 1. Appearance Settings (`/settings` or `/settings/appearance`)

| Setting | Options | Default | Storage |
|---------|---------|---------|---------|
| Theme | Light / Dark / System | Light | localStorage |
| Display Density | Comfortable / Compact | Comfortable | Supabase |
| Reduce Animations | On / Off | Off | Supabase |
| Show Weight Breakdown | On / Off | On | Supabase |

### 2. Regional Settings (`/settings/regional`) - **NEW**

#### 2.1 Language
| Setting | Options | Default | Storage |
|---------|---------|---------|---------|
| App Language | English (EN), Deutsch (DE), + future locales | Browser default | Supabase + Cookie |

**Implementation Notes:**
- Move language selector from header to settings
- Store preference in `profiles.preferred_locale`
- On load, check: 1) profile preference, 2) cookie, 3) browser locale
- Header shows current language flag/code (read-only indicator)

#### 2.2 Units System
| Setting | Options | Default | Storage |
|---------|---------|---------|---------|
| Unit System | Metric / Imperial / Custom | Metric | Supabase |
| Weight Unit | g / kg / oz / lb | g (Metric), oz (Imperial) | Supabase |
| Distance Unit | km / mi | km (Metric), mi (Imperial) | Supabase |
| Temperature | °C / °F | °C (Metric), °F (Imperial) | Supabase |
| Dimensions | cm / in | cm (Metric), in (Imperial) | Supabase |

**UX Pattern:**
- Selecting "Metric" auto-sets: g, km, °C, cm
- Selecting "Imperial" auto-sets: oz, mi, °F, in
- Selecting "Custom" allows individual selection
- Individual changes auto-switch to "Custom"

#### 2.3 Currency & Pricing
| Setting | Options | Default | Storage |
|---------|---------|---------|---------|
| Display Currency | EUR, USD, GBP, CHF, CAD, AUD, JPY, etc. | EUR | Supabase |
| Currency Position | Before (€50) / After (50€) | Regional default | Supabase |
| Show Original Price | On / Off | On | Supabase |
| Auto-Convert Prices | On / Off | On | Supabase |

**Implementation Notes:**
- Use a reliable exchange rate API (Open Exchange Rates, Fixer.io, or ECB rates)
- Cache rates for 24 hours
- When `show_original_price` is on, display: "€45.00 (~$49.50)"
- Historical prices stored in original currency; conversion is display-only

#### 2.4 Date & Time Format
| Setting | Options | Default | Storage |
|---------|---------|---------|---------|
| Date Format | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD | Regional | Supabase |
| Time Format | 12-hour / 24-hour | Regional | Supabase |
| Week Starts On | Sunday / Monday | Monday | Supabase |
| Timezone | Auto-detect / Manual selection | Auto | Supabase |

### 3. Notification Settings (`/settings/notifications`)

Consolidate all notification preferences:

| Category | Push | Email | In-App | Default |
|----------|------|-------|--------|---------|
| Price Alerts | ✓ | ✓ | ✓ | All On |
| Friend Activity | ✓ | - | ✓ | All On |
| Messages | ✓ | ✓ | ✓ | All On |
| Community Updates | - | ✓ | ✓ | Email Off |
| Product Updates | - | ✓ | - | On |
| Marketing | - | ✓ | - | Off |

Additional Settings:
| Setting | Options | Default |
|---------|---------|---------|
| Quiet Hours | Time range picker | Off |
| Notification Sound | On / Off | On |
| Badge Count | On / Off | On |

### 4. Privacy Settings (`/settings/privacy`) - EXISTING + ENHANCEMENTS

Keep existing structure, add:
| Setting | Options | Default |
|---------|---------|---------|
| Profile Visibility | Public / Friends / Private | Friends |
| Show Online Status | Everyone / Friends / Nobody | Friends |
| Allow Loadout Sharing | On / Off | On |
| Search Engine Indexing | On / Off | Off |

### 5. Account Settings (`/settings/account`) - **NEW**

| Setting | Action |
|---------|--------|
| Email | View current, change with verification |
| Password | Change (requires current password) |
| Two-Factor Auth | Enable/Disable (future) |
| Subscription | View plan, manage, cancel |
| Connected Accounts | Google, Apple sign-in status |
| Delete Account | Permanent deletion with confirmation |

### 6. Data & Sync Settings (`/settings/data`) - **NEW**

| Setting | Action |
|---------|--------|
| Export Data | Download all data as JSON/CSV |
| Import Data | Bulk import gear items |
| Sync Status | Last sync time, force sync |
| Clear Local Cache | Clear cached data |
| Storage Used | Show Cloudinary/Supabase usage |

---

## Database Schema Changes

### New Columns for `profiles` table

```sql
-- Migration: Add user preferences to profiles
-- Feature: settings-update

-- Regional Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_locale TEXT DEFAULT 'en';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  unit_system TEXT DEFAULT 'metric'
  CHECK (unit_system IN ('metric', 'imperial', 'custom'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_weight_unit TEXT DEFAULT 'g'
  CHECK (preferred_weight_unit IN ('g', 'kg', 'oz', 'lb'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_distance_unit TEXT DEFAULT 'km'
  CHECK (preferred_distance_unit IN ('km', 'mi'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_temperature_unit TEXT DEFAULT 'C'
  CHECK (preferred_temperature_unit IN ('C', 'F'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_dimension_unit TEXT DEFAULT 'cm'
  CHECK (preferred_dimension_unit IN ('cm', 'in'));

-- Currency Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_currency TEXT DEFAULT 'EUR';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  currency_position TEXT DEFAULT 'before'
  CHECK (currency_position IN ('before', 'after'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  show_original_price BOOLEAN DEFAULT true;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  auto_convert_prices BOOLEAN DEFAULT true;

-- Date/Time Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  date_format TEXT DEFAULT 'DD/MM/YYYY'
  CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  time_format TEXT DEFAULT '24h'
  CHECK (time_format IN ('12h', '24h'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  week_starts_on TEXT DEFAULT 'monday'
  CHECK (week_starts_on IN ('sunday', 'monday'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  timezone TEXT DEFAULT 'UTC';

-- Display Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  display_density TEXT DEFAULT 'comfortable'
  CHECK (display_density IN ('comfortable', 'compact'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  reduce_animations BOOLEAN DEFAULT false;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  show_weight_breakdown BOOLEAN DEFAULT true;

-- Notification Preferences (JSONB for flexibility)
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
  }';

-- Comments
COMMENT ON COLUMN profiles.preferred_locale IS 'User preferred language (en, de, etc.)';
COMMENT ON COLUMN profiles.unit_system IS 'Metric, Imperial, or Custom unit system';
COMMENT ON COLUMN profiles.preferred_currency IS 'ISO 4217 currency code for price display';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSONB object for all notification settings';
```

### New Table: Exchange Rates Cache

```sql
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  rates JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_exchange_rates_expires ON exchange_rates(expires_at);

-- RLS: Public read access
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select_all"
  ON exchange_rates FOR SELECT
  USING (true);
```

---

## UI/UX Design

### Settings Navigation Pattern

**Desktop (>1024px):**
```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                │
├────────────────┬────────────────────────────────────────┤
│                │                                        │
│ ☀️ Appearance  │   [Selected Section Content]           │
│ 🌍 Regional    │                                        │
│ 🔔 Notifications│                                       │
│ 🔒 Privacy     │                                        │
│ 👤 Account     │                                        │
│ 📦 Data & Sync │                                        │
│                │                                        │
└────────────────┴────────────────────────────────────────┘
```

**Mobile (<1024px):**
```
┌─────────────────────────┐
│ Settings                │
├─────────────────────────┤
│ ☀️ Appearance        >  │
│ 🌍 Regional          >  │
│ 🔔 Notifications     >  │
│ 🔒 Privacy           >  │
│ 👤 Account           >  │
│ 📦 Data & Sync       >  │
└─────────────────────────┘
```

### Component Patterns

1. **Switch Toggle** - Boolean settings (dark mode, animations)
2. **Radio Group** - Mutually exclusive options (unit system)
3. **Select Dropdown** - Long lists (timezone, currency)
4. **Segmented Control** - 2-3 options (12h/24h, before/after)
5. **Time Range Picker** - Quiet hours

### Visual Hierarchy

Each settings section uses:
```tsx
<Card>
  <CardHeader>
    <CardTitle>{section.title}</CardTitle>
    <CardDescription>{section.description}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Settings items */}
  </CardContent>
</Card>
```

Individual settings use consistent layout:
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>{setting.label}</Label>
    <p className="text-sm text-muted-foreground">{setting.description}</p>
  </div>
  <Control /> {/* Switch, Select, etc. */}
</div>
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Database migration for new profile columns
2. Create types/interfaces for all settings
3. Create `useUserPreferences` hook for reading/writing preferences
4. Implement settings navigation layout (desktop sidebar, mobile list)
5. Move existing Appearance settings to new structure

### Phase 2: Regional Settings (Week 2)
1. Implement Language settings with preference storage
2. Remove language switcher from header (show read-only indicator)
3. Implement Unit System settings with smart defaults
4. Create unit conversion utility functions
5. Update all weight/distance displays to use preferences

### Phase 3: Currency (Week 2-3)
1. Set up exchange rate API integration
2. Create exchange rate caching system
3. Implement Currency settings UI
4. Create `useCurrencyFormat` hook
5. Update all price displays to use preferences

### Phase 4: Date/Time & Display (Week 3)
1. Implement Date/Time format settings
2. Create `useDateFormat` hook
3. Implement Display preferences (density, animations)
4. Update all date displays throughout app

### Phase 5: Notifications Consolidation (Week 3-4)
1. Consolidate existing alert preferences
2. Add new notification categories
3. Implement Quiet Hours feature
4. Create unified notification settings UI

### Phase 6: Account & Data (Week 4)
1. Implement Account settings (email change, password)
2. Create data export functionality (JSON/CSV)
3. Implement import capability
4. Add sync status display
5. Add delete account flow

### Phase 7: Polish & Testing (Week 5)
1. Add i18n for all new settings strings
2. Comprehensive testing
3. Performance optimization
4. Accessibility audit
5. Documentation

---

## File Structure

```
app/[locale]/settings/
├── page.tsx                    # Settings home (shows Appearance inline)
├── layout.tsx                  # Settings layout with navigation
├── regional/
│   └── page.tsx               # Language, Units, Currency, Date/Time
├── notifications/
│   └── page.tsx               # All notification preferences
├── privacy/
│   └── page.tsx               # Existing + enhancements
├── account/
│   └── page.tsx               # Email, password, subscription
└── data/
    └── page.tsx               # Export, import, sync

components/settings/
├── SettingsNav.tsx            # Sidebar/list navigation
├── SettingsSection.tsx        # Reusable section wrapper
├── SettingItem.tsx            # Individual setting row
├── UnitSystemSelector.tsx     # Smart unit selection
├── CurrencySelector.tsx       # Currency dropdown with symbols
├── TimezoneSelector.tsx       # Searchable timezone picker
├── NotificationMatrix.tsx     # Push/Email/In-app matrix
├── QuietHoursPicker.tsx       # Time range selector
├── ExportDataButton.tsx       # Data export with format choice
└── DeleteAccountDialog.tsx    # Confirmation flow

hooks/
├── settings/
│   ├── useUserPreferences.ts  # Main preferences hook
│   ├── useUnitConversion.ts   # Convert values between units
│   ├── useCurrencyFormat.ts   # Format prices with conversion
│   ├── useDateFormat.ts       # Format dates per preference
│   └── useExchangeRates.ts    # Fetch and cache exchange rates

lib/
├── units.ts                   # Unit conversion utilities
├── currency.ts                # Currency formatting utilities
├── date-formats.ts            # Date formatting utilities
└── exchange-rates.ts          # Exchange rate API client

types/
└── settings.ts                # All settings-related types
```

---

## API Routes

```
/api/settings/
├── preferences/               # GET/PATCH user preferences
├── exchange-rates/            # GET cached exchange rates
├── export/                    # POST generate export file
├── import/                    # POST import data
└── account/
    ├── email/                 # PATCH change email
    ├── password/              # PATCH change password
    └── delete/                # DELETE account
```

---

## Supported Currencies (Initial)

| Code | Symbol | Name |
|------|--------|------|
| EUR | € | Euro |
| USD | $ | US Dollar |
| GBP | £ | British Pound |
| CHF | Fr. | Swiss Franc |
| CAD | C$ | Canadian Dollar |
| AUD | A$ | Australian Dollar |
| JPY | ¥ | Japanese Yen |
| SEK | kr | Swedish Krona |
| NOK | kr | Norwegian Krone |
| DKK | kr | Danish Krone |
| PLN | zł | Polish Złoty |
| CZK | Kč | Czech Koruna |

---

## Success Metrics

1. **Settings Completion Rate**: % of users who configure at least 3 preferences
2. **Regional Settings Adoption**: % of users using non-default units/currency
3. **Notification Opt-in Rate**: % enabling vs disabling notifications
4. **Data Export Usage**: Number of data exports per month
5. **Account Deletion Rate**: Monitor as health indicator

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Exchange rate API downtime | Prices show without conversion | Cache rates for 48h, fallback to last known |
| User confusion with unit changes | Support burden | Clear explanation, "Reset to Default" button |
| Data export file too large | Timeout, memory issues | Paginated export, background job for large datasets |
| Account deletion legal requirements | GDPR compliance | 30-day grace period, complete data purge |

---

## Dependencies

- Exchange Rate API (Open Exchange Rates or similar)
- Email service for verification (existing)
- Background job system for large exports (optional)

---

## Open Questions

1. Should we support more locales beyond EN/DE initially?
2. What exchange rate API should we use? (Cost considerations)
3. Should data export include images or just metadata?
4. Do we need two-factor authentication for Phase 1?

---

## Appendix: Competitor Analysis

| App | Settings Quality | Notable Features |
|-----|------------------|------------------|
| Lighterpack | Basic | No currency, imperial/metric only |
| Caltopo | Excellent | Full unit customization, export options |
| AllTrails | Good | Regional settings, offline maps |
| Strava | Excellent | Comprehensive notifications, privacy granularity |

Gearshack should match or exceed Strava's settings experience for a premium app.
