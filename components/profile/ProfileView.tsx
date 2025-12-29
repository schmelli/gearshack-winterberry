/**
 * ProfileView Component
 *
 * Feature: 008-auth-and-profile, 041-loadout-ux-profile, 001-community-shakedowns
 * T027: Read-only profile display
 * T028: Social link icons (Instagram, Facebook, YouTube, website)
 * T030: VIP badge display when isVIP is true
 * T032: Merged profile data (Firestore avatarUrl > Auth photoURL)
 * T071: Shakedown expertise stats and badges
 * Feature 041: Avatar fallback chain (custom > provider > initials)
 * Design: Hero header with gradient, elegant typography, soft shadows
 * Stats tiles, favorites carousel, edit icon top-left
 */

'use client';

import {
  Instagram,
  Facebook,
  Youtube,
  Globe,
  MapPin,
  Crown,
  Pencil,
  Package,
  Backpack,
  CheckCircle2,
  Heart,
  DollarSign,
  Handshake,
  Repeat2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import {
  ShakedownExpertiseSection,
  type ShakedownStats,
} from '@/components/profile/ShakedownExpertiseSection';
import { getDisplayAvatarUrl } from '@/lib/utils/avatar';
import type { MergedUser } from '@/types/auth';

// =============================================================================
// Stats Types
// =============================================================================

interface ProfileStats {
  itemCount: number;
  loadoutCount: number;
  shakedownCount: number;
}

interface FavoriteItem {
  id: string;
  name: string;
  imageUrl: string | null;
}

// =============================================================================
// Stat Tile Component
// =============================================================================

interface StatTileProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

function StatTile({ icon, value, label }: StatTileProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 px-4 py-3 min-w-[90px]">
      <div className="text-primary/70 mb-1">{icon}</div>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

// =============================================================================
// Mini Gear Card Component
// =============================================================================

interface MiniGearCardProps {
  item: FavoriteItem;
  onClick?: () => void;
}

function MiniGearCard({ item, onClick }: MiniGearCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-16 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
    >
      <div className="relative w-14 h-14 rounded-lg bg-muted/50 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground text-center line-clamp-2 leading-tight">
        {item.name}
      </span>
    </button>
  );
}

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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {icon}
    </a>
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
  /** Callback when a gear item is clicked */
  onItemClick?: (itemId: string) => void;
  /** User statistics */
  stats?: ProfileStats;
  /** Favorite items for carousel */
  favorites?: FavoriteItem[];
  /** Items for sale */
  forSale?: FavoriteItem[];
  /** Items for rent/borrow */
  forRent?: FavoriteItem[];
  /** Items for trade */
  forTrade?: FavoriteItem[];
  /** Shakedown expertise stats (Feature 001-community-shakedowns, T071) */
  shakedownStats?: ShakedownStats;
}

export function ProfileView({ user, onEditClick, onItemClick, stats, favorites, forSale, forRent, forTrade, shakedownStats }: ProfileViewProps) {
  const t = useTranslations('Profile');
  // Feature 041: Use avatar fallback chain
  const displayAvatarUrl = getDisplayAvatarUrl(user.avatarUrl, user.providerAvatarUrl);
  // Feature 041: Show locationName if available, fallback to legacy location
  const displayLocation = user.locationName || user.location;
  const hasLocation = Boolean(displayLocation);
  const hasBio = Boolean(user.bio);
  const hasTrailName = Boolean(user.trailName);
  const hasFavorites = favorites && favorites.length > 0;
  const hasForSale = forSale && forSale.length > 0;
  const hasForRent = forRent && forRent.length > 0;
  const hasForTrade = forTrade && forTrade.length > 0;

  // Social links
  const socialLinks = [
    user.instagram && {
      href: user.instagram.startsWith('http') ? user.instagram : `https://instagram.com/${user.instagram}`,
      icon: <Instagram className="h-5 w-5" />,
      label: 'Instagram',
    },
    user.facebook && {
      href: user.facebook.startsWith('http') ? user.facebook : `https://facebook.com/${user.facebook}`,
      icon: <Facebook className="h-5 w-5" />,
      label: 'Facebook',
    },
    user.youtube && {
      href: user.youtube.startsWith('http') ? user.youtube : `https://youtube.com/${user.youtube}`,
      icon: <Youtube className="h-5 w-5" />,
      label: 'YouTube',
    },
    user.website && {
      href: user.website.startsWith('http') ? user.website : `https://${user.website}`,
      icon: <Globe className="h-5 w-5" />,
      label: 'Website',
    },
  ].filter(Boolean) as SocialLinkProps[];

  const hasSocialLinks = socialLinks.length > 0;

  // Default stats if not provided
  const displayStats = stats ?? { itemCount: 0, loadoutCount: 0, shakedownCount: 0 };

  return (
    <div className="flex flex-col">
      {/* Hero Header with Gradient Background */}
      <div className="relative bg-gradient-to-b from-primary/20 via-primary/10 to-transparent px-6 pb-16 pt-8">
        {/* Edit Button - Top Left */}
        {onEditClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditClick}
            className="absolute top-3 left-3 h-8 w-8 rounded-full bg-background/80 hover:bg-background shadow-sm"
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {/* Avatar with shadow and ring */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <AvatarWithFallback
              src={displayAvatarUrl}
              name={user.displayName}
              size="xl"
              className="ring-4 ring-background shadow-xl"
            />
            {/* VIP Badge overlay */}
            {user.isVIP && (
              <Badge
                variant="secondary"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 gap-1 bg-amber-100 text-amber-800 border-amber-200"
              >
                <Crown className="h-3 w-3" />
                VIP
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-6 -mt-8">
        {/* Name & Email - Centered */}
        <div className="flex flex-col items-center text-center mb-4">
          <h2 className="text-2xl font-bold tracking-tight">{user.displayName}</h2>

          {hasTrailName && (
            <p className="text-sm font-medium text-primary/80 mt-0.5">
              &ldquo;{user.trailName}&rdquo;
            </p>
          )}

          {user.email && (
            <p className="mt-1 text-xs text-muted-foreground/70">{user.email}</p>
          )}
        </div>

        {/* Bio - Elegant italic style */}
        {hasBio && (
          <div className="mb-4 text-center">
            <p className="text-sm italic text-muted-foreground leading-relaxed px-4">
              &ldquo;{user.bio}&rdquo;
            </p>
          </div>
        )}

        {/* Location & Social Links Row */}
        <div className="flex flex-col items-center gap-3 mb-6">
          {/* Location */}
          {hasLocation && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{displayLocation}</span>
            </div>
          )}

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => (
                <SocialLink key={link.label} {...link} />
              ))}
            </div>
          )}
        </div>

        {/* Statistics Tiles */}
        <div className="flex justify-center gap-3 mb-6">
          <StatTile
            icon={<Package className="h-5 w-5" />}
            value={displayStats.itemCount}
            label="Items"
          />
          <StatTile
            icon={<Backpack className="h-5 w-5" />}
            value={displayStats.loadoutCount}
            label="Loadouts"
          />
          <StatTile
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={displayStats.shakedownCount}
            label="Shakedowns"
          />
        </div>

        {/* Shakedown Expertise Section (T071) */}
        {shakedownStats && (
          <ShakedownExpertiseSection
            userId={user.uid}
            stats={shakedownStats}
            className="mb-6"
          />
        )}

        {/* Favorites Carousel */}
        {hasFavorites && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('favorites')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {favorites.map((item) => (
                <MiniGearCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* For Sale Carousel */}
        {hasForSale && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('forSale')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {forSale.map((item) => (
                <MiniGearCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* For Rent Carousel */}
        {hasForRent && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Handshake className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('forRent')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {forRent.map((item) => (
                <MiniGearCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* For Trade Carousel */}
        {hasForTrade && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Repeat2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('forTrade')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {forTrade.map((item) => (
                <MiniGearCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
