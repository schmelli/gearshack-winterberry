# Component Test Inventory

**Generated:** 2024-12-30 (Iteration 1)
**Total Components:** 284 + 17 app components = 301 components
**Already Tested:** 3 components (GearCard, GearEditorForm, WeightDonut)
**Untested Components:** 298 components

## EXISTING TESTS (DO NOT MODIFY)

These 3 tests are the **STYLE REFERENCE** for all new tests:

| Component | Test File | Tests Count | Status |
|-----------|-----------|-------------|--------|
| `GearCard` | `__tests__/unit/components/GearCard.test.tsx` | 30+ tests | COMPLETE |
| `GearEditorForm` | `__tests__/unit/components/GearEditorForm.test.tsx` | 30+ tests | COMPLETE |
| `WeightDonut` | `__tests__/unit/components/WeightDonut.test.tsx` | 20+ tests | COMPLETE |

---

## PRIORITY CLASSIFICATION

### P0 - CRITICAL (First 12 iterations)

Core user-facing components with high interaction frequency:

| # | Component | Path | Tests Needed |
|---|-----------|------|--------------|
| 1 | `SearchBar` | `components/bulletin/SearchBar.tsx` | 5 |
| 2 | `GalleryToolbar` | `components/inventory-gallery/GalleryToolbar.tsx` | 5 |
| 3 | `GalleryGrid` | `components/inventory-gallery/GalleryGrid.tsx` | 5 |
| 4 | `ViewDensityToggle` | `components/inventory-gallery/ViewDensityToggle.tsx` | 5 |
| 5 | `CategoryPlaceholder` | `components/inventory-gallery/CategoryPlaceholder.tsx` | 3 |
| 6 | `LoadoutCard` | `components/loadouts/LoadoutCard.tsx` | 5 |
| 7 | `LoadoutList` | `components/loadouts/LoadoutList.tsx` | 5 |
| 8 | `LoadoutToolbar` | `components/loadouts/LoadoutToolbar.tsx` | 5 |
| 9 | `LoadoutSortFilter` | `components/loadouts/LoadoutSortFilter.tsx` | 5 |
| 10 | `PostCard` | `components/bulletin/PostCard.tsx` | 5 |
| 11 | `PostComposer` | `components/bulletin/PostComposer.tsx` | 5 |
| 12 | `TagFilter` | `components/bulletin/TagFilter.tsx` | 5 |

**P0 Target: 58 tests**

---

### P1 - HIGH PRIORITY (Iterations 13-30)

Key feature components with moderate complexity:

| # | Component | Path | Tests Needed |
|---|-----------|------|--------------|
| 1 | `LoginForm` | `components/auth/LoginForm.tsx` | 5 |
| 2 | `RegistrationForm` | `components/auth/RegistrationForm.tsx` | 5 |
| 3 | `ForgotPasswordForm` | `components/auth/ForgotPasswordForm.tsx` | 4 |
| 4 | `GoogleSignInButton` | `components/auth/GoogleSignInButton.tsx` | 3 |
| 5 | `BackgroundRotator` | `components/auth/BackgroundRotator.tsx` | 3 |
| 6 | `ProfileEditForm` | `components/profile/ProfileEditForm.tsx` | 5 |
| 7 | `ProfileView` | `components/profile/ProfileView.tsx` | 4 |
| 8 | `AvatarUploadInput` | `components/profile/AvatarUploadInput.tsx` | 4 |
| 9 | `AvatarWithFallback` | `components/profile/AvatarWithFallback.tsx` | 3 |
| 10 | `Shell` | `components/layout/Shell.tsx` | 3 |
| 11 | `SiteHeader` | `components/layout/SiteHeader.tsx` | 4 |
| 12 | `SiteFooter` | `components/layout/SiteFooter.tsx` | 3 |
| 13 | `MobileNav` | `components/layout/MobileNav.tsx` | 4 |
| 14 | `UserMenu` | `components/layout/UserMenu.tsx` | 4 |
| 15 | `LanguageSwitcher` | `components/layout/LanguageSwitcher.tsx` | 3 |
| 16 | `ThemeToggle` | `components/theme/ThemeToggle.tsx` | 3 |
| 17 | `MessageBubble` | `components/messaging/MessageBubble.tsx` | 4 |
| 18 | `MessageInput` | `components/messaging/MessageInput.tsx` | 5 |
| 19 | `ConversationList` | `components/messaging/ConversationList.tsx` | 4 |
| 20 | `ConversationView` | `components/messaging/ConversationView.tsx` | 4 |
| 21 | `HeroSection` | `components/landing/HeroSection.tsx` | 3 |
| 22 | `FeatureGrid` | `components/landing/FeatureGrid.tsx` | 3 |
| 23 | `LandingPage` | `components/landing/LandingPage.tsx` | 3 |
| 24 | `NotificationMenu` | `components/notifications/NotificationMenu.tsx` | 4 |
| 25 | `FollowButton` | `components/social/FollowButton.tsx` | 4 |
| 26 | `FriendRequestButton` | `components/social/FriendRequestButton.tsx` | 4 |
| 27 | `FriendsList` | `components/social/FriendsList.tsx` | 4 |
| 28 | `FollowingList` | `components/social/FollowingList.tsx` | 3 |
| 29 | `FriendActivityFeed` | `components/social/FriendActivityFeed.tsx` | 4 |
| 30 | `OnlineStatusIndicator` | `components/social/OnlineStatusIndicator.tsx` | 3 |

**P1 Target: 112 tests**

---

### P2 - MEDIUM PRIORITY (Iterations 31-50)

Supporting components with specific features:

**Gear Editor Sections (8 components):**
- GeneralInfoSection, CategorySpecsSection, MediaSection, StatusSection
- PurchaseSection, WeightSpecsSection, DependenciesSection, ClassificationSection

**Gear Detail (5 components):**
- GearDetailModal, GearDetailContent, ImageGallery, YouTubeCarousel, GearInsightsSection

**Loadout Components (15 components):**
- EnhancedWeightDonut, WeightBar, WeightSummaryTable, ActivityMatrix
- SeasonSelector, LoadoutHeader, LoadoutPicker, LoadoutMetadataDialog
- LoadoutExportMenu, LoadoutShareButton, DeleteLoadoutDialog, SocialShareButtons
- CompareToVipButton, DependencyPromptDialog, ShareManagementDialog

**Bulletin Components (8 components):**
- BulletinBoard, EmptyState, PostSkeleton, ReplyComposer
- ReplyThread, PostMenu, DeleteConfirmDialog, ReportModal

**Wishlist Components (14 components):**
- WishlistToggle, PriceStubIndicator, PriceHistoryStub, MoveToInventoryButton
- PriceTrackingCard, PriceAlertToggle, PriceComparisonView, CommunityAvailabilityPanel
- CommunityAvailabilityCard, PriceResultItem, MatchConfirmationDialog, PersonalOfferBadge
- MerchantSourceBadge, MarkAsPurchasedButton

**Shakedown Components (12 components):**
- ShakedownCard, ShakedownFeed, ShakedownDetail, ShakedownCreator
- ShakedownFilters, FeedbackSection, FeedbackItem, BookmarkButton
- HelpfulButton, ExpertBadge, ExpertsSection, ItemFeedbackModal

**P2 Target: ~120 tests (2 tests per component)**

---

### P3 - LOW PRIORITY (Iterations 51-65)

**UI Base Components (35 components - shadcn/ui):**
- accordion, alert-dialog, alert, aspect-ratio, avatar, badge, button, card
- carousel, checkbox, collapsible, dialog, dropdown-menu, form, hover-card
- input, label, navigation-menu, popover, progress, radio-group, scroll-area
- select, separator, sheet, skeleton, slider, switch, table, tabs
- textarea, toggle-badge, toggle, tooltip, visually-hidden

**Admin Components (11 components):**
- AdminNav, AdminMerchantList, AdminMerchantDetail, CategoryTree
- CategoryEditDialog, CategoryDeleteDialog, VipAdminDashboard, VipAdminList
- VipFormDialog, VipArchiveDialog, ClaimInvitationForm

**Merchant Components (18 components):**
- MerchantDashboard, MerchantApplicationForm, MerchantBadge, MerchantErrorBoundary
- MerchantLoadoutCard, MerchantLoadoutDetail, MerchantLoadoutGrid, ConversionDashboard
- BillingOverview, WishlistInsightsPanel, WishlistInsightDetail, OfferCreationForm
- LoadoutComparisonModal, LoadoutComparisonTable, LocationConsentDialog
- LoadoutCreationWizard, wizard/LoadoutBasicsStep, wizard/LoadoutItemsStep
- wizard/LoadoutPricingStep, wizard/LoadoutAvailabilityStep

**VIP Components (17 components):**
- VipLoadoutCard, VipLoadoutDetail, VipProfileCard, VipProfileHeader
- VipDirectoryContent, VipSearchInput, VipSearchResults, VipCompareContent
- VipComparisonView, VipBookmarkButton, VipClaimContent, VipLoadoutContent
- VipProfileContent, VipSourceAttribution, UserLoadoutSelector, VipLoadoutSelector
- FeaturedVipsSection, SavedVipLoadoutsSection

**AI Assistant Components (14 components):**
- AIAssistantButton, AIAssistantModal, ChatInterface, ChatInput
- MessageList, MessageBubble, ActionButtons, InlineGearCard
- CategoryBreakdownCard, CommunityOfferCard, VoiceInputButton
- VoiceRecordingIndicator, AudioPlaybackControls, UpgradeModal

**Price Tracking Components (3 components):**
- PriceHistoryChart, PriceResultCard, PriceTrackingSection

**Settings Components (2 components):**
- AlertPreferencesForm, PrivacySettingsForm

**Offer Components (3 components):**
- OfferCard, OfferDetailSheet, OfferResponseActions

**Loadout Hero Image Components (6 components):**
- LoadoutHeroImageSection, image-generation-button, generated-image-preview
- image-history-selector, fallback-image-placeholder, style-preferences-form

**Auth/Provider Components (4 components):**
- ProtectedRoute, AdminRoute, SupabaseAuthProvider, PendingImportHandler

**Misc Components (10+ components):**
- StatusBadge (multiple), SyncIndicator, SpecIcon, LinkedContentPreview
- ModerationPanel, Various Error Boundaries

**P3 Target: ~100 tests (1 test per component)**

---

## PROGRESS TRACKING

| Phase | Status | Tests Written | Target |
|-------|--------|---------------|--------|
| P0 Critical | NOT STARTED | 0 | 58 |
| P1 High | NOT STARTED | 0 | 112 |
| P2 Medium | NOT STARTED | 0 | 120 |
| P3 Low | NOT STARTED | 0 | 100 |
| **TOTAL** | **IN PROGRESS** | **0** | **390** |

---

## TEST FILE NAMING CONVENTION

Following existing pattern:
```
__tests__/unit/components/{ComponentName}.test.tsx
```

## TEST STRUCTURE TEMPLATE

```typescript
/**
 * {ComponentName} Component Tests
 *
 * Tests for the {ComponentName} component used in {feature area}.
 * {Brief description of test coverage}
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/{path}/ComponentName';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ... additional mocks

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockData = () => ({ ... });

// =============================================================================
// Tests
// =============================================================================

describe('ComponentName', () => {
  describe('Rendering', () => { ... });
  describe('Interactions', () => { ... });
  describe('States', () => { ... });
  describe('Accessibility', () => { ... });
  describe('Edge Cases', () => { ... });
});
```

---

## ITERATION LOG

| Iteration | Date | Components Tested | Tests Added | Cumulative |
|-----------|------|-------------------|-------------|------------|
| 1 | 2024-12-30 | Inventory created | 0 | 0 |
| 2 | - | - | - | - |
| ... | - | - | - | - |
