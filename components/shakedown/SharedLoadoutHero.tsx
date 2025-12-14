/**
 * SharedLoadoutHero Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T016 - Hero header for anonymous shared loadout viewing
 *
 * Displays a premium landing-style hero section with:
 * - App logo
 * - Loadout name, description
 * - Season and activity badges
 * - Created date
 * - Owner profile preview
 * - Signup CTA
 *
 * This is a stateless presentational component - receives all data via props.
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { formatTripDate } from '@/lib/loadout-utils';
import type { SharedLoadoutPayload, SharedLoadoutOwner } from '@/types/sharing';
import type { Season, ActivityType } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface SharedLoadoutHeroProps {
  /** The shared loadout payload */
  payload: SharedLoadoutPayload;
  /** The loadout owner information */
  owner: SharedLoadoutOwner | null;
  /** The creation timestamp of the share */
  createdAt: string;
  /** Render prop for owner profile section */
  ownerSection?: React.ReactNode;
  /** Render prop for signup CTA section */
  ctaSection?: React.ReactNode;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get translated label for season
 */
function getSeasonLabel(season: Season, t: ReturnType<typeof useTranslations>): string {
  const seasonMap: Record<Season, string> = {
    spring: t('seasonTypes.spring'),
    summer: t('seasonTypes.summer'),
    fall: t('seasonTypes.fall'),
    winter: t('seasonTypes.winter'),
  };
  return seasonMap[season] ?? season;
}

/**
 * Get translated label for activity type
 */
function getActivityLabel(activity: ActivityType, t: ReturnType<typeof useTranslations>): string {
  const activityMap: Record<ActivityType, string> = {
    hiking: t('activityTypes.hiking'),
    camping: t('activityTypes.camping'),
    backpacking: t('activityTypes.backpacking'),
    climbing: t('activityTypes.climbing'),
    skiing: t('activityTypes.skiing'),
  };
  return activityMap[activity] ?? activity;
}

// =============================================================================
// Component
// =============================================================================

export function SharedLoadoutHero({
  payload,
  // owner is passed via ownerSection render prop
  owner: _,
  createdAt,
  ownerSection,
  ctaSection,
}: SharedLoadoutHeroProps) {
  const t = useTranslations('SharedLoadout');

  const createdDate = new Date(createdAt);
  const createdDateLabel = formatTripDate(createdDate) ?? 'Live';
  const tripDate = payload.loadout.tripDate ? new Date(payload.loadout.tripDate) : null;
  const tripDateLabel = tripDate ? formatTripDate(tripDate) : null;

  return (
    <div className="relative min-h-[60vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Background Image (optional - using solid gradient for now) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-950" />

      {/* Content Container */}
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logos/small_gearshack_logo.png"
            alt="GearShack Logo"
            width={120}
            height={120}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Hero Content */}
        <div className="space-y-6 text-center">
          {/* Eyebrow */}
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {t('heroTitle')}
          </p>

          {/* Loadout Name */}
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            {payload.loadout.name}
          </h1>

          {/* Description */}
          {payload.loadout.description && (
            <p className="mx-auto max-w-3xl text-lg text-slate-200 sm:text-xl">
              {payload.loadout.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
            {tripDateLabel && (
              <>
                <span>{t('tripDate')}: {tripDateLabel}</span>
                <span className="text-slate-500">•</span>
              </>
            )}
            <span>{t('createdOn')}: {createdDateLabel}</span>
            <span className="text-slate-500">•</span>
            <span>{t('totalItems')}: {payload.items.length}</span>
          </div>

          {/* Seasons and Activities */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            {/* Seasons */}
            {payload.loadout.seasons.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Seasons:</span>
                {payload.loadout.seasons.map((season) => (
                  <Badge
                    key={season}
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/20"
                  >
                    {getSeasonLabel(season, t)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Activities */}
            {payload.loadout.activityTypes.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Activities:</span>
                {payload.loadout.activityTypes.map((activity) => (
                  <Badge
                    key={activity}
                    variant="secondary"
                    className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                  >
                    {getActivityLabel(activity, t)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Owner Profile Preview Section */}
          {ownerSection && (
            <div className="mt-8 flex justify-center">
              {ownerSection}
            </div>
          )}

          {/* Signup CTA Section */}
          {ctaSection && (
            <div className="mt-8 flex justify-center">
              {ctaSection}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
