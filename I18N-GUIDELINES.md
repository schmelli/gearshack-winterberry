# Internationalization (i18n) Guidelines

**Project**: Gearshack Winterberry
**Framework**: next-intl with Next.js App Router
**Supported Locales**: English (en), German (de)
**Last Updated**: 2026-01-04

---

## Overview

This project uses `next-intl` for internationalization. All user-facing strings MUST be translated and stored in the message files.

## File Structure

```
messages/
├── en.json          # English translations (source of truth)
└── de.json          # German translations
```

## Core Principles

### 1. No Hardcoded Strings

**NEVER** use hardcoded strings in components or hooks for:
- Toast messages
- Button labels
- Form labels and placeholders
- Error messages
- Dialog titles and content
- Accessibility labels (aria-label)

```typescript
// ❌ BAD - Hardcoded string
toast.success('Item saved successfully!');

// ✅ GOOD - Using translation
const t = useTranslations('GearEditor.toasts');
toast.success(t('itemSaved'));
```

### 2. No Fallback Patterns

**NEVER** use fallback patterns that bypass translations:

```typescript
// ❌ BAD - Fallback pattern
{t('share') || 'Share'}

// ✅ GOOD - Trust the translation system
{t('share')}
```

### 3. Namespace Organization

Organize translations by feature/component using nested namespaces:

```json
{
  "GearEditor": {
    "tabs": { ... },
    "validation": { ... },
    "toasts": { ... }
  },
  "Wishlist": {
    "actions": { ... },
    "communityAvailability": { ... }
  }
}
```

## Implementation Patterns

### Components

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('MyNamespace');

  return (
    <Button>{t('buttonLabel')}</Button>
  );
}
```

### Hooks

```typescript
import { useTranslations } from 'next-intl';

export function useMyHook() {
  const t = useTranslations('MyNamespace.toasts');

  const handleAction = useCallback(async () => {
    try {
      await doSomething();
      toast.success(t('actionSuccess'));
    } catch {
      toast.error(t('actionFailed'));
    }
  }, [t]);

  return { handleAction };
}
```

### Nested Components with Props

When a component has nested sub-components that need translations, pass labels via props:

```typescript
interface SubComponentProps {
  labels: {
    title: string;
    action: string;
  };
}

function SubComponent({ labels }: SubComponentProps) {
  return <h2>{labels.title}</h2>;
}

function ParentComponent() {
  const t = useTranslations('MyNamespace');

  const labels = {
    title: t('title'),
    action: t('action'),
  };

  return <SubComponent labels={labels} />;
}
```

### ICU Pluralization

Use ICU message format for pluralization:

```json
{
  "matchCount": "{count, plural, one {# match} other {# matches}}"
}
```

```typescript
t('matchCount', { count: 5 }) // "5 matches"
```

### Interpolation

Use placeholders for dynamic values:

```json
{
  "greeting": "Hello, {name}!",
  "movedToInventory": "{name} moved to inventory!"
}
```

```typescript
t('greeting', { name: userName })
t('movedToInventory', { name: itemName })
```

## Known Exceptions

### Zustand Stores

Zustand stores (like `useSupabaseStore.ts`) run outside React's context and cannot use `useTranslations`. These are acceptable exceptions since they represent low-level auth/sync errors:

- `Please sign in to add items`
- `Please sign in to update items`
- `Please sign in to delete items`
- `Please sign in to create loadouts`
- `Failed to save item`
- `Failed to update item`
- `Failed to delete item`
- `Failed to save loadout`
- `Failed to update loadout`
- `Failed to delete loadout`

**Future Enhancement**: Consider implementing a non-React translation service for store-level messages.

## Adding New Translations

1. **Add to English first** (`messages/en.json`) - this is the source of truth
2. **Add German translation** (`messages/de.json`)
3. **Use the translation** in your component/hook
4. **Test both locales** to verify proper rendering

## Quality Checklist

Before committing code with new UI strings:

- [ ] All user-visible strings use `t()` function
- [ ] No fallback patterns (`t('key') || 'fallback'`)
- [ ] Both EN and DE translations exist
- [ ] Dependency arrays include `t` when used in callbacks
- [ ] Interpolated values use ICU format

## Common Translation Keys

| Key Pattern | Example | Use Case |
|------------|---------|----------|
| `*.toasts.success` | `GearEditor.toasts.itemSaved` | Success notifications |
| `*.toasts.error` | `GearEditor.toasts.deleteFailed` | Error notifications |
| `*.validation.*` | `GearEditor.validation.nameRequired` | Form validation errors |
| `*.actions.*` | `Wishlist.actions.addedToWishlist` | User action feedback |
| `Common.*` | `Common.cancel`, `Common.save` | Reusable UI labels |

## Debugging

If a translation key is missing, next-intl will:
1. Show the key name in development
2. Log a warning to the console

Check browser console for missing translation warnings during development.
