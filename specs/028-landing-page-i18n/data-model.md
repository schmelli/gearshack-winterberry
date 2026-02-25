# Data Model: Landing Page & i18n Strings

**Feature**: 028-landing-page-i18n
**Date**: 2025-12-07

## Overview

This feature is primarily UI-focused with minimal data modeling. The main entities are TypeScript interfaces for component props and translation structure.

## Entities

### FeatureItem

Represents a single feature benefit displayed in the FeatureGrid.

```typescript
// types/landing.ts

import type { LucideIcon } from 'lucide-react';

export interface FeatureItem {
  /** Translation key for feature title (e.g., "features.organize") */
  titleKey: string;
  /** Translation key for feature description */
  descriptionKey: string;
  /** Lucide icon component to display */
  icon: LucideIcon;
}
```

**Usage**: Array of 3 items passed to FeatureGrid component.

### PricingTier

Represents a pricing tier displayed in PricingPreview.

```typescript
// types/landing.ts

export interface PricingTier {
  /** Tier identifier (e.g., "basecamp", "trailblazer") */
  id: string;
  /** Translation key for tier name */
  nameKey: string;
  /** Translation key for price display */
  priceKey: string;
  /** Translation key for tier description */
  descriptionKey: string;
  /** List of feature translation keys included in tier */
  featureKeys: string[];
  /** Whether this tier is highlighted/recommended */
  highlighted?: boolean;
}
```

**Usage**: Array of 2 tiers passed to PricingPreview component.

### Testimonial

Represents a customer testimonial in SocialProof section.

```typescript
// types/landing.ts

export interface Testimonial {
  /** Translation key for quote text */
  quoteKey: string;
  /** Translation key for author name and title */
  authorKey: string;
  /** Avatar image URL (optional placeholder) */
  avatarUrl?: string;
}
```

**Usage**: Array of testimonials passed to SocialProof component.

## Translation Structure

### Landing Namespace

```typescript
interface LandingMessages {
  // Hero Section (FR-001)
  heroTitle: string;           // "Organize Your Gear. Conquer the Trail."
  heroSubtitle: string;        // "The ultimate gear management platform..."
  ctaStartTrial: string;       // "Start Free Trial"
  ctaDashboard: string;        // "Go to Dashboard"

  // Feature Grid (FR-002)
  features: {
    organize: {
      title: string;           // "Organize Everything"
      description: string;     // "Catalog all your gear..."
    };
    loadouts: {
      title: string;           // "Build Smart Loadouts"
      description: string;     // "Create weight-optimized packing lists..."
    };
    share: {
      title: string;           // "Share & Discover"
      description: string;     // "Join a community of outdoor enthusiasts..."
    };
  };

  // Social Proof (FR-003)
  socialProof: {
    title: string;             // "Trusted by Outdoor Enthusiasts"
    testimonials: {
      [key: string]: {
        quote: string;
        author: string;
      };
    };
  };

  // Pricing Preview (FR-004)
  pricing: {
    title: string;             // "Simple, Honest Pricing"
    tiers: {
      basecamp: {
        name: string;          // "Basecamp"
        price: string;         // "Free"
        description: string;   // "Perfect for getting started"
        features: string[];    // ["Up to 50 items", "3 loadouts", ...]
      };
      trailblazer: {
        name: string;          // "Trailblazer"
        price: string;         // "$9/month"
        description: string;   // "For serious gear enthusiasts"
        features: string[];    // ["Unlimited items", "Unlimited loadouts", ...]
      };
    };
  };
}
```

### Auth Namespace (FR-009)

```typescript
interface AuthMessages {
  // Form Labels
  emailLabel: string;          // "Email"
  passwordLabel: string;       // "Password"
  displayNameLabel: string;    // "Display Name"

  // Buttons
  loginButton: string;         // "Log In"
  registerButton: string;      // "Create Account"
  forgotPassword: string;      // "Forgot Password?"

  // Messages
  loginTitle: string;          // "Welcome Back"
  registerTitle: string;       // "Create Your Account"
  loginSubtitle: string;       // "Sign in to access your gear inventory"

  // Errors
  invalidEmail: string;        // "Please enter a valid email"
  invalidPassword: string;     // "Password must be at least 8 characters"
  loginFailed: string;         // "Login failed. Please check your credentials."
}
```

### Inventory Namespace (FR-010)

```typescript
interface InventoryMessages {
  // Page Title
  title: string;               // "My Inventory"

  // Search & Filters
  searchPlaceholder: string;   // "Search gear..."
  filterCategory: string;      // "Category"
  filterAll: string;           // "All Categories"
  sortBy: string;              // "Sort by"

  // Empty State
  emptyTitle: string;          // "No Gear Yet"
  emptyDescription: string;    // "Start building your inventory..."
  addFirstItem: string;        // "Add Your First Item"

  // Actions
  addItem: string;             // "Add Item"
  editItem: string;            // "Edit"
  deleteItem: string;          // "Delete"
  viewDetails: string;         // "View Details"
}
```

### GearEditor Namespace (FR-011)

```typescript
interface GearEditorMessages {
  // Dialog Titles
  addTitle: string;            // "Add New Gear"
  editTitle: string;           // "Edit Gear"

  // Form Sections
  generalInfo: string;         // "General Information"
  specifications: string;      // "Specifications"
  images: string;              // "Images"

  // Field Labels
  nameLabel: string;           // "Name"
  brandLabel: string;          // "Brand"
  categoryLabel: string;       // "Category"
  weightLabel: string;         // "Weight"
  priceLabel: string;          // "Price"
  descriptionLabel: string;    // "Description"

  // Validation
  nameRequired: string;        // "Name is required"
  weightInvalid: string;       // "Please enter a valid weight"

  // Actions
  saveItem: string;            // "Save Item"
  discardChanges: string;      // "Discard Changes"
}
```

## Relationships

```
LandingPage (component)
├── uses → FeatureItem[] (3 items)
├── uses → PricingTier[] (2 tiers)
├── uses → Testimonial[] (placeholder content)
└── consumes → AuthContext (for CTA switching)

messages/en.json
├── extends → Navigation (existing)
├── extends → Hero (existing)
├── extends → Common (existing)
├── adds → Landing (new)
├── adds → Auth (new)
├── adds → Inventory (new)
└── adds → GearEditor (new)

global.d.ts
└── auto-extends → IntlMessages (via typeof en import)
```

## State Transitions

N/A - Landing page is stateless. Authentication state managed by existing AuthProvider.

## Validation Rules

N/A - No user input on landing page. Auth and GearEditor validation remains in existing Zod schemas.
