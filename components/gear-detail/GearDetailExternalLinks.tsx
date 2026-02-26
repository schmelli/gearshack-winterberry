/**
 * GearDetailExternalLinks Component
 *
 * Extracted from GearDetailContent.tsx
 * Renders sanitized external links (product page, brand site, retailer).
 * SECURITY: All URLs are validated via sanitizeExternalUrl before rendering.
 */

'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeExternalUrl } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface GearDetailExternalLinksProps {
  /** Product page URL */
  productUrl?: string | null;
  /** Brand website URL */
  brandUrl?: string | null;
  /** Retailer URL */
  retailerUrl?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailExternalLinks({
  productUrl,
  brandUrl,
  retailerUrl,
}: GearDetailExternalLinksProps) {
  const t = useTranslations('GearDetail');

  return (
    <div className="flex flex-wrap gap-2">
      {sanitizeExternalUrl(productUrl) && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={sanitizeExternalUrl(productUrl)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            {t('externalLinks.productPage')}
          </a>
        </Button>
      )}
      {sanitizeExternalUrl(brandUrl) && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={sanitizeExternalUrl(brandUrl)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            {t('externalLinks.brandSite')}
          </a>
        </Button>
      )}
      {sanitizeExternalUrl(retailerUrl) && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={sanitizeExternalUrl(retailerUrl)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            {t('externalLinks.retailer')}
          </a>
        </Button>
      )}
    </div>
  );
}
