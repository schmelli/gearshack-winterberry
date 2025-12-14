/**
 * OwnerProfilePreview Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T017, T031, T034 - Owner profile preview with messaging option
 *
 * Displays the loadout owner's avatar and name. Clicking opens a profile modal
 * with owner details. For authenticated users, shows messaging option if owner allows.
 *
 * This component manages its own modal state internally.
 */

'use client';

import { useState } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SharedLoadoutOwner } from '@/types/sharing';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface OwnerProfilePreviewProps {
  /** The loadout owner information */
  owner: SharedLoadoutOwner | null;
  /** Whether the current user is authenticated */
  isAuthenticated: boolean;
  /** Current user's ID (if authenticated) */
  currentUserId?: string | null;
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
  isAuthenticated,
  currentUserId,
  className,
  variant = 'hero',
}: OwnerProfilePreviewProps) {
  const t = useTranslations('SharedLoadout');
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Check if current user can message the owner
  const canMessage =
    isAuthenticated &&
    currentUserId !== owner.id &&
    (owner.messagingPrivacy === 'everyone' ||
      owner.messagingPrivacy === 'friends_only');

  const handleMessageClick = () => {
    setIsModalOpen(false);
    router.push(`/messages?to=${owner.id}`);
  };

  // Style variants
  const containerStyles = variant === 'hero'
    ? 'rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur hover:border-emerald-400/30 hover:bg-white/10'
    : 'rounded-lg p-2 hover:bg-accent/50 active:bg-accent';

  const textStyles = variant === 'hero'
    ? { label: 'text-xs text-slate-400', name: 'text-base font-semibold text-white' }
    : { label: 'text-xs text-muted-foreground', name: 'text-sm font-medium text-foreground' };

  const avatarRing = variant === 'hero' ? 'ring-2 ring-white/20' : '';

  return (
    <>
      {/* Avatar and Name (Clickable) */}
      <button
        onClick={() => setIsModalOpen(true)}
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

      {/* Profile Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <User className="h-5 w-5" />
              {t('ownerProfile')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center gap-3 text-center">
              <AvatarWithFallback
                size="xl"
                name={displayName}
                src={owner.avatarUrl}
              />
              <div>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                {owner.locationName && (
                  <p className="text-sm text-muted-foreground">
                    {owner.locationName}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            {owner.bio && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-foreground">{owner.bio}</p>
              </div>
            )}

            {/* Social Links */}
            {(owner.instagram || owner.facebook || owner.youtube || owner.website) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {t('socialLinks')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {owner.instagram && (
                    <a
                      href={`https://instagram.com/${owner.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Instagram
                    </a>
                  )}
                  {owner.facebook && (
                    <a
                      href={`https://facebook.com/${owner.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Facebook
                    </a>
                  )}
                  {owner.youtube && (
                    <a
                      href={`https://youtube.com/${owner.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      YouTube
                    </a>
                  )}
                  {owner.website && (
                    <a
                      href={owner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Messaging Action (Authenticated Users Only) */}
            {canMessage && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleMessageClick}
                  className="w-full"
                  variant="default"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('messageOwner')}
                </Button>
              </div>
            )}

            {/* Privacy Notice */}
            {!canMessage && isAuthenticated && currentUserId !== owner.id && (
              <div className="rounded-lg border border-muted bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {t('messagingDisabled')}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
