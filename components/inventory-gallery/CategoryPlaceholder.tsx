/**
 * CategoryPlaceholder Component
 *
 * Feature: 002-inventory-gallery
 * Displays a category-specific icon when no image is available
 */

import type { LucideIcon } from 'lucide-react';
import {
  Tent,
  Moon,
  Backpack,
  Shirt,
  Flame,
  Droplet,
  Zap,
  Compass,
  Heart,
  Bath,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CategoryPlaceholderProps {
  /** Category ID to determine icon */
  categoryId: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Category Icon Mapping
// =============================================================================

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  shelter: Tent,
  'sleep-system': Moon,
  packs: Backpack,
  clothing: Shirt,
  cooking: Flame,
  water: Droplet,
  electronics: Zap,
  navigation: Compass,
  'first-aid': Heart,
  toiletries: Bath,
  miscellaneous: Package,
};

const DEFAULT_CATEGORY_ICON = Package;

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const;

const ICON_SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

// =============================================================================
// Component
// =============================================================================

export function CategoryPlaceholder({
  categoryId,
  size = 'md',
  className,
}: CategoryPlaceholderProps) {
  const Icon = categoryId
    ? (CATEGORY_ICONS[categoryId] ?? DEFAULT_CATEGORY_ICON)
    : DEFAULT_CATEGORY_ICON;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted',
        SIZE_CLASSES[size],
        className
      )}
    >
      <Icon
        className={cn('text-muted-foreground', ICON_SIZE_CLASSES[size])}
        aria-hidden="true"
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON };
