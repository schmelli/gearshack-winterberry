'use client';

/**
 * VIP Profile Header Component
 *
 * Feature: 052-vip-loadouts
 * Task: T021
 *
 * Full profile header for VIP detail page.
 * Shows avatar, name, bio, social links, stats, and follow button.
 */

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  BadgeCheck,
  Users,
  Backpack,
  Youtube,
  Instagram,
  Globe,
  Twitter,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { VipProfile, SocialLinks } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipProfileHeaderProps {
  vip: VipProfile;
  showFollowButton?: boolean;
  followButton?: React.ReactNode;
}

// =============================================================================
// Helpers
// =============================================================================

const socialIcons: Record<keyof SocialLinks, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
};

const socialLabels: Record<keyof SocialLinks, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  website: 'Website',
  twitter: 'Twitter',
};

// =============================================================================
// Component
// =============================================================================

export function VipProfileHeader({
  vip,
  showFollowButton = true,
  followButton,
}: VipProfileHeaderProps) {
  const t = useTranslations('vip');

  const socialLinks = Object.entries(vip.socialLinks || {}).filter(
    ([, url]) => url && url.trim() !== ''
  ) as [keyof SocialLinks, string][];

  return (
    <div className="space-y-6">
      {/* Curated Account Banner */}
      {vip.status === 'curated' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
          {t('profile.curatedBanner', { name: vip.name })}
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-background shadow-lg sm:h-32 sm:w-32">
          <Image
            src={vip.avatarUrl}
            alt={vip.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 96px, 128px"
            priority
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          {/* Name and Verified Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{vip.name}</h1>
            {vip.status === 'claimed' && (
              <div className="flex items-center gap-1 text-blue-500">
                <BadgeCheck className="h-5 w-5" />
                <span className="text-sm font-medium">{t('profile.verifiedBadge')}</span>
              </div>
            )}
            {vip.isFeatured && (
              <Badge variant="secondary">{t('profile.featured')}</Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {vip.followerCount.toLocaleString()}
              </span>
              <span className="text-sm">{t('profile.followers', { count: vip.followerCount })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Backpack className="h-4 w-4" />
              <span className="font-medium text-foreground">{vip.loadoutCount}</span>
              <span className="text-sm">{t('profile.loadouts', { count: vip.loadoutCount })}</span>
            </div>
          </div>

          {/* Follow Button (slot for VipFollowButton) */}
          {showFollowButton && followButton && (
            <div className="flex items-center gap-3">
              {followButton}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-muted-foreground whitespace-pre-wrap">{vip.bio}</p>
      </div>

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t('profile.socialLinks')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(([platform, url]) => (
                <Button
                  key={platform}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${vip.name} on ${socialLabels[platform]}`}
                  >
                    {socialIcons[platform]}
                    {socialLabels[platform]}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VipProfileHeader;
