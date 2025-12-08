# Quickstart: Landing Page & i18n Strings

**Feature**: 028-landing-page-i18n
**Prerequisites**: Feature 027 (i18n with next-intl) must be complete

## Quick Reference

### Key Files to Create

| File | Purpose |
|------|---------|
| `components/landing/HeroSection.tsx` | Hero with headline, subtitle, CTA |
| `components/landing/FeatureGrid.tsx` | 3 product benefits with icons |
| `components/landing/SocialProof.tsx` | Testimonials and trust indicators |
| `components/landing/PricingPreview.tsx` | Tier comparison cards |
| `components/landing/LandingPage.tsx` | Orchestrates sections, handles auth |
| `types/landing.ts` | TypeScript interfaces |

### Key Files to Modify

| File | Changes |
|------|---------|
| `app/[locale]/page.tsx` | Replace Next.js default with LandingPage |
| `messages/en.json` | Add Landing, Auth, Inventory, GearEditor namespaces |
| `messages/de.json` | Add German translations for new namespaces |

## Implementation Steps

### Step 1: Create Types

```typescript
// types/landing.ts
import type { LucideIcon } from 'lucide-react';

export interface FeatureItem {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

export interface PricingTier {
  id: string;
  nameKey: string;
  priceKey: string;
  descriptionKey: string;
  featureKeys: string[];
  highlighted?: boolean;
}

export interface Testimonial {
  quoteKey: string;
  authorKey: string;
  avatarUrl?: string;
}
```

### Step 2: Extend Translation Files

```json
// messages/en.json - add to existing file
{
  "Landing": {
    "heroTitle": "Organize Your Gear. Conquer the Trail.",
    "heroSubtitle": "The ultimate gear management platform for outdoor enthusiasts.",
    "ctaStartTrial": "Start Free Trial",
    "ctaDashboard": "Go to Dashboard",
    "features": {
      "organize": {
        "title": "Organize Everything",
        "description": "Catalog all your gear with detailed specs, weights, and images."
      },
      "loadouts": {
        "title": "Build Smart Loadouts",
        "description": "Create weight-optimized packing lists for any adventure."
      },
      "share": {
        "title": "Share & Discover",
        "description": "Join a community of outdoor enthusiasts."
      }
    },
    "socialProof": {
      "title": "Trusted by Outdoor Enthusiasts",
      "testimonial1": {
        "quote": "GearGraph changed how I organize my hiking gear. No more forgotten items!",
        "author": "Alex M., Thru-Hiker"
      }
    },
    "pricing": {
      "title": "Simple, Honest Pricing",
      "basecamp": {
        "name": "Basecamp",
        "price": "Free",
        "description": "Perfect for getting started"
      },
      "trailblazer": {
        "name": "Trailblazer",
        "price": "$9/month",
        "description": "For serious gear enthusiasts"
      }
    }
  },
  "Auth": {
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "loginButton": "Log In",
    "registerButton": "Create Account",
    "loginTitle": "Welcome Back"
  },
  "Inventory": {
    "title": "My Inventory",
    "searchPlaceholder": "Search gear...",
    "emptyTitle": "No Gear Yet",
    "addItem": "Add Item"
  },
  "GearEditor": {
    "addTitle": "Add New Gear",
    "editTitle": "Edit Gear",
    "nameLabel": "Name",
    "brandLabel": "Brand",
    "saveItem": "Save Item"
  }
}
```

### Step 3: Create HeroSection Component

```typescript
// components/landing/HeroSection.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export function HeroSection({ title, subtitle, ctaLabel, ctaHref }: HeroSectionProps) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center bg-[#405A3D] px-4 py-20 text-center text-white">
      <h1 className="mb-4 max-w-3xl font-[family-name:var(--font-rock-salt)] text-3xl md:text-5xl">
        {title}
      </h1>
      <p className="mb-8 max-w-xl text-lg text-white/80">
        {subtitle}
      </p>
      <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </section>
  );
}
```

### Step 4: Create LandingPage Orchestrator

```typescript
// components/landing/LandingPage.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { HeroSection } from './HeroSection';
import { FeatureGrid } from './FeatureGrid';
import { SocialProof } from './SocialProof';
import { PricingPreview } from './PricingPreview';

export function LandingPage() {
  const t = useTranslations('Landing');
  const { user } = useAuthContext();

  // FR-005/FR-006: Different CTAs based on auth state
  const ctaLabel = user ? t('ctaDashboard') : t('ctaStartTrial');
  const ctaHref = user ? '/inventory' : '/login';

  return (
    <main className="min-h-screen">
      <HeroSection
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
      />
      <FeatureGrid t={t} />
      <SocialProof t={t} />
      <PricingPreview t={t} />
    </main>
  );
}
```

### Step 5: Update page.tsx

```typescript
// app/[locale]/page.tsx
import { LandingPage } from '@/components/landing/LandingPage';

export default function Home() {
  return <LandingPage />;
}
```

## Deep Forest Theme Colors

```css
/* Primary background */
bg-[#405A3D]

/* Emerald accents */
bg-emerald-500 hover:bg-emerald-600  /* CTA buttons */
text-emerald-400                      /* Accent text */
border-emerald-500                    /* Highlighted tier */
```

## Common Patterns

### Translation with Namespace

```typescript
const t = useTranslations('Landing');
// Access: t('heroTitle'), t('features.organize.title')
```

### Auth-Conditional Rendering

```typescript
const { user } = useAuthContext();
const isAuthenticated = !!user;
```

### Responsive Grid

```typescript
<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
  {/* 1 column mobile, 3 columns desktop */}
</div>
```

## Validation Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Landing page shows at `/en/` and `/de/`
- [ ] CTA shows "Start Free Trial" when logged out
- [ ] CTA shows "Go to Dashboard" when logged in
- [ ] All text switches when language is toggled
