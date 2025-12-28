/**
 * Spec Icon Component
 *
 * Feature: Issue #22 - Gearcard improvements with icons
 *
 * Displays icons for gear specifications and attributes.
 * Uses SVG icons from /public/icons folder.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type SpecIconType =
  | 'weight'
  | 'dimensions'
  | 'model'
  | 'condition'
  | 'status'
  | 'favourite'
  | 'sale'
  | 'borrow'
  | 'trade'
  | 'light'
  | 'ultralight'
  | 'comfort'
  | 'wishlist'
  | 'ai'
  | 'category'
  // Additional spec types for gear details
  | 'size'
  | 'color'
  | 'volume'
  | 'materials'
  | 'construction'
  | 'quantity';

interface SpecIconProps {
  /** Icon type to display */
  type: SpecIconType;
  /** Optional size (defaults to 16px) */
  size?: number;
  /** Optional class name for additional styling */
  className?: string;
  /** Optional alt text for accessibility */
  alt?: string;
  /** Optional category ID for category icons */
  categoryId?: string;
}

// =============================================================================
// Icon Mapping
// =============================================================================

/**
 * Maps spec icon types to their SVG file paths
 */
function getIconPath(type: SpecIconType, categoryId?: string): string | null {
  switch (type) {
    case 'weight':
      return '/icons/weight.svg';
    case 'dimensions':
      // Use items icon as placeholder for dimensions
      return '/icons/app/items.svg';
    case 'model':
      // Use category icon as placeholder for model
      return '/icons/app/category.svg';
    case 'condition':
      return '/icons/app/items.svg';
    case 'status':
      return '/icons/app/items.svg';
    case 'light':
      return '/icons/gear_attributes/light.svg';
    case 'ultralight':
      return '/icons/gear_attributes/ultralight.svg';
    case 'comfort':
      return '/icons/gear_attributes/comfortItem.svg';
    case 'sale':
      return '/icons/gear_attributes/forSale.svg';
    case 'borrow':
      return '/icons/gear_attributes/forRent.svg';
    case 'trade':
      return '/icons/gear_attributes/forTrade.svg';
    case 'wishlist':
      return '/icons/gear_attributes/wishlist.svg';
    case 'favourite':
      // Use wishlist as fallback for favourite
      return '/icons/gear_attributes/wishlist.svg';
    case 'ai':
      return '/icons/ai.svg';
    case 'category':
      // Map category IDs to icon paths
      if (!categoryId) return '/icons/app/category.svg';
      // Try exact match first
      const categoryPath = `/icons/gear_categories/${categoryId.toLowerCase()}.svg`;
      return categoryPath;
    // Additional spec types - use appropriate fallbacks
    case 'size':
      return '/icons/app/items.svg';
    case 'color':
      return '/icons/app/items.svg';
    case 'volume':
      return '/icons/app/items.svg';
    case 'materials':
      return '/icons/app/items.svg';
    case 'construction':
      return '/icons/app/items.svg';
    case 'quantity':
      return '/icons/app/items.svg';
    default:
      return null;
  }
}

// =============================================================================
// Component
// =============================================================================

export function SpecIcon({
  type,
  size = 16,
  className,
  alt,
  categoryId,
}: SpecIconProps) {
  const [hasError, setHasError] = useState(false);
  const iconPath = getIconPath(type, categoryId);

  // Fallback to placeholder if no icon found or if image fails to load
  if (!iconPath || hasError) {
    return (
      <HelpCircle
        className={cn('text-muted-foreground', className)}
        style={{ width: size, height: size }}
        aria-label={alt || `${type} icon`}
      />
    );
  }

  return (
    <Image
      src={iconPath}
      alt={alt || `${type} icon`}
      width={size}
      height={size}
      className={cn('inline-block', className)}
      onError={() => setHasError(true)}
    />
  );
}

export default SpecIcon;
