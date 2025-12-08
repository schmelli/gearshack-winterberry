/**
 * Landing Page Type Definitions
 *
 * Feature: 028-landing-page-i18n
 * T001: TypeScript interfaces for landing page components
 */

import type { LucideIcon } from 'lucide-react';

/**
 * Represents a single feature benefit displayed in the FeatureGrid.
 */
export interface FeatureItem {
  /** Translation key for feature title (e.g., "features.organize.title") */
  titleKey: string;
  /** Translation key for feature description */
  descriptionKey: string;
  /** Lucide icon component to display */
  icon: LucideIcon;
}

/**
 * Represents a pricing tier displayed in PricingPreview.
 */
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

/**
 * Represents a customer testimonial in SocialProof section.
 */
export interface Testimonial {
  /** Translation key for quote text */
  quoteKey: string;
  /** Translation key for author name and title */
  authorKey: string;
  /** Avatar image URL (optional placeholder) */
  avatarUrl?: string;
}
