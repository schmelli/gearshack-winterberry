'use client';

/**
 * VIP Source Attribution Component
 *
 * Feature: 052-vip-loadouts
 * Task: T024
 *
 * Displays source URL with platform detection, link status,
 * and proper attribution as required by content guidelines.
 */

import { useTranslations } from 'next-intl';
import { ExternalLink, AlertTriangle, Youtube, Instagram, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { detectPlatform, getSourcePlatformLabel } from '@/lib/vip/source-url-validator';

// =============================================================================
// Types
// =============================================================================

interface VipSourceAttributionProps {
  sourceUrl: string;
  isSourceAvailable: boolean;
  showFullUrl?: boolean;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'youtube':
      return <Youtube className="h-4 w-4" />;
    case 'instagram':
      return <Instagram className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

function formatDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove protocol and www, keep path up to reasonable length
    let display = parsed.hostname.replace('www.', '');
    if (parsed.pathname !== '/') {
      const path = parsed.pathname.length > 30
        ? parsed.pathname.substring(0, 27) + '...'
        : parsed.pathname;
      display += path;
    }
    return display;
  } catch {
    return url.substring(0, 50);
  }
}

// =============================================================================
// Component
// =============================================================================

export function VipSourceAttribution({
  sourceUrl,
  isSourceAvailable,
  showFullUrl = false,
  className = '',
}: VipSourceAttributionProps) {
  const t = useTranslations('vip');
  const platform = detectPlatform(sourceUrl);
  const platformLabel = getSourcePlatformLabel(platform);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Source Label */}
      <p className="text-sm font-medium text-foreground">
        {t('loadout.sourceAttribution')}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Platform Badge */}
        <Badge
          variant={isSourceAvailable ? 'outline' : 'secondary'}
          className={`gap-1.5 ${!isSourceAvailable ? 'text-amber-600' : ''}`}
        >
          {isSourceAvailable ? (
            getPlatformIcon(platform)
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {platformLabel}
        </Badge>

        {/* Status Badge */}
        {!isSourceAvailable && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            {t('loadout.sourceUnavailable')}
          </Badge>
        )}

        {/* Link Button */}
        {isSourceAvailable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-primary hover:text-primary/80"
            asChild
          >
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('loadout.viewOriginal')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {showFullUrl ? formatDisplayUrl(sourceUrl) : t('loadout.viewOriginal')}
            </a>
          </Button>
        )}
      </div>

      {/* Full URL Display (optional) */}
      {showFullUrl && (
        <p className="text-xs text-muted-foreground break-all">
          {sourceUrl}
        </p>
      )}

      {/* Attribution Notice */}
      <p className="text-xs text-muted-foreground">
        {t('loadout.attributionNotice')}
      </p>
    </div>
  );
}

export default VipSourceAttribution;
