/**
 * SocialShareButtons Component
 *
 * Feature: Share Management
 *
 * Provides social media sharing buttons for shared loadout links.
 * Uses Web Share API on mobile when available, falls back to direct links.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  showLabels?: boolean;
}

// =============================================================================
// Social Platform Icons (inline SVGs for bundle size)
// =============================================================================

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 4.322 4.322 0 0 0-.733.039c-.927.086-1.495.334-1.806.717-.311.383-.466.927-.466 1.632v1.583h3.46l-.477 3.667h-2.983v8.105a11.116 11.116 0 0 0 8.1-10.68c0-6.148-4.988-11.136-11.136-11.136-6.148 0-11.136 4.988-11.136 11.136a11.114 11.114 0 0 0 9.262 10.961z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SocialShareButtons({
  url,
  title,
  description = '',
  className,
  showLabels = false,
}: SocialShareButtonsProps) {
  const t = useTranslations('Shakedown');
  const [copied, setCopied] = useState(false);

  // Encoded values for URLs
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${title}${description ? ` - ${description}` : ''}`);

  // Share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
  const emailUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('linkCopied') || 'Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Web Share API (mobile)
  const handleNativeShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title,
        text: description || title,
        url,
      });
    } catch (err) {
      // User cancelled or error - ignore
      if ((err as Error).name !== 'AbortError') {
        console.error('[SocialShareButtons] Share failed:', err);
      }
    }
  };

  // Check if Web Share API is available
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Native Share (mobile) */}
      {canNativeShare && (
        <Button
          variant="outline"
          size={showLabels ? 'sm' : 'icon'}
          onClick={handleNativeShare}
          className="text-muted-foreground hover:text-foreground"
        >
          <Share2 className="h-4 w-4" />
          {showLabels && <span className="ml-2">{t('share') || 'Share'}</span>}
        </Button>
      )}

      {/* Twitter/X */}
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        asChild
        className="text-muted-foreground hover:text-[#1DA1F2]"
      >
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
          <TwitterIcon className="h-4 w-4" />
          {showLabels && <span className="ml-2">X</span>}
        </a>
      </Button>

      {/* Facebook */}
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        asChild
        className="text-muted-foreground hover:text-[#1877F2]"
      >
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
          <FacebookIcon className="h-4 w-4" />
          {showLabels && <span className="ml-2">Facebook</span>}
        </a>
      </Button>

      {/* WhatsApp */}
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        asChild
        className="text-muted-foreground hover:text-[#25D366]"
      >
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
          <WhatsAppIcon className="h-4 w-4" />
          {showLabels && <span className="ml-2">WhatsApp</span>}
        </a>
      </Button>

      {/* Email */}
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        asChild
        className="text-muted-foreground hover:text-foreground"
      >
        <a href={emailUrl} aria-label="Share via email">
          <Mail className="h-4 w-4" />
          {showLabels && <span className="ml-2">Email</span>}
        </a>
      </Button>

      {/* Copy Link */}
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        {showLabels && <span className="ml-2">{copied ? (t('copied') || 'Copied') : (t('copyLink') || 'Copy')}</span>}
      </Button>
    </div>
  );
}
