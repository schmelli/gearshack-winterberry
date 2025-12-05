/**
 * ProfileView Component
 *
 * Feature: 008-auth-and-profile
 * T027: Read-only profile display
 * T028: Social link icons (Instagram, Facebook, YouTube, website)
 * T030: VIP badge display when isVIP is true
 * T032: Merged profile data (Firestore avatarUrl > Auth photoURL)
 */

'use client';

import {
  Instagram,
  Facebook,
  Youtube,
  Globe,
  MapPin,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import type { MergedUser } from '@/types/auth';

// =============================================================================
// Social Link Component
// =============================================================================

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="h-9 w-9"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
      >
        {icon}
      </a>
    </Button>
  );
}

// =============================================================================
// Component
// =============================================================================

interface ProfileViewProps {
  /** Merged user data (Auth + Profile) */
  user: MergedUser;
  /** Callback to switch to edit mode */
  onEditClick?: () => void;
}

export function ProfileView({ user, onEditClick }: ProfileViewProps) {
  const hasLocation = Boolean(user.location);
  const hasBio = Boolean(user.bio);
  const hasTrailName = Boolean(user.trailName);

  // Social links
  const socialLinks = [
    user.instagram && {
      href: user.instagram.startsWith('http') ? user.instagram : `https://instagram.com/${user.instagram}`,
      icon: <Instagram className="h-4 w-4" />,
      label: 'Instagram',
    },
    user.facebook && {
      href: user.facebook.startsWith('http') ? user.facebook : `https://facebook.com/${user.facebook}`,
      icon: <Facebook className="h-4 w-4" />,
      label: 'Facebook',
    },
    user.youtube && {
      href: user.youtube.startsWith('http') ? user.youtube : `https://youtube.com/${user.youtube}`,
      icon: <Youtube className="h-4 w-4" />,
      label: 'YouTube',
    },
    user.website && {
      href: user.website.startsWith('http') ? user.website : `https://${user.website}`,
      icon: <Globe className="h-4 w-4" />,
      label: 'Website',
    },
  ].filter(Boolean) as SocialLinkProps[];

  const hasSocialLinks = socialLinks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Avatar and Names */}
      <div className="flex flex-col items-center text-center">
        <AvatarWithFallback
          src={user.avatarUrl}
          name={user.displayName}
          size="xl"
          className="mb-4"
        />

        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{user.displayName}</h2>
          {/* T030: VIP Badge */}
          {user.isVIP && (
            <Badge variant="secondary" className="gap-1">
              <Crown className="h-3 w-3" />
              VIP
            </Badge>
          )}
        </div>

        {hasTrailName && (
          <p className="text-sm text-muted-foreground">
            Trail name: {user.trailName}
          </p>
        )}

        {user.email && (
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      {/* Bio */}
      {hasBio && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm leading-relaxed">{user.bio}</p>
        </div>
      )}

      {/* Location */}
      {hasLocation && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{user.location}</span>
        </div>
      )}

      {/* Social Links (T028) */}
      {hasSocialLinks && (
        <div className="flex items-center justify-center gap-1">
          {socialLinks.map((link) => (
            <SocialLink key={link.label} {...link} />
          ))}
        </div>
      )}

      {/* Edit Button */}
      {onEditClick && (
        <Button onClick={onEditClick} className="w-full">
          Edit Profile
        </Button>
      )}
    </div>
  );
}
