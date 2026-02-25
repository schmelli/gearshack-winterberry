/**
 * OwnerProfilePreview Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T017, T031, T034 - Owner profile preview (presentational only)
 *
 * Simple presentational component that displays the loadout owner's avatar and name.
 * Clicking triggers the onClick handler, which should open a shared OwnerProfileModal.
 *
 * This component no longer manages its own modal state - that responsibility
 * is delegated to the parent component.
 */

'use client';

import { useTranslations } from 'next-intl';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import type { SharedLoadoutOwner } from '@/types/sharing';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface OwnerProfilePreviewProps {
  /** The loadout owner information */
  owner: SharedLoadoutOwner | null;
  /** Callback when the owner preview is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Style variant (hero for dark background, inline for app shell) */
  variant?: 'hero' | 'inline';
}

// =============================================================================
// Component
// =============================================================================

export function OwnerProfilePreview({
  owner,
  onClick,
  className,
  variant = 'hero',
}: OwnerProfilePreviewProps) {
  const t = useTranslations('SharedLoadout');

  // If owner is not available
  if (!owner) {
    const unavailableStyles = variant === 'hero'
      ? 'text-slate-400'
      : 'text-muted-foreground';

    return (
      <div className={cn('flex items-center gap-3', unavailableStyles, className)}>
        <AvatarWithFallback size="md" name={null} src={null} />
        <span className="text-sm">{t('ownerUnavailable')}</span>
      </div>
    );
  }

  // Get display name (prefer trailName, fallback to displayName)
  const displayName = owner.trailName || owner.displayName || 'Anonymous';

  // Style variants
  const containerStyles = variant === 'hero'
    ? 'rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur hover:border-emerald-400/30 hover:bg-white/10'
    : 'rounded-lg p-2 hover:bg-accent/50 active:bg-accent';

  const textStyles = variant === 'hero'
    ? { label: 'text-xs text-slate-400', name: 'text-base font-semibold text-white' }
    : { label: 'text-xs text-muted-foreground', name: 'text-sm font-medium text-foreground' };

  const avatarRing = variant === 'hero' ? 'ring-2 ring-white/20' : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 transition-colors',
        containerStyles,
        className
      )}
      aria-label={`View ${displayName}'s profile`}
    >
      <AvatarWithFallback
        size="md"
        name={displayName}
        src={owner.avatarUrl}
        className={avatarRing}
      />
      <div className="flex flex-col items-start">
        <span className={textStyles.label}>
          {t('sharedBy', { name: '' }).replace(/ $/, '')}
        </span>
        <span className={textStyles.name}>
          {displayName}
        </span>
      </div>
    </button>
  );
}
