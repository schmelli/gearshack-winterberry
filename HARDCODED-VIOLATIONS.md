# Hardcoded Text Violations Report

**Scan Date**: 2026-01-04
**Last Updated**: 2026-01-04
**Status**: ✅ COMPLETE (95%+ Compliance)

## Summary Statistics

- **Components with violations**: 0 files (all fixed)
- **Hooks with violations**: 0 files (zustand exceptions documented)
- **Files already compliant**: ~185 files using t() properly

---

## FIXED COMPONENTS (This Session)

### 1. `components/loadouts/VirtualGearShakedown.tsx` - FIXED
All toast messages and UI strings now use translations.

### 2. `components/profile/ProfileEditForm.tsx` - FIXED
All form labels, placeholders, and toast messages use translations.

### 3. `components/loadouts/SocialShareButtons.tsx` - FIXED
- Removed fallback patterns
- Added missing `copied` translation key
- All toast messages use translations

### 4. `components/notifications/NotificationMenu.tsx` - FIXED
- Created new `Notifications` namespace
- All toast messages use translations
- All UI strings (title, unread, accept, dismiss) use translations

### 5. `components/vip/VipCompareContent.tsx` - FIXED
- Added missing translations: signIn, createLoadout, selectDescription, addedToWishlist, compareFailed
- All hardcoded strings now use translations

### 6. `components/wishlist/CommunityAvailabilityPanel.tsx` - FIXED
- Added 16 new translation keys for badges, states, and actions
- Refactored nested components to receive translations via props
- All UI strings (For Sale, Lendable, View Item, Message, etc.) use translations

---

## FIXED HOOKS (This Session)

### 1. `hooks/useWishlist.ts` - ALREADY COMPLIANT
Was using translations correctly via `Wishlist.actions` namespace.

### 2. `hooks/useGearEditor.ts` - FIXED
- Added `GearEditor.toasts` namespace with 9 keys
- All toast messages now use translations:
  - importingImage, imageImportSuccess, imageImportFailed
  - itemUpdated, addedToWishlist, itemSaved
  - fixErrors, itemDeleted, deleteFailed

### 3. `hooks/useShareManagement.ts` - FIXED
- Added `Shakedown.toasts` namespace with 11 keys
- All toast messages now use translations:
  - mustBeLoggedIn, createFailed, created
  - updateFailed, updated, deleteFailed, deleted
  - passwordSetFailed, passwordSet, passwordRemoveFailed, passwordRemoved

---

## ADMIN COMPONENTS - ALREADY COMPLIANT

### 1. `components/admin/CategoryDeleteDialog.tsx`
Uses `Admin.categories` namespace properly.

### 2. `components/admin/CategoryEditDialog.tsx`
Uses `Admin.categories` namespace properly.

---

## KNOWN EXCEPTIONS

### Zustand Store (`hooks/useSupabaseStore.ts`)
Contains 10 hardcoded messages that cannot use React hooks:
- `Please sign in to add/update/delete items`
- `Please sign in to create loadouts`
- `Failed to save/update/delete item`
- `Failed to save/update/delete loadout`

**Reason**: Zustand stores run outside React context, making `useTranslations` unavailable.

**Future Enhancement**: Consider non-React translation service for v2.

---

## Documentation Created

1. ✅ **I18N-GUIDELINES.md** - Developer guidelines for i18n compliance
2. ✅ **FINAL-I18N-REPORT.md** - Complete compliance report

---

## Compliance Status: COMPLETE

All actionable violations have been fixed. Remaining exceptions are documented and architecturally justified.
